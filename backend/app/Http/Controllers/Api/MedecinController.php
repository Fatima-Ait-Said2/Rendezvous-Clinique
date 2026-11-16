<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Creneau;
use App\Models\HoraireTravail;
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

    // Vérifier si deux horaires se chevauchent
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

    // Afficher les horaires du médecin connecté
    public function indexHoraires(Request $request)
    {
        $medecin = $this->getMedecin($request);

        return response()->json(
            $medecin->horairesTravail()->orderBy('jour_semaine')->get()
        );
    }

    // Ajouter un horaire
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
                    'Cet horaire chevauche un autre horaire du même jour.'
                ],
            ]);
        }

        $horaire = $medecin->horairesTravail()->create($data);

        return response()->json([
            'message' => 'Horaire ajouté avec succès.',
            'horaire' => $horaire,
        ], 201);
    }

    // Modifier un horaire
    public function updateHoraire(Request $request, int $id)
    {
        $medecin = $this->getMedecin($request);

        $horaire = $medecin->horairesTravail()->findOrFail($id);

        if ($horaire->creneaux()->exists()) {
            return response()->json([
                'message' => 'Impossible de modifier cet horaire car des créneaux ont déjà été générés. Supprimez-le si aucun rendez-vous ne lui est associé, puis recréez-le.',
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
                    'Cet horaire chevauche un autre horaire du même jour.'
                ],
            ]);
        }

        $horaire->update($data);

        return response()->json([
            'message' => 'Horaire modifié avec succès.',
            'horaire' => $horaire->fresh(),
        ]);
    }

    // Supprimer un horaire
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

    // Afficher les créneaux du médecin
    public function indexCreneaux(Request $request)
    {
        $medecin = $this->getMedecin($request);

        $data = $request->validate([
            'date_debut' => 'nullable|date',
            'date_fin' => 'nullable|date|after_or_equal:date_debut',
        ]);

        $creneaux = Creneau::whereHas('horaire', function ($query) use ($medecin) {
            $query->where('medecin_id', $medecin->id);
        })
        ->with('horaire:id,medecin_id,jour_semaine,duree_rendez_vous')
        ->when($data['date_debut'] ?? null, function ($query, $date) {
            $query->whereDate('date_creneau', '>=', $date);
        })
        ->when($data['date_fin'] ?? null, function ($query, $date) {
            $query->whereDate('date_creneau', '<=', $date);
        })
        ->orderBy('date_creneau')
        ->orderBy('heure_debut')
        ->paginate(100);

        return response()->json($creneaux);
    }

    // Générer les créneaux entre deux dates
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
                'date_fin' => [
                    'La période ne peut pas dépasser 90 jours.'
                ],
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

        $created = DB::transaction(function () use (
            $horaires,
            $debut,
            $fin
        ) {
            $created = 0;

            foreach ($horaires as $horaire) {
                $date = $debut->copy()->startOfDay();

                while ($date->lte($fin)) {
                    if ($date->dayOfWeekIso == $horaire->jour_semaine) {
                        $heureDebut = Carbon::parse(
                            $date->toDateString() . ' ' . $horaire->heure_debut
                        );

                        $heureFin = Carbon::parse(
                            $date->toDateString() . ' ' . $horaire->heure_fin
                        );

                        while (
                            $heureDebut->copy()
                                ->addMinutes($horaire->duree_rendez_vous)
                                ->lte($heureFin)
                        ) {
                            $slotEnd = $heureDebut->copy()
                                ->addMinutes($horaire->duree_rendez_vous);

                            if ($heureDebut->gt(now())) {
                                $creneau = Creneau::firstOrCreate(
                                    [
                                        'horaire_id' => $horaire->id,
                                        'date_creneau' => $date->toDateString(),
                                        'heure_debut' => $heureDebut->format('H:i:s'),
                                    ],
                                    [
                                        'heure_fin' => $slotEnd->format('H:i:s'),
                                        'disponible' => true,
                                    ]
                                );

                                if ($creneau->wasRecentlyCreated) {
                                    $created++;
                                }
                            }

                            $heureDebut->addMinutes(
                                $horaire->duree_rendez_vous
                            );
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


    // Tableau de bord du médecin
    public function dashboard(Request $request)
    {
        $medecin = $this->getMedecin($request);

        $rendezVousAujourdhui = $medecin->rendezVous()
            ->whereHas('creneau', function ($query) {
                $query->whereDate('date_creneau', today());
            })
            ->whereIn('statut', ['EN_ATTENTE', 'CONFIRME'])
            ->count();

        $rendezVousEnAttente = $medecin->rendezVous()
            ->where('statut', 'EN_ATTENTE')
            ->count();

        $consultationsTerminees = $medecin->consultations()->count();

        $notificationsNonLues = $request->user()
            ->notifications()
            ->where('lu', false)
            ->count();

        return response()->json([
            'rendez_vous_aujourdhui' => $rendezVousAujourdhui,
            'rendez_vous_en_attente' => $rendezVousEnAttente,
            'consultations_terminees' => $consultationsTerminees,
            'notifications_non_lues' => $notificationsNonLues,
        ]);
    }

    // Afficher un créneau appartenant au médecin connecté
    public function showCreneau(Request $request, int $id)
    {
        $medecin = $this->getMedecin($request);

        $creneau = Creneau::whereHas('horaire', function ($query) use ($medecin) {
            $query->where('medecin_id', $medecin->id);
        })
        ->with('horaire')
        ->findOrFail($id);

        return response()->json($creneau);
    }

}
