<?php
//sa contient tous les fonctionaliter de medecin 
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Creneau;
use App\Models\HoraireTravail;
use App\Models\RendezVous;
use App\Models\ReservationCreneau;
use App\Models\Patient;
use App\Models\DossierMedical;
use App\Models\Consultation;
use App\Models\Ordonnance;
use App\Models\Notification;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class MedecinController extends Controller
{
    private function getMedecin(Request $request)
    {
        $medecin = $request->user()->medecin;

        if (!$medecin) {
            abort(403, 'Profil médecin introuvable.');
        }

        return $medecin;
    }

    private function notifyPatient(
        RendezVous $rendezVous,
        string $titre,
        string $message,
        string $type
    ): void {
        $rendezVous->loadMissing('patient');

        if ($rendezVous->patient) {
            Notification::create([
                'user_id' => $rendezVous->patient->user_id,
                'rendez_vous_id' => $rendezVous->id,
                'titre' => $titre,
                'message' => $message,
                'type' => $type,
                'date_envoi' => now(),
                'lu' => false,
            ]);
        }
    }

    private function hasHoraireConflict(
        int $medecinId,
        int $jour,
        string $debut,
        string $fin,
        ?int $exceptId = null
    ): bool {
        $query = HoraireTravail::where('medecin_id', $medecinId)
            ->where('jour_semaine', $jour)
            ->where('heure_debut', '<', $fin)
            ->where('heure_fin', '>', $debut);

        if ($exceptId !== null) {
            $query->where('id', '!=', $exceptId);
        }

        return $query->exists();
    }

    // =====================================================
    // TABLEAU DE BORD
    // =====================================================

    public function dashboard(Request $request)
    {
        $medecin = $this->getMedecin($request);

        return response()->json([
            'rendez_vous_aujourdhui' => $medecin->rendezVous()
                ->whereHas('creneau', fn ($q) =>
                    $q->whereDate('date_creneau', today())
                )
                ->whereIn('statut', ['EN_ATTENTE', 'CONFIRME'])
                ->count(),

            'rendez_vous_en_attente' => $medecin->rendezVous()
                ->where('statut', 'EN_ATTENTE')
                ->count(),

            'consultations_terminees' => $medecin->consultations()->count(),

            'notifications_non_lues' => $request->user()
                ->notifications()
                ->where('lu', false)
                ->count(),
        ]);
    }

    // =====================================================
    // HORAIRES DE TRAVAIL
    // =====================================================

    public function indexHoraires(Request $request)
    {
        $medecin = $this->getMedecin($request);

        return response()->json(
            $medecin->horairesTravail()->orderBy('jour_semaine')->get()
        );
    }

    public function storeHoraire(Request $request)
    {
        $medecin = $this->getMedecin($request);

        $data = $request->validate([
            'jour_semaine' => 'required|integer|min:1|max:7',
            'heure_debut' => 'required|date_format:H:i',
            'heure_fin' => 'required|date_format:H:i|after:heure_debut',
            'duree_rendez_vous' => 'required|integer|min:5|max:240',
        ]);

        if ($this->hasHoraireConflict(
            $medecin->id,
            $data['jour_semaine'],
            $data['heure_debut'],
            $data['heure_fin']
        )) {
            throw ValidationException::withMessages([
                'heure_debut' => [
                    'Cet horaire chevauche un autre horaire du même jour.',
                ],
            ]);
        }

        $horaire = $medecin->horairesTravail()->create($data);

        return response()->json([
            'message' => 'Horaire ajouté avec succès.',
            'horaire' => $horaire,
        ], 201);
    }

    public function updateHoraire(Request $request, int $id)
    {
        $medecin = $this->getMedecin($request);
        $horaire = $medecin->horairesTravail()->findOrFail($id);

        if ($horaire->creneaux()->exists()) {
            return response()->json([
                'message' => 'Impossible de modifier cet horaire car des créneaux ont déjà été générés.',
            ], 409);
        }

        $data = $request->validate([
            'jour_semaine' => 'required|integer|min:1|max:7',
            'heure_debut' => 'required|date_format:H:i',
            'heure_fin' => 'required|date_format:H:i|after:heure_debut',
            'duree_rendez_vous' => 'required|integer|min:5|max:240',
        ]);

        if ($this->hasHoraireConflict(
            $medecin->id,
            $data['jour_semaine'],
            $data['heure_debut'],
            $data['heure_fin'],
            $horaire->id
        )) {
            throw ValidationException::withMessages([
                'heure_debut' => [
                    'Cet horaire chevauche un autre horaire du même jour.',
                ],
            ]);
        }

        $horaire->update($data);

        return response()->json([
            'message' => 'Horaire modifié avec succès.',
            'horaire' => $horaire->fresh(),
        ]);
    }

    public function destroyHoraire(Request $request, int $id)
    {
        $medecin = $this->getMedecin($request);
        $horaire = $medecin->horairesTravail()->findOrFail($id);

        if ($horaire->creneaux()->whereHas('rendezVous')->exists()) {
            return response()->json([
                'message' => 'Impossible de supprimer cet horaire car il contient des rendez-vous.',
            ], 409);
        }

        $horaire->delete();

        return response()->json([
            'message' => 'Horaire supprimé avec succès.',
        ]);
    }

    // =====================================================
    // CRENEAUX
    // =====================================================

    public function indexCreneaux(Request $request)
    {
        $medecin = $this->getMedecin($request);

        $data = $request->validate([
            'date_debut' => 'nullable|date',
            'date_fin' => 'nullable|date|after_or_equal:date_debut',
            'disponibles' => 'nullable|boolean',
        ]);

        $creneaux = Creneau::whereHas('horaire', fn ($q) =>
            $q->where('medecin_id', $medecin->id)
        )
        ->with([
            'horaire:id,medecin_id,jour_semaine,duree_rendez_vous',
            'reservationActive:id,creneau_id',
        ])
        ->when($data['date_debut'] ?? null, fn ($q, $date) =>
            $q->whereDate('date_creneau', '>=', $date)
        )
        ->when($data['date_fin'] ?? null, fn ($q, $date) =>
            $q->whereDate('date_creneau', '<=', $date)
        )
        ->when(
            array_key_exists('disponibles', $data),
            fn ($q) => $q->where('disponible', $data['disponibles'])
        )
        ->orderBy('date_creneau')
        ->orderBy('heure_debut')
        ->paginate(100);

        return response()->json($creneaux);
    }

    public function generateCreneaux(Request $request)
    {
        $medecin = $this->getMedecin($request);

        $data = $request->validate([
            'date_debut' => 'required|date|after_or_equal:today',
            'date_fin' => 'required|date|after_or_equal:date_debut',
            'horaire_id' => 'nullable|integer',
        ]);

        $debut = Carbon::parse($data['date_debut']);
        $fin = Carbon::parse($data['date_fin']);

        if ($debut->diffInDays($fin) > 90) {
            throw ValidationException::withMessages([
                'date_fin' => ['La période ne peut pas dépasser 90 jours.'],
            ]);
        }

        $horairesQuery = $medecin->horairesTravail();

        if (!empty($data['horaire_id'])) {
            $horairesQuery->where('id', $data['horaire_id']);
        }

        $horaires = $horairesQuery->get();

        if ($horaires->isEmpty()) {
            return response()->json([
                'message' => 'Aucun horaire de travail trouvé.',
            ], 404);
        }

        $created = DB::transaction(function () use ($horaires, $debut, $fin) {
            $created = 0;

            foreach ($horaires as $horaire) {
                $date = $debut->copy()->startOfDay();

                while ($date->lte($fin)) {
                    if ($date->dayOfWeekIso == $horaire->jour_semaine) {
                        $heure = Carbon::parse(
                            $date->toDateString() . ' ' . $horaire->heure_debut
                        );

                        $finHoraire = Carbon::parse(
                            $date->toDateString() . ' ' . $horaire->heure_fin
                        );

                        while (
                            $heure->copy()
                                ->addMinutes($horaire->duree_rendez_vous)
                                ->lte($finHoraire)
                        ) {
                            $finCreneau = $heure->copy()
                                ->addMinutes($horaire->duree_rendez_vous);

                            if ($heure->gt(now())) {
                                $creneau = Creneau::firstOrCreate(
                                    [
                                        'horaire_id' => $horaire->id,
                                        'date_creneau' => $date->toDateString(),
                                        'heure_debut' => $heure->format('H:i:s'),
                                    ],
                                    [
                                        'heure_fin' => $finCreneau->format('H:i:s'),
                                        'disponible' => true,
                                    ]
                                );

                                if ($creneau->wasRecentlyCreated) {
                                    $created++;
                                }
                            }

                            $heure->addMinutes($horaire->duree_rendez_vous);
                        }
                    }

                    $date->addDay();
                }
            }

            return $created;
        });

        return response()->json([
            'message' => 'Génération des créneaux terminée.',
            'creneaux_crees' => $created,
        ]);
    }
        public function bloquerCreneau(Request $request, int $id)
    {
        return $this->changerEtatCreneau($request, $id, true);
    }

    public function debloquerCreneau(Request $request, int $id)
    {
        return $this->changerEtatCreneau($request, $id, false);
    }

    private function changerEtatCreneau(
        Request $request,
        int $id,
        bool $bloquer
    ) {
        $medecin = $this->getMedecin($request);

        DB::transaction(function () use ($medecin, $id, $bloquer) {
            $creneau = Creneau::whereHas('horaire', fn ($q) =>
                $q->where('medecin_id', $medecin->id)
            )
            ->lockForUpdate()
            ->findOrFail($id);

            $reservationExiste = ReservationCreneau::where(
                'creneau_id',
                $creneau->id
            )->exists();

            $rendezVousActifExiste = RendezVous::where(
                'creneau_id',
                $creneau->id
            )
            ->whereIn('statut', ['EN_ATTENTE', 'CONFIRME'])
            ->exists();

            if ($reservationExiste || $rendezVousActifExiste) {
                abort(409, 'Impossible de modifier un créneau réservé par un rendez-vous actif.');
            }

            if ($bloquer) {
                if (!$creneau->disponible) {
                    abort(409, 'Ce créneau est déjà bloqué.');
                }

                $creneau->update(['disponible' => false]);
            } else {
                if ($creneau->disponible) {
                    abort(409, 'Ce créneau est déjà disponible.');
                }

                $creneau->update(['disponible' => true]);
            }
        });

        return response()->json([
            'message' => $bloquer
                ? 'Créneau bloqué avec succès.'
                : 'Créneau débloqué avec succès.',
        ]);
    }

    public function showCreneau(Request $request, int $id)
    {
        $medecin = $this->getMedecin($request);

        $creneau = Creneau::whereHas('horaire', fn ($q) =>
            $q->where('medecin_id', $medecin->id)
        )
        ->with('horaire')
        ->findOrFail($id);

        return response()->json($creneau);
    }

    // =====================================================
    // RENDEZ-VOUS
    // =====================================================

    public function indexRendezVous(Request $request)
    {
        $medecin = $this->getMedecin($request);

        $data = $request->validate([
            'statut' => 'nullable|in:EN_ATTENTE,CONFIRME,ANNULE,TERMINE',
            'date_debut' => 'nullable|date',
            'date_fin' => 'nullable|date|after_or_equal:date_debut',
            'search' => 'nullable|string|max:100',
        ]);

        $query = $medecin->rendezVous()
            ->with([
                'patient.user:id,nom,prenom,email,telephone',
                'creneau',
                'consultation',
            ])
            ->when($data['statut'] ?? null, fn ($q, $statut) =>
                $q->where('statut', $statut)
            )
            ->when($data['date_debut'] ?? null, fn ($q, $date) =>
                $q->whereHas('creneau', fn ($slot) =>
                    $slot->whereDate('date_creneau', '>=', $date)
                )
            )
            ->when($data['date_fin'] ?? null, fn ($q, $date) =>
                $q->whereHas('creneau', fn ($slot) =>
                    $slot->whereDate('date_creneau', '<=', $date)
                )
            )
            ->when($data['search'] ?? null, function ($q, $search) {
                $q->whereHas('patient.user', function ($user) use ($search) {
                    $user->where('nom', 'like', "%{$search}%")
                        ->orWhere('prenom', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->orderByDesc(
                Creneau::select('date_creneau')
                    ->whereColumn('creneaux.id', 'rendez_vous.creneau_id')
            );

        return response()->json($query->paginate(20));
    }

    public function confirmerRendezVous(Request $request, int $id)
    {
        $medecin = $this->getMedecin($request);

        $rendezVous = DB::transaction(function () use ($medecin, $id) {
            $rdv = $medecin->rendezVous()
                ->lockForUpdate()
                ->findOrFail($id);

            if ($rdv->statut !== 'EN_ATTENTE') {
                abort(409, 'Ce rendez-vous ne peut plus être confirmé.');
            }

            $rdv->update(['statut' => 'CONFIRME']);

            return $rdv->load(['patient', 'creneau']);
        });

        $this->notifyPatient(
            $rendezVous,
            'Rendez-vous confirmé',
            'Votre rendez-vous a été confirmé par le médecin.',
            'CONFIRMATION'
        );

        return response()->json([
            'message' => 'Rendez-vous confirmé.',
            'rendez_vous' => $rendezVous,
        ]);
    }

    public function annulerRendezVous(Request $request, int $id)
    {
        $medecin = $this->getMedecin($request);

        $rendezVous = DB::transaction(function () use ($medecin, $id) {
            $rdv = $medecin->rendezVous()
                ->with('creneau')
                ->lockForUpdate()
                ->findOrFail($id);

            if (!in_array($rdv->statut, ['EN_ATTENTE', 'CONFIRME'])) {
                abort(409, 'Ce rendez-vous ne peut pas être annulé.');
            }

            if ($rdv->consultation()->exists()) {
                abort(409, 'Impossible d’annuler un rendez-vous avec une consultation.');
            }

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

            return $rdv->load(['patient', 'creneau']);
        });

        $this->notifyPatient(
            $rendezVous,
            'Rendez-vous annulé',
            'Votre rendez-vous a été annulé par le médecin.',
            'ANNULATION'
        );

        return response()->json([
            'message' => 'Rendez-vous annulé et créneau libéré.',
        ]);
    }

    public function creneauxDisponibles(Request $request)
    {
        $medecin = $this->getMedecin($request);

        $data = $request->validate([
            'date_debut' => 'nullable|date',
            'date_fin' => 'nullable|date|after_or_equal:date_debut',
        ]);

        $creneaux = Creneau::whereHas('horaire', fn ($q) =>
            $q->where('medecin_id', $medecin->id)
        )
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

    public function reprogrammerRendezVous(Request $request, int $id)
    {
        $medecin = $this->getMedecin($request);

        $data = $request->validate([
            'creneau_id' => 'required|integer',
        ]);

        $nouveauRdv = DB::transaction(function () use ($medecin, $id, $data) {
            $ancien = $medecin->rendezVous()
                ->with('patient')
                ->lockForUpdate()
                ->findOrFail($id);

            if (!in_array($ancien->statut, ['EN_ATTENTE', 'CONFIRME'])) {
                abort(409, 'Ce rendez-vous ne peut pas être reprogrammé.');
            }

            if ($ancien->consultation()->exists()) {
                abort(409, 'Un rendez-vous avec consultation ne peut pas être modifié.');
            }

            $nouveauCreneau = Creneau::whereHas('horaire', fn ($q) =>
                $q->where('medecin_id', $medecin->id)
            )
            ->lockForUpdate()
            ->findOrFail($data['creneau_id']);

            if (
                !$nouveauCreneau->disponible ||
                ReservationCreneau::where('creneau_id', $nouveauCreneau->id)->exists()
            ) {
                abort(409, 'Ce créneau n’est plus disponible.');
            }

            if (
                Carbon::parse(
                    $nouveauCreneau->date_creneau->toDateString()
                    . ' ' . $nouveauCreneau->heure_debut
                )->lte(now())
            ) {
                abort(422, 'Choisissez un créneau futur.');
            }

            if ($ancien->creneau_id == $nouveauCreneau->id) {
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
                'patient_id' => $ancien->patient_id,
                'medecin_id' => $medecin->id,
                'creneau_id' => $nouveauCreneau->id,
                'assistant_id' => $ancien->assistant_id,
                'motif' => $ancien->motif,
                'statut' => 'EN_ATTENTE',
                'rendez_vous_precedent_id' => $ancien->id,
            ]);

            ReservationCreneau::create([
                'creneau_id' => $nouveauCreneau->id,
                'rendez_vous_id' => $nouveau->id,
            ]);

            $nouveauCreneau->update(['disponible' => false]);

            return $nouveau->load(['patient', 'creneau']);
        });

        $this->notifyPatient(
            $nouveauRdv,
            'Rendez-vous reprogrammé',
            'Votre rendez-vous a été déplacé. Le nouveau rendez-vous est en attente de confirmation.',
            'CONFIRMATION'
        );

        return response()->json([
            'message' => 'Rendez-vous reprogrammé. Le nouveau rendez-vous est en attente.',
            'rendez_vous' => $nouveauRdv,
        ], 201);
    }

    // =====================================================
    // DOSSIERS MEDICAUX
    // =====================================================

    public function indexDossiers(Request $request)
    {
        $medecin = $this->getMedecin($request);

        $patients = Patient::whereHas('rendezVous', function ($q) use ($medecin) {
            $q->where('medecin_id', $medecin->id)
                ->where('statut', '!=', 'ANNULE');
        })
        ->with(['user:id,nom,prenom,email,telephone', 'dossierMedical'])
        ->orderByDesc('id')
        ->paginate(20);

        return response()->json($patients);
    }

    public function showDossier(Request $request, int $patientId)
    {
        $medecin = $this->getMedecin($request);

        $patient = Patient::whereKey($patientId)
            ->whereHas('rendezVous', function ($q) use ($medecin) {
                $q->where('medecin_id', $medecin->id)
                    ->where('statut', '!=', 'ANNULE');
            })
            ->with([
                'user:id,nom,prenom,email,telephone',
                'dossierMedical.consultations' => fn ($q) =>
                    $q->where('medecin_id', $medecin->id)
                        ->with([
                            'rendezVous.creneau',
                            'ordonnances.lignes',
                        ])
                        ->orderByDesc('date_consultation'),
            ])
            ->firstOrFail();

        return response()->json($patient);
    }

    // =====================================================
    // CONSULTATIONS
    // =====================================================

    public function indexConsultations(Request $request)
    {
        $medecin = $this->getMedecin($request);

        $consultations = $medecin->consultations()
            ->with([
                'dossierMedical.patient.user:id,nom,prenom,email,telephone',
                'rendezVous.creneau',
                'ordonnances.lignes',
            ])
            ->orderByDesc('date_consultation')
            ->paginate(20);

        return response()->json($consultations);
    }

    public function storeConsultation(Request $request, int $rendezVousId)
    {
        $medecin = $this->getMedecin($request);

        $data = $request->validate([
            'diagnostic' => 'required|string',
            'notes' => 'nullable|string',
        ]);

        $consultation = DB::transaction(function () use (
            $medecin,
            $rendezVousId,
            $data
        ) {
            $rdv = $medecin->rendezVous()
                ->lockForUpdate()
                ->findOrFail($rendezVousId);

            if ($rdv->statut !== 'CONFIRME') {
                abort(409, 'Le rendez-vous doit être confirmé avant la consultation.');
            }

            if ($rdv->consultation()->exists()) {
                abort(409, 'Une consultation existe déjà pour ce rendez-vous.');
            }

            $dossier = DossierMedical::firstOrCreate(
                ['patient_id' => $rdv->patient_id],
                ['date_creation' => now()]
            );

            $consultation = Consultation::create([
                'dossier_medical_id' => $dossier->id,
                'medecin_id' => $medecin->id,
                'rendez_vous_id' => $rdv->id,
                'date_consultation' => now(),
                'diagnostic' => $data['diagnostic'],
                'notes' => $data['notes'] ?? null,
            ]);

            $rdv->update(['statut' => 'TERMINE']);

            return $consultation->load([
                'dossierMedical.patient.user',
                'rendezVous.creneau',
            ]);
        });

        return response()->json([
            'message' => 'Consultation enregistrée et rendez-vous terminé.',
            'consultation' => $consultation,
        ], 201);
    }

    public function updateConsultation(Request $request, int $id)
    {
        $medecin = $this->getMedecin($request);

        $consultation = $medecin->consultations()->findOrFail($id);

        $data = $request->validate([
            'diagnostic' => 'required|string',
            'notes' => 'nullable|string',
        ]);

        $consultation->update($data);

        return response()->json([
            'message' => 'Consultation modifiée.',
            'consultation' => $consultation->fresh(),
        ]);
    }

    // =====================================================
    // ORDONNANCES
    // =====================================================

    public function indexOrdonnances(Request $request)
    {
        $medecin = $this->getMedecin($request);

        $ordonnances = Ordonnance::whereHas(
            'consultation',
            fn ($q) => $q->where('medecin_id', $medecin->id)
        )
        ->with([
            'consultation.dossierMedical.patient.user:id,nom,prenom',
            'consultation.rendezVous.creneau',
            'lignes',
        ])
        ->orderByDesc('date_creation')
        ->paginate(20);

        return response()->json($ordonnances);
    }

    public function storeOrdonnance(Request $request, int $consultationId)
    {
        $medecin = $this->getMedecin($request);

        $data = $request->validate([
            'instructions' => 'nullable|string',
            'lignes' => 'required|array|min:1',
            'lignes.*.nom_medicament' => 'required|string|max:255',
            'lignes.*.dosage' => 'required|string|max:255',
            'lignes.*.frequence' => 'required|string|max:255',
            'lignes.*.duree' => 'required|string|max:255',
            'lignes.*.quantite' => 'nullable|string|max:100',
            'lignes.*.instructions' => 'nullable|string',
        ]);

        $consultation = $medecin->consultations()->findOrFail($consultationId);

        $ordonnance = DB::transaction(function () use ($consultation, $data) {
            $ordonnance = Ordonnance::create([
                'consultation_id' => $consultation->id,
                'date_creation' => today(),
                'instructions' => $data['instructions'] ?? null,
            ]);

            foreach ($data['lignes'] as $ligne) {
                $ordonnance->lignes()->create($ligne);
            }

            return $ordonnance->load('lignes');
        });

        return response()->json([
            'message' => 'Ordonnance créée.',
            'ordonnance' => $ordonnance,
        ], 201);
    }

    public function updateOrdonnance(Request $request, int $id)
    {
        $medecin = $this->getMedecin($request);

        $ordonnance = Ordonnance::whereHas(
            'consultation',
            fn ($q) => $q->where('medecin_id', $medecin->id)
        )->findOrFail($id);

        $data = $request->validate([
            'instructions' => 'nullable|string',
            'lignes' => 'required|array|min:1',
            'lignes.*.nom_medicament' => 'required|string|max:255',
            'lignes.*.dosage' => 'required|string|max:255',
            'lignes.*.frequence' => 'required|string|max:255',
            'lignes.*.duree' => 'required|string|max:255',
            'lignes.*.quantite' => 'nullable|string|max:100',
            'lignes.*.instructions' => 'nullable|string',
        ]);

        DB::transaction(function () use ($ordonnance, $data) {
            $ordonnance->update([
                'instructions' => $data['instructions'] ?? null,
            ]);

            $ordonnance->lignes()->delete();

            foreach ($data['lignes'] as $ligne) {
                $ordonnance->lignes()->create($ligne);
            }
        });

        return response()->json([
            'message' => 'Ordonnance modifiée.',
            'ordonnance' => $ordonnance->fresh('lignes'),
        ]);
    }

    // =====================================================
    // NOTIFICATIONS
    // =====================================================

    public function indexNotifications(Request $request)
    {
        $notifications = $request->user()
            ->notifications()
            ->with('rendezVous.creneau')
            ->orderByDesc('created_at')
            ->paginate(30);

        return response()->json($notifications);
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
