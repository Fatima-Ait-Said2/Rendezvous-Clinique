<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\MedecinController;

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

    // Routes nécessitant un mot de passe déjà changé
    Route::middleware('password.changed')->group(function () {

        // Administration
        Route::middleware('role:ADMIN')->prefix('admin')->group(function () {

            // Médecins
            Route::get('/medecins', [AdminController::class, 'indexMedecins']);
            Route::post('/medecins', [AdminController::class, 'storeMedecin']);
            Route::put('/medecins/{id}', [AdminController::class, 'updateMedecin']);

            Route::patch('/medecins/{id}/desactiver', [AdminController::class, 'deactivateMedecin']);
            Route::patch('/medecins/{id}/reactiver', [AdminController::class, 'reactivateMedecin']);
            Route::post('/medecins/{id}/reinitialiser-mot-de-passe', [AdminController::class, 'resetPasswordMedecin']);

            // Assistants
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

        // Médecins
        Route::middleware('role:MEDECIN')->prefix('medecin')->group(function () {
            Route::get('/dashboard', [MedecinController::class, 'dashboard']);
             // Gestion des horaires de travail
            Route::get('/horaires', [MedecinController::class, 'indexHoraires']);
            Route::post('/horaires', [MedecinController::class, 'storeHoraire']);
            Route::put('/horaires/{id}', [MedecinController::class, 'updateHoraire']);
            Route::delete('/horaires/{id}', [MedecinController::class, 'destroyHoraire']);

                // Gestion des créneaux
            Route::get('/creneaux', [MedecinController::class, 'indexCreneaux']);
            Route::post('/creneaux/generer', [MedecinController::class, 'generateCreneaux']);
            Route::get('/creneaux/{id}', [MedecinController::class, 'showCreneau']);
        });

        // Assistants
        Route::middleware('role:ASSISTANT')->prefix('assistant')->group(function () {
            Route::get('/dashboard', function () {
                return response()->json([
                    'message' => 'Bienvenue dans le tableau de bord Assistant.',
                ]);
            });
        });

        // Patients
        Route::middleware('role:PATIENT')->prefix('patient')->group(function () {
            Route::get('/dashboard', function () {
                return response()->json([
                    'message' => 'Bienvenue dans le tableau de bord Patient.',
                ]);
            });
        });
    });
});
