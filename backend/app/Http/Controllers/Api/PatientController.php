<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Creneau;
use App\Models\RendezVous;
use App\Models\ReservationCreneau;
use App\Models\Medecin;
use App\Models\Ordonnance;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PatientController extends Controller
{
    private function getPatient(Request $request)
    {
        $patient = $request->user()->patient;

        if (!$patient) {
            abort(403, 'Profil patient introuvable.');
        }

        return $patient;
    }

    private function appointmentDateTime(RendezVous $rdv): Carbon
    {
        return Carbon::parse(
            $rdv->creneau->date_creneau->toDateString()
            . ' ' . $rdv->creneau->heure_debut
        );
    }

    private function ensureModificationAllowed(RendezVous $rdv): void
    {
        if (!in_array($rdv->statut, ['EN_ATTENTE', 'CONFIRME'])) {
            abort(409, 'Ce rendez-vous ne peut plus être modifié.');
        }

        if ($rdv->consultation()->exists()) {
            abort(409, 'Ce rendez-vous possède déjà une consultation.');
        }

        if ($this->appointmentDateTime($rdv)->lt(now()->addHours(24))) {
            throw ValidationException::withMessages([
                'rendez_vous' => [
                    'La modification ou l’annulation est possible au moins 24 heures avant le rendez-vous.',
                ],
            ]);
        }
    }

    // =====================================================
    // TABLEAU DE BORD
    // =====================================================

    public function dashboard(Request $request)
    {
        $patient = $this->getPatient($request);

        $rendezVous = $patient->rendezVous();

        $aVenir = (clone $rendezVous)
            ->whereIn('statut', ['EN_ATTENTE', 'CONFIRME'])
            ->whereHas('creneau', function ($q) {
                $q->where(function ($dateQuery) {
                    $dateQuery->whereDate('date_creneau', '>', today())
                        ->orWhere(function ($todayQuery) {
                            $todayQuery->whereDate('date_creneau', today())
                                ->where('heure_debut', '>', now()->format('H:i:s'));
                        });
                });
            });

        $dossier = $patient->dossierMedical;

        $ordonnancesCount = $dossier
            ? Ordonnance::whereHas('consultation', fn ($q) =>
                $q->where('dossier_medical_id', $dossier->id)
            )->count()
            : 0;

        return response()->json([
            'rendez_vous_a_venir' => (clone $aVenir)->count(),

            'rendez_vous_en_attente' => $patient->rendezVous()
                ->where('statut', 'EN_ATTENTE')
                ->count(),

            'ordonnances' => $ordonnancesCount,

            'notifications_non_lues' => $request->user()
                ->notifications()
                ->where('lu', false)
                ->count(),

            'prochains_rendez_vous' => (clone $aVenir)
                ->with([
                    'medecin.user:id,nom,prenom',
                    'creneau',
                ])
                ->orderBy(
                    Creneau::select('date_creneau')
                        ->whereColumn('creneaux.id', 'rendez_vous.creneau_id')
                )
                ->limit(5)
                ->get(),
        ]);
    }

    // =====================================================
    // MEDECINS
    // =====================================================

    public function indexMedecins(Request $request)
    {
        $data = $request->validate([
            'search' => 'nullable|string|max:100',
            'specialite' => 'nullable|string|max:100',
        ]);

        $medecins = Medecin::whereHas('user')
            ->with('user:id,nom,prenom,email,telephone')
            ->when($data['search'] ?? null, function ($q, $search) {
                $q->where(function ($sub) use ($search) {
                    $sub->where('specialite', 'like', "%{$search}%")
                        ->orWhereHas('user', function ($user) use ($search) {
                            $user->where('nom', 'like', "%{$search}%")
                                ->orWhere('prenom', 'like', "%{$search}%");
                        });
                });
            })
            ->when($data['specialite'] ?? null, fn ($q, $specialite) =>
                $q->where('specialite', $specialite)
            )
            ->orderBy('id')
            ->paginate(20);

        return response()->json($medecins);
    }

    // =====================================================
    // CRENEAUX DISPONIBLES
    // =====================================================

    public function creneauxDisponibles(Request $request)
    {
        $data = $request->validate([
            'medecin_id' => 'required|integer|exists:medecins,id',
            'date_debut' => 'nullable|date|after_or_equal:today',
            'date_fin' => 'nullable|date|after_or_equal:date_debut',
        ]);

        $creneaux = Creneau::whereHas('horaire', fn ($q) =>
            $q->where('medecin_id', $data['medecin_id'])
        )
            ->whereHas('horaire.medecin.user')
            ->where('disponible', true)
            ->whereDoesntHave('reservationActive')
            ->where(function ($q) {
                $q->whereDate('date_creneau', '>', today())
                    ->orWhere(function ($today) {
                        $today->whereDate('date_creneau', today())
                            ->where('heure_debut', '>', now()->format('H:i:s'));
                    });
            })
            ->when($data['date_debut'] ?? null, fn ($q, $date) =>
                $q->whereDate('date_creneau', '>=', $date)
            )
            ->when($data['date_fin'] ?? null, fn ($q, $date) =>
                $q->whereDate('date_creneau', '<=', $date)
            )
            ->orderBy('date_creneau')
            ->orderBy('heure_debut')
            ->limit(200)
            ->get();

        return response()->json($creneaux);
    }

    // =====================================================
    // PRENDRE RENDEZ-VOUS
    // =====================================================

    public function storeRendezVous(Request $request)
    {
        $patient = $this->getPatient($request);

        $data = $request->validate([
            'medecin_id' => 'required|integer|exists:medecins,id',
            'creneau_id' => 'required|integer|exists:creneaux,id',
            'motif' => 'nullable|string|max:2000',
        ]);

        $rendezVous = DB::transaction(function () use ($patient, $data) {
            $creneau = Creneau::whereHas('horaire', fn ($q) =>
                $q->where('medecin_id', $data['medecin_id'])
            )
                ->whereHas('horaire.medecin.user')
                ->lockForUpdate()
                ->findOrFail($data['creneau_id']);

            if (
                !$creneau->disponible ||
                ReservationCreneau::where('creneau_id', $creneau->id)->exists()
            ) {
                abort(409, 'Ce créneau n’est plus disponible.');
            }

            $dateHeure = Carbon::parse(
                $creneau->date_creneau->toDateString()
                . ' ' . $creneau->heure_debut
            );

            if ($dateHeure->lte(now())) {
                abort(422, 'Choisissez un créneau futur.');
            }

            $rdv = RendezVous::create([
                'patient_id' => $patient->id,
                'medecin_id' => $data['medecin_id'],
                'creneau_id' => $creneau->id,
                'assistant_id' => null,
                'motif' => $data['motif'] ?? null,
                'statut' => 'EN_ATTENTE',
            ]);

            ReservationCreneau::create([
                'creneau_id' => $creneau->id,
                'rendez_vous_id' => $rdv->id,
            ]);

            $creneau->update(['disponible' => false]);

            return $rdv->load([
                'medecin.user:id,nom,prenom',
                'creneau',
            ]);
        });

        return response()->json([
            'message' => 'Votre demande de rendez-vous a été enregistrée.',
            'rendez_vous' => $rendezVous,
        ], 201);
    }

    // =====================================================
    // MES RENDEZ-VOUS
    // =====================================================

    public function indexRendezVous(Request $request)
    {
        $patient = $this->getPatient($request);

        $data = $request->validate([
            'statut' => 'nullable|in:EN_ATTENTE,CONFIRME,ANNULE,TERMINE',
        ]);

        $query = $patient->rendezVous()
            ->with([
                'medecin.user:id,nom,prenom,email,telephone',
                'creneau',
                'consultation',
            ])
            ->when($data['statut'] ?? null, fn ($q, $statut) =>
                $q->where('statut', $statut)
            )
            ->orderByDesc(
                Creneau::select('date_creneau')
                    ->whereColumn('creneaux.id', 'rendez_vous.creneau_id')
            );

        return response()->json($query->paginate(20));
    }

    public function annulerRendezVous(Request $request, int $id)
    {
        $patient = $this->getPatient($request);

        DB::transaction(function () use ($patient, $id) {
            $rdv = $patient->rendezVous()
                ->with('creneau')
                ->lockForUpdate()
                ->findOrFail($id);

            $this->ensureModificationAllowed($rdv);

            $reservation = ReservationCreneau::where(
                'rendez_vous_id',
                $rdv->id
            )->lockForUpdate()->first();

            if ($reservation) {
                $reservation->delete();
            }

            Creneau::whereKey($rdv->creneau_id)
                ->lockForUpdate()
                ->update(['disponible' => true]);

            $rdv->update(['statut' => 'ANNULE']);
        });

        return response()->json([
            'message' => 'Votre rendez-vous a été annulé et le créneau est libéré.',
        ]);
    }

    public function reprogrammerRendezVous(Request $request, int $id)
    {
        $patient = $this->getPatient($request);

        $data = $request->validate([
            'creneau_id' => 'required|integer|exists:creneaux,id',
        ]);

        $nouveauRdv = DB::transaction(function () use ($patient, $id, $data) {
            $ancien = $patient->rendezVous()
                ->with('creneau')
                ->lockForUpdate()
                ->findOrFail($id);

            $this->ensureModificationAllowed($ancien);

            $nouveauCreneau = Creneau::whereHas('horaire', fn ($q) =>
                $q->where('medecin_id', $ancien->medecin_id)
            )
                ->whereHas('horaire.medecin.user')
                ->lockForUpdate()
                ->findOrFail($data['creneau_id']);

            if (
                !$nouveauCreneau->disponible ||
                ReservationCreneau::where('creneau_id', $nouveauCreneau->id)->exists()
            ) {
                abort(409, 'Ce créneau n’est plus disponible.');
            }

            $dateHeure = Carbon::parse(
                $nouveauCreneau->date_creneau->toDateString()
                . ' ' . $nouveauCreneau->heure_debut
            );

            if ($dateHeure->lte(now())) {
                abort(422, 'Choisissez un créneau futur.');
            }

            if ($nouveauCreneau->id === $ancien->creneau_id) {
                abort(422, 'Choisissez un créneau différent.');
            }

            $ancienneReservation = ReservationCreneau::where(
                'rendez_vous_id',
                $ancien->id
            )->lockForUpdate()->first();

            if ($ancienneReservation) {
                $ancienneReservation->delete();
            }

            Creneau::whereKey($ancien->creneau_id)
                ->lockForUpdate()
                ->update(['disponible' => true]);

            $ancien->update(['statut' => 'ANNULE']);

            $nouveau = RendezVous::create([
                'patient_id' => $patient->id,
                'medecin_id' => $ancien->medecin_id,
                'creneau_id' => $nouveauCreneau->id,
                'assistant_id' => null,
                'motif' => $ancien->motif,
                'statut' => 'EN_ATTENTE',
                'rendez_vous_precedent_id' => $ancien->id,
            ]);

            ReservationCreneau::create([
                'creneau_id' => $nouveauCreneau->id,
                'rendez_vous_id' => $nouveau->id,
            ]);

            $nouveauCreneau->update(['disponible' => false]);

            return $nouveau->load([
                'medecin.user:id,nom,prenom',
                'creneau',
            ]);
        });

        return response()->json([
            'message' => 'Votre rendez-vous a été reprogrammé. Il est en attente de confirmation.',
            'rendez_vous' => $nouveauRdv,
        ], 201);
    }

    // =====================================================
    // MON DOSSIER MEDICAL
    // =====================================================

    public function showDossier(Request $request)
    {
        $patient = $this->getPatient($request);

        $dossier = $patient->dossierMedical()
            ->with([
                'consultations' => fn ($q) =>
                    $q->with([
                        'medecin.user:id,nom,prenom',
                        'rendezVous.creneau',
                        'ordonnances.lignes',
                    ])->orderByDesc('date_consultation'),
            ])
            ->first();

        return response()->json([
            'dossier' => $dossier,
        ]);
    }

    // =====================================================
    // MES ORDONNANCES
    // =====================================================

    public function indexOrdonnances(Request $request)
    {
        $patient = $this->getPatient($request);

        $ordonnances = Ordonnance::whereHas(
            'consultation.dossierMedical',
            fn ($q) => $q->where('patient_id', $patient->id)
        )
            ->with([
                'consultation.medecin.user:id,nom,prenom',
                'consultation.rendezVous.creneau',
                'lignes',
            ])
            ->orderByDesc('date_creation')
            ->paginate(20);

        return response()->json($ordonnances);
    }

    // =====================================================
    // NOTIFICATIONS
    // =====================================================

    public function indexNotifications(Request $request)
    {
        return response()->json(
            $request->user()
                ->notifications()
                ->with('rendezVous.creneau')
                ->orderByDesc('created_at')
                ->paginate(30)
        );
    }

    public function marquerNotificationLue(Request $request, int $id)
    {
        $notification = $request->user()
            ->notifications()
            ->findOrFail($id);

        $notification->update(['lu' => true]);

        return response()->json([
            'message' => 'Notification marquée comme lue.',
        ]);
    }

    public function marquerToutesNotificationsLues(Request $request)
    {
        $request->user()
            ->notifications()
            ->where('lu', false)
            ->update(['lu' => true]);

        return response()->json([
            'message' => 'Toutes les notifications sont marquées comme lues.',
        ]);
    }
}
