<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Creneau;
use App\Models\DossierMedical;
use App\Models\Medecin;
use App\Models\Notification;
use App\Models\Patient;
use App\Models\RendezVous;
use App\Models\ReservationCreneau;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AssistantController extends Controller
{
    private function getAssistant(Request $request)
    {
        $assistant = $request->user()->assistant;

        if (!$assistant) {
            abort(403, 'Profil assistant introuvable.');
        }

        return $assistant;
    }

    private function doctorId(Request $request): ?int
    {
        $assistant = $this->getAssistant($request);

        if ($assistant->type_assistant === 'SPECIALISE') {
            if (!$assistant->medecin_id) {
                abort(403, 'Aucun médecin n’est affecté à cet assistant.');
            }

            return (int) $assistant->medecin_id;
        }

        return null;
    }

    private function appointmentQuery(Request $request)
    {
        $query = RendezVous::query();

        $doctorId = $this->doctorId($request);

        if ($doctorId !== null) {
            $query->where('medecin_id', $doctorId);
        }

        return $query;
    }

    private function patientQuery(Request $request)
    {
        $query = Patient::query();

        $doctorId = $this->doctorId($request);

        if ($doctorId !== null) {
            $query->whereHas('rendezVous', function ($q) use ($doctorId) {
                $q->where('medecin_id', $doctorId)
                    ->where('statut', '!=', 'ANNULE');
            });
        }

        return $query;
    }

    // =====================================================
    // TABLEAU DE BORD
    // =====================================================

    public function dashboard(Request $request)
    {
        $assistant = $this->getAssistant($request);
        $doctorId = $this->doctorId($request);

        $rdvQuery = $this->appointmentQuery($request);

        $today = (clone $rdvQuery)->whereHas('creneau', fn ($q) =>
            $q->whereDate('date_creneau', today())
        );

        $latestRendezVous = (clone $rdvQuery)
            ->with([
                'patient.user:id,nom,prenom,telephone',
                'medecin.user:id,nom,prenom',
                'creneau',
            ])
            ->latest()
            ->limit(5)
            ->get();

        $patientsToday = Patient::whereHas('user', fn ($q) =>
            $q->whereDate('created_at', today())
        );

        if ($doctorId !== null) {
            $patientsToday->whereHas('rendezVous', fn ($q) =>
                $q->where('medecin_id', $doctorId)
                    ->where('statut', '!=', 'ANNULE')
            );
        }

        return response()->json([
            'type_assistant' => $assistant->type_assistant,
            'medecin' => $assistant->medecin()
                ->with('user:id,nom,prenom')
                ->first(),

            'rendez_vous_aujourdhui' => $today->count(),

            'rendez_vous_en_attente' => (clone $rdvQuery)
                ->where('statut', 'EN_ATTENTE')
                ->count(),

            'rendez_vous_confirmes' => (clone $rdvQuery)
                ->where('statut', 'CONFIRME')
                ->count(),

            'rendez_vous_annules' => (clone $rdvQuery)
                ->where('statut', 'ANNULE')
                ->count(),

            'total_patients' => $this->patientQuery($request)->count(),

            'patients_crees_aujourdhui' => $patientsToday->count(),

            'notifications_non_lues' => $request->user()
                ->notifications()
                ->where('lu', false)
                ->count(),

            'derniers_rendez_vous' => $latestRendezVous,
        ]);
    }

    // =====================================================
    // MEDECINS
    // =====================================================

    public function indexMedecins(Request $request)
    {
        $assistant = $this->getAssistant($request);

        if ($assistant->type_assistant === 'SPECIALISE') {
            return response()->json(
                Medecin::whereKey($assistant->medecin_id)
                    ->with('user:id,nom,prenom,email,telephone')
                    ->get()
            );
        }

        return response()->json(
            Medecin::whereHas('user', fn ($q) =>
                $q->whereNull('deleted_at')
            )
            ->with('user:id,nom,prenom,email,telephone')
            ->orderBy('id')
            ->get()
        );
    }

    // =====================================================
    // PATIENTS
    // =====================================================

    public function indexPatients(Request $request)
    {
        $data = $request->validate([
            'search' => 'nullable|string|max:100',
        ]);

        $patients = $this->patientQuery($request)
            ->with('user:id,nom,prenom,email,telephone')
            ->when($data['search'] ?? null, function ($q, $search) {
                $q->whereHas('user', function ($user) use ($search) {
                    $user->where('nom', 'like', "%{$search}%")
                        ->orWhere('prenom', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('telephone', 'like', "%{$search}%");
                });
            })
            ->orderByDesc('id')
            ->paginate(20);

        return response()->json($patients);
    }

    public function storePatient(Request $request)
    {
        $data = $request->validate([
            'nom' => 'required|string|max:100',
            'prenom' => 'required|string|max:100',
            'email' => 'required|email|max:255|unique:users,email',
            'telephone' => 'nullable|string|max:30',
        ]);

        $temporaryPassword = Str::random(12);

        $patient = DB::transaction(function () use ($data, $temporaryPassword) {
            $user = User::create([
                'nom' => $data['nom'],
                'prenom' => $data['prenom'],
                'email' => $data['email'],
                'telephone' => $data['telephone'] ?? null,
                'role' => 'PATIENT',
                'password' => $temporaryPassword,
                'must_change_password' => true,
            ]);

            return Patient::create([
                'user_id' => $user->id,
            ])->load('user:id,nom,prenom,email,telephone');
        });

        return response()->json([
            'message' => 'Compte patient créé avec succès.',
            'patient' => $patient,
            'temporary_password' => $temporaryPassword,
        ], 201);
    }

    // =====================================================
    // CRENEAUX DISPONIBLES
    // =====================================================

    public function creneauxDisponibles(Request $request)
    {
        $doctorId = $this->doctorId($request);

        $data = $request->validate([
            'medecin_id' => 'nullable|integer|exists:medecins,id',
            'date_debut' => 'nullable|date',
            'date_fin' => 'nullable|date|after_or_equal:date_debut',
        ]);

        if ($doctorId !== null) {
            $selectedDoctorId = $doctorId;
        } else {
            $selectedDoctorId = $data['medecin_id'] ?? null;

            if (!$selectedDoctorId) {
                throw ValidationException::withMessages([
                    'medecin_id' => ['Veuillez choisir un médecin.'],
                ]);
            }
        }

        $creneaux = Creneau::whereHas('horaire', fn ($q) =>
            $q->where('medecin_id', $selectedDoctorId)
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
        ->with('horaire:id,medecin_id')
        ->orderBy('date_creneau')
        ->orderBy('heure_debut')
        ->limit(200)
        ->get();

        return response()->json($creneaux);
    }

    // =====================================================
    // RENDEZ-VOUS
    // =====================================================

    public function indexRendezVous(Request $request)
    {
    $assistant = $this->getAssistant($request);

    $statutValidation = 'nullable|in:EN_ATTENTE,CONFIRME,ANNULE,TERMINE,EXPIRE';

    if ($assistant->type_assistant === 'SPECIALISE') {
        $statutValidation .= ',ABSENT';
    }

    $data = $request->validate([
        'statut' => $statutValidation,
        'date_debut' => 'nullable|date',
        'date_fin' => 'nullable|date|after_or_equal:date_debut',
        'search' => 'nullable|string|max:100',
    ]);

    $query = $this->appointmentQuery($request)
        ->with([
            'patient.user:id,nom,prenom,email,telephone',
            'medecin.user:id,nom,prenom',
            'creneau',
            'consultation',
        ]);

    if ($assistant->type_assistant !== 'SPECIALISE') {
        $query->where('statut', '!=', 'ABSENT');
    }

    $query
        ->when($data['statut'] ?? null, fn ($q, $status) =>
            $q->where('statut', $status)
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
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('telephone', 'like', "%{$search}%");
            });
        })
        ->orderByDesc('created_at');

    return response()->json($query->paginate(20));
    }

    public function storeRendezVous(Request $request)
    {
        $doctorId = $this->doctorId($request);

        $data = $request->validate([
            'patient_id' => 'required|integer|exists:patients,id',
            'medecin_id' => 'nullable|integer|exists:medecins,id',
            'creneau_id' => 'required|integer|exists:creneaux,id',
            'motif' => 'nullable|string',
        ]);

        if ($doctorId !== null) {
            $selectedDoctorId = $doctorId;
        } else {
            $selectedDoctorId = $data['medecin_id'] ?? null;

            if (!$selectedDoctorId) {
                throw ValidationException::withMessages([
                    'medecin_id' => ['Veuillez choisir un médecin.'],
                ]);
            }
        }

        $rdv = DB::transaction(function () use (
            $request,
            $data,
            $selectedDoctorId
        ) {
            $patient = Patient::findOrFail($data['patient_id']);

            $creneau = Creneau::whereHas('horaire', fn ($q) =>
                $q->where('medecin_id', $selectedDoctorId)
            )
            ->whereHas('horaire.medecin.user')
            ->lockForUpdate()
            ->findOrFail($data['creneau_id']);

            if (!$creneau->disponible ||
                ReservationCreneau::where('creneau_id', $creneau->id)->exists()) {
                abort(409, 'Ce créneau n’est plus disponible.');
            }

            if (Carbon::parse(
                $creneau->date_creneau->toDateString() . ' ' . $creneau->heure_debut
            )->lte(now())) {
                abort(422, 'Choisissez un créneau futur.');
            }

            $rdv = RendezVous::create([
                'patient_id' => $patient->id,
                'medecin_id' => $selectedDoctorId,
                'creneau_id' => $creneau->id,
                'assistant_id' => $request->user()->assistant->id,
                'motif' => $data['motif'] ?? null,
                'statut' => 'EN_ATTENTE',
            ]);

            ReservationCreneau::create([
                'creneau_id' => $creneau->id,
                'rendez_vous_id' => $rdv->id,
            ]);

            $creneau->update(['disponible' => false]);

            return $rdv->load([
                'patient.user',
                'medecin.user',
                'creneau',
            ]);
        });

        return response()->json([
            'message' => 'Rendez-vous créé. En attente de confirmation par le médecin.',
            'rendez_vous' => $rdv,
        ], 201);
    }



    public function confirmerRendezVous(Request $request, int $id)
    {
        $assistant = $this->getAssistant($request);

        // Seule l'assistante spécialisée peut confirmer.
        if ($assistant->type_assistant !== 'SPECIALISE') {
            abort(403, 'Seule une assistante spécialisée peut confirmer les rendez-vous.');
        }

        $rdv = DB::transaction(function () use ($request, $id) {
            // appointmentQuery limite déjà les rendez-vous au médecin assigné.
            $rdv = $this->appointmentQuery($request)
                ->lockForUpdate()
                ->findOrFail($id);

            if ($rdv->statut !== 'EN_ATTENTE') {
                abort(409, 'Ce rendez-vous ne peut plus être confirmé.');
            }

            $rdv->update([
                'statut' => 'CONFIRME',
            ]);

            return $rdv->load('patient');
        });

        if ($rdv->patient) {
            Notification::create([
                'user_id' => $rdv->patient->user_id,
                'rendez_vous_id' => $rdv->id,
                'titre' => 'Rendez-vous confirmé',
                'message' => 'Votre rendez-vous a été confirmé par l’assistante spécialisée.',
                'type' => 'CONFIRMATION',
                'date_envoi' => now(),
                'lu' => false,
            ]);
        }

        return response()->json([
            'message' => 'Rendez-vous confirmé.',
            'rendez_vous' => $rdv,
        ]);
    }



    public function annulerRendezVous(Request $request, int $id)
    {
        $rdv = DB::transaction(function () use ($request, $id) {
            $rdv = $this->appointmentQuery($request)
                ->lockForUpdate()
                ->findOrFail($id);

            if (!in_array($rdv->statut, ['EN_ATTENTE', 'CONFIRME'])) {
                abort(409, 'Ce rendez-vous ne peut pas être annulé.');
            }

            if ($rdv->consultation()->exists()) {
                abort(409, 'Impossible d’annuler un rendez-vous avec consultation.');
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

            return $rdv->load('patient');
        });

        if ($rdv->patient) {
            Notification::create([
                'user_id' => $rdv->patient->user_id,
                'rendez_vous_id' => $rdv->id,
                'titre' => 'Rendez-vous annulé',
                'message' => 'Votre rendez-vous a été annulé par le secrétariat.',
                'type' => 'ANNULATION',
                'date_envoi' => now(),
                'lu' => false,
            ]);
        }

        return response()->json([
            'message' => 'Rendez-vous annulé et créneau libéré.',
        ]);
    }




    public function marquerAbsentRendezVous(Request $request, int $id)
    {
        $assistant = $this->getAssistant($request);

        if ($assistant->type_assistant !== 'SPECIALISE') {
            abort(403, 'Seule une assistante spécialisée peut marquer un rendez-vous absent.');
        }

        $rdv = DB::transaction(function () use ($request, $id) {
            $rdv = $this->appointmentQuery($request)
                ->with('creneau')
                ->lockForUpdate()
                ->findOrFail($id);

            if ($rdv->statut !== 'CONFIRME') {
                abort(409, 'Seul un rendez-vous confirmé peut être marqué absent.');
            }

            if ($rdv->consultation()->exists()) {
                abort(409, 'Impossible de marquer absent un rendez-vous avec une consultation.');
            }

            $creneau = $rdv->creneau;

            if (!$creneau) {
                abort(409, 'Le créneau de ce rendez-vous est introuvable.');
            }

            $finRendezVous = Carbon::parse(
                $creneau->date_creneau->toDateString() . ' ' . $creneau->heure_fin,
                config('app.timezone')
            );

            if ($finRendezVous->greaterThanOrEqualTo(now(config('app.timezone')))) {
                abort(409, 'Le rendez-vous n’est pas encore terminé.');
            }

            $rdv->update(['statut' => 'ABSENT']);

            return $rdv->load([
                'patient.user',
                'medecin.user',
                'creneau',
            ]);
        });

        return response()->json([
            'message' => 'Le rendez-vous a été marqué comme absent.',
            'rendez_vous' => $rdv,
        ]);
    }


    public function reprogrammerRendezVous(Request $request, int $id)
    {
        $data = $request->validate([
            'creneau_id' => 'required|integer|exists:creneaux,id',
        ]);

        $doctorId = $this->doctorId($request);

        $nouveau = DB::transaction(function () use (
            $request,
            $id,
            $data,
            $doctorId
        ) {
            $ancien = $this->appointmentQuery($request)
                ->lockForUpdate()
                ->findOrFail($id);

            if (!in_array($ancien->statut, ['EN_ATTENTE', 'CONFIRME'])) {
                abort(409, 'Ce rendez-vous ne peut pas être reprogrammé.');
            }

            if ($ancien->consultation()->exists()) {
                abort(409, 'Un rendez-vous avec consultation ne peut pas être modifié.');
            }

            $selectedDoctorId = $doctorId ?? $ancien->medecin_id;

            $creneau = Creneau::whereHas('horaire', fn ($q) =>
                $q->where('medecin_id', $selectedDoctorId)
            )
            ->whereHas('horaire.medecin.user')
            ->lockForUpdate()
            ->findOrFail($data['creneau_id']);

            if (!$creneau->disponible ||
                ReservationCreneau::where('creneau_id', $creneau->id)->exists()) {
                abort(409, 'Ce créneau n’est plus disponible.');
            }

            if (Carbon::parse(
                $creneau->date_creneau->toDateString() . ' ' . $creneau->heure_debut
            )->lte(now())) {
                abort(422, 'Choisissez un créneau futur.');
            }

            if ($ancien->creneau_id == $creneau->id) {
                abort(422, 'Choisissez un créneau différent.');
            }

            $reservation = ReservationCreneau::where(
                'rendez_vous_id',
                $ancien->id
            )->lockForUpdate()->first();

            if ($reservation) {
                $reservation->delete();
            }

            Creneau::whereKey($ancien->creneau_id)
                ->lockForUpdate()
                ->update(['disponible' => true]);

            $ancien->update(['statut' => 'ANNULE']);

            $nouveau = RendezVous::create([
                'patient_id' => $ancien->patient_id,
                'medecin_id' => $selectedDoctorId,
                'creneau_id' => $creneau->id,
                'assistant_id' => $request->user()->assistant->id,
                'motif' => $ancien->motif,
                'statut' => 'EN_ATTENTE',
                'rendez_vous_precedent_id' => $ancien->id,
            ]);

            ReservationCreneau::create([
                'creneau_id' => $creneau->id,
                'rendez_vous_id' => $nouveau->id,
            ]);

            $creneau->update(['disponible' => false]);

            return $nouveau->load([
                'patient.user',
                'medecin.user',
                'creneau',
            ]);
        });

        return response()->json([
            'message' => 'Rendez-vous reprogrammé. En attente de confirmation.',
            'rendez_vous' => $nouveau,
        ], 201);
    }

    // =====================================================
    // DOSSIERS MEDICAUX - ASSISTANT SPECIALISE SEULEMENT
    // =====================================================

    public function indexDossiers(Request $request)
    {
        $doctorId = $this->doctorId($request);

        if ($doctorId === null) {
            abort(403, 'Les assistants généraux ne peuvent pas consulter les dossiers médicaux.');
        }

        $patients = $this->patientQuery($request)
            ->with([
                'user:id,nom,prenom,email,telephone',
                'dossierMedical',
            ])
            ->orderByDesc('id')
            ->paginate(20);

        return response()->json($patients);
    }

    public function showDossier(Request $request, int $patientId)
    {
        $doctorId = $this->doctorId($request);

        if ($doctorId === null) {
            abort(403, 'Accès réservé aux assistants spécialisés.');
        }

        $patient = Patient::whereKey($patientId)
            ->whereHas('rendezVous', fn ($q) =>
                $q->where('medecin_id', $doctorId)
                    ->where('statut', '!=', 'ANNULE')
            )
            ->with([
                'user:id,nom,prenom,email,telephone',
                'dossierMedical.consultations' => fn ($q) =>
                    $q->where('medecin_id', $doctorId)
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
