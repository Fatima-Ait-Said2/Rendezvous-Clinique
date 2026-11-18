<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\MedecinController;
use App\Http\Controllers\Api\PatientController;

// Routes publiques
Route::post('/register', [AuthController::class, 'register'])
    ->middleware('throttle:10,1');

Route::post('/login', [AuthController::class, 'login'])
    ->middleware('throttle:login');

// Routes accessibles aux utilisateurs connectés
Route::middleware('auth:sanctum')->group(function () {

    Route::get('/user', [AuthController::class, 'me']);
    Route::post('/change-password', [AuthController::class, 'changePassword']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::middleware('password.changed')->group(function () {

        // ADMINISTRATION
        Route::middleware('role:ADMIN')->prefix('admin')->group(function () {

            Route::get('/medecins', [AdminController::class, 'indexMedecins']);
            Route::post('/medecins', [AdminController::class, 'storeMedecin']);
            Route::put('/medecins/{id}', [AdminController::class, 'updateMedecin']);
            Route::patch('/medecins/{id}/desactiver', [AdminController::class, 'deactivateMedecin']);
            Route::patch('/medecins/{id}/reactiver', [AdminController::class, 'reactivateMedecin']);
            Route::post('/medecins/{id}/reinitialiser-mot-de-passe', [AdminController::class, 'resetPasswordMedecin']);

            Route::get('/assistants', [AdminController::class, 'indexAssistants']);
            Route::post('/assistants', [AdminController::class, 'storeAssistant']);
            Route::put('/assistants/{id}', [AdminController::class, 'updateAssistant']);
            Route::patch('/assistants/{id}/desactiver', [AdminController::class, 'deactivateAssistant']);
            Route::patch('/assistants/{id}/reactiver', [AdminController::class, 'reactivateAssistant']);
            Route::post('/assistants/{id}/reinitialiser-mot-de-passe', [AdminController::class, 'resetPasswordAssistant']);

            Route::get('/dashboard', function () {
                return response()->json([
                    'message' => 'Bienvenue dans le tableau de bord Admin.',
                ]);
            });
        });

        // MEDECIN
        Route::middleware('role:MEDECIN')->prefix('medecin')->group(function () {

            // Tableau de bord
            Route::get('/dashboard', [MedecinController::class, 'dashboard']);

            // Horaires
            Route::get('/horaires', [MedecinController::class, 'indexHoraires']);
            Route::post('/horaires', [MedecinController::class, 'storeHoraire']);
            Route::put('/horaires/{id}', [MedecinController::class, 'updateHoraire']);
            Route::delete('/horaires/{id}', [MedecinController::class, 'destroyHoraire']);

            // Créneaux
            Route::get('/creneaux', [MedecinController::class, 'indexCreneaux']);
            Route::post('/creneaux/generer', [MedecinController::class, 'generateCreneaux']);
            Route::get('/creneaux-disponibles', [MedecinController::class, 'creneauxDisponibles']);
            Route::patch('/creneaux/{id}/bloquer', [MedecinController::class, 'bloquerCreneau']);
            Route::patch('/creneaux/{id}/debloquer', [MedecinController::class, 'debloquerCreneau']);
            

            // Rendez-vous
            Route::get('/rendez-vous', [MedecinController::class, 'indexRendezVous']);
            Route::patch('/rendez-vous/{id}/confirmer', [MedecinController::class, 'confirmerRendezVous']);
            Route::patch('/rendez-vous/{id}/annuler', [MedecinController::class, 'annulerRendezVous']);
            Route::post('/rendez-vous/{id}/reprogrammer', [MedecinController::class, 'reprogrammerRendezVous']);

            // Dossiers médicaux
            Route::get('/dossiers', [MedecinController::class, 'indexDossiers']);
            Route::get('/dossiers/{patientId}', [MedecinController::class, 'showDossier']);

            // Consultations
            Route::get('/consultations', [MedecinController::class, 'indexConsultations']);
            Route::post('/rendez-vous/{rendezVousId}/consultation', [MedecinController::class, 'storeConsultation']);
            Route::put('/consultations/{id}', [MedecinController::class, 'updateConsultation']);

            // Ordonnances
            Route::get('/ordonnances', [MedecinController::class, 'indexOrdonnances']);
            Route::post('/consultations/{consultationId}/ordonnances', [MedecinController::class, 'storeOrdonnance']);
            Route::put('/ordonnances/{id}', [MedecinController::class, 'updateOrdonnance']);

            // Notifications
            Route::get('/notifications', [MedecinController::class, 'indexNotifications']);
            Route::patch('/notifications/{id}/lue', [MedecinController::class, 'marquerNotificationLue']);
            Route::patch('/notifications/lire-toutes', [MedecinController::class, 'marquerToutesNotificationsLues']);
        });

        // ASSISTANT

        Route::middleware('role:ASSISTANT')
            ->prefix('assistant')
            ->controller(\App\Http\Controllers\Api\AssistantController::class)
            ->group(function () {

                // Tableau de bord
                Route::get('/dashboard', 'dashboard');

                // Médecins
                Route::get('/medecins', 'indexMedecins');

                // Patients
                Route::get('/patients', 'indexPatients');
                Route::post('/patients', 'storePatient');

                // Créneaux disponibles
                Route::get('/creneaux-disponibles', 'creneauxDisponibles');

                // Rendez-vous
                Route::get('/rendez-vous', 'indexRendezVous');
                Route::post('/rendez-vous', 'storeRendezVous');
                Route::post('/rendez-vous/{id}/confirmer', 'confirmerRendezVous');
                Route::post('/rendez-vous/{id}/annuler', 'annulerRendezVous');
                Route::post('/rendez-vous/{id}/reprogrammer', 'reprogrammerRendezVous');

                // Dossiers médicaux - assistant spécialisé uniquement
                Route::get('/dossiers', 'indexDossiers');
                Route::get('/dossiers/{patientId}', 'showDossier');

                // Notifications
                Route::get('/notifications', 'indexNotifications');
                Route::patch('/notifications/{id}/lue', 'marquerNotificationLue');
                Route::patch('/notifications/lues', 'marquerToutesNotificationsLues');
            });


        // PATIENT
        Route::middleware('role:PATIENT')
            ->prefix('patient')
            ->controller(PatientController::class)
            ->group(function () {

                // Tableau de bord
                Route::get('/dashboard', 'dashboard');

                // Médecins et créneaux
                Route::get('/medecins', 'indexMedecins');
                Route::get('/creneaux-disponibles', 'creneauxDisponibles');

                // Rendez-vous
                Route::get('/rendez-vous', 'indexRendezVous');
                Route::post('/rendez-vous', 'storeRendezVous');
                Route::post('/rendez-vous/{id}/annuler', 'annulerRendezVous');
                Route::post('/rendez-vous/{id}/reprogrammer', 'reprogrammerRendezVous');

                // Dossier médical
                Route::get('/dossier', 'showDossier');

                // Ordonnances
                Route::get('/ordonnances', 'indexOrdonnances');

                // Notifications
                Route::get('/notifications', 'indexNotifications');
                Route::patch('/notifications/{id}/lue', 'marquerNotificationLue');
                Route::patch('/notifications/lues', 'marquerToutesNotificationsLues');
            });
        });
}
);
