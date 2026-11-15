<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Str;

class AdminController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | Médecins
    |--------------------------------------------------------------------------
    */

    public function indexMedecins()
    {
        $medecins = User::withTrashed()
            ->where('role', 'MEDECIN')
            ->with('medecin')
            ->orderBy('nom')
            ->paginate(10);

        return response()->json($medecins);
    }

    public function storeMedecin(Request $request)
    {
        $validated = $request->validate([
            'nom' => ['required', 'string', 'max:255'],
            'prenom' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'telephone' => ['nullable', 'string', 'max:20'],
            'specialite' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ]);

        $temporaryPassword = Str::random(12);

        $user = DB::transaction(function () use ($validated, $temporaryPassword) {
            $user = User::create([
                'nom' => $validated['nom'],
                'prenom' => $validated['prenom'],
                'email' => $validated['email'],
                'telephone' => $validated['telephone'] ?? null,
                'role' => 'MEDECIN',
                'password' => $temporaryPassword,
                'must_change_password' => true,
            ]);

            $user->medecin()->create([
                'specialite' => $validated['specialite'],
                'description' => $validated['description'] ?? null,
            ]);

            return $user;
        });

        $user->load('medecin');

        return response()->json([
            'message' => 'Compte médecin créé avec succès.',
            'user' => $user,
            'temporary_password' => $temporaryPassword,
        ], 201);
    }

    public function updateMedecin(Request $request, $id)
    {
        $user = User::where('role', 'MEDECIN')->findOrFail($id);

        $validated = $request->validate([
            'nom' => ['required', 'string', 'max:255'],
            'prenom' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user->id),
            ],
            'telephone' => ['nullable', 'string', 'max:20'],
            'specialite' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ]);

        DB::transaction(function () use ($user, $validated) {
            $user->update([
                'nom' => $validated['nom'],
                'prenom' => $validated['prenom'],
                'email' => $validated['email'],
                'telephone' => $validated['telephone'] ?? null,
            ]);

            $user->medecin()->updateOrCreate(
                ['user_id' => $user->id],
                [
                    'specialite' => $validated['specialite'],
                    'description' => $validated['description'] ?? null,
                ]
            );
        });

        return response()->json([
            'message' => 'Informations du médecin modifiées avec succès.',
            'user' => $user->fresh()->load('medecin'),
        ]);
    }

    public function deactivateMedecin($id)
    {
        $user = User::where('role', 'MEDECIN')->findOrFail($id);

        $user->tokens()->delete();
        $user->delete();

        return response()->json([
            'message' => 'Compte médecin désactivé avec succès.',
        ]);
    }

    public function reactivateMedecin($id)
    {
        $user = User::withTrashed()
            ->where('role', 'MEDECIN')
            ->findOrFail($id);

        $user->restore();

        return response()->json([
            'message' => 'Compte médecin réactivé avec succès.',
        ]);
    }

    public function resetPasswordMedecin($id)
    {
        $user = User::where('role', 'MEDECIN')->findOrFail($id);

        $temporaryPassword = Str::random(12);

        $user->password = $temporaryPassword;
        $user->must_change_password = true;
        $user->save();

        $user->tokens()->delete();

        return response()->json([
            'message' => 'Mot de passe du médecin réinitialisé avec succès.',
            'temporary_password' => $temporaryPassword,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Assistants
    |--------------------------------------------------------------------------
    */

    public function indexAssistants()
    {
        $assistants = User::withTrashed()
            ->where('role', 'ASSISTANT')
            ->with('assistant.medecin.user')
            ->orderBy('nom')
            ->paginate(10);

        return response()->json($assistants);
    }

    public function storeAssistant(Request $request)
    {
        $validated = $request->validate([
            'nom' => ['required', 'string', 'max:255'],
            'prenom' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'telephone' => ['nullable', 'string', 'max:20'],
            'type_assistant' => [
                'required',
                Rule::in(['RECEPTION', 'SPECIALISE']),
            ],
            'medecin_id' => ['nullable', 'integer', 'exists:medecins,id'],
        ]);

        $this->validateAssistantDoctor($validated);

        $temporaryPassword = Str::random(12);

        $user = DB::transaction(function () use ($validated, $temporaryPassword) {
            $user = User::create([
                'nom' => $validated['nom'],
                'prenom' => $validated['prenom'],
                'email' => $validated['email'],
                'telephone' => $validated['telephone'] ?? null,
                'role' => 'ASSISTANT',
                'password' => $temporaryPassword,
                'must_change_password' => true,
            ]);

            $user->assistant()->create([
                'type_assistant' => $validated['type_assistant'],
                'medecin_id' => $validated['medecin_id'] ?? null,
            ]);

            return $user;
        });

        $user->load('assistant.medecin.user');

        return response()->json([
            'message' => 'Compte assistant créé avec succès.',
            'user' => $user,
            'temporary_password' => $temporaryPassword,
        ], 201);
    }

    public function updateAssistant(Request $request, $id)
    {
        $user = User::where('role', 'ASSISTANT')->findOrFail($id);

        $validated = $request->validate([
            'nom' => ['required', 'string', 'max:255'],
            'prenom' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user->id),
            ],
            'telephone' => ['nullable', 'string', 'max:20'],
            'type_assistant' => [
                'required',
                Rule::in(['RECEPTION', 'SPECIALISE']),
            ],
            'medecin_id' => ['nullable', 'integer', 'exists:medecins,id'],
        ]);

        $this->validateAssistantDoctor($validated);

        DB::transaction(function () use ($user, $validated) {
            $user->update([
                'nom' => $validated['nom'],
                'prenom' => $validated['prenom'],
                'email' => $validated['email'],
                'telephone' => $validated['telephone'] ?? null,
            ]);

            $user->assistant()->updateOrCreate(
                ['user_id' => $user->id],
                [
                    'type_assistant' => $validated['type_assistant'],
                    'medecin_id' => $validated['medecin_id'] ?? null,
                ]
            );
        });

        return response()->json([
            'message' => 'Informations de l’assistant modifiées avec succès.',
            'user' => $user->fresh()->load('assistant.medecin.user'),
        ]);
    }

    public function deactivateAssistant($id)
    {
        $user = User::where('role', 'ASSISTANT')->findOrFail($id);

        $user->tokens()->delete();
        $user->delete();

        return response()->json([
            'message' => 'Compte assistant désactivé avec succès.',
        ]);
    }

    public function reactivateAssistant($id)
    {
        $user = User::withTrashed()
            ->where('role', 'ASSISTANT')
            ->findOrFail($id);

        $user->restore();

        return response()->json([
            'message' => 'Compte assistant réactivé avec succès.',
        ]);
    }

    public function resetPasswordAssistant($id)
    {
        $user = User::where('role', 'ASSISTANT')->findOrFail($id);

        $temporaryPassword = Str::random(12);

        $user->password = $temporaryPassword;
        $user->must_change_password = true;
        $user->save();

        $user->tokens()->delete();

        return response()->json([
            'message' => 'Mot de passe de l’assistant réinitialisé avec succès.',
            'temporary_password' => $temporaryPassword,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Validation de l'affectation d'un assistant
    |--------------------------------------------------------------------------
    */

    private function validateAssistantDoctor(array $validated): void
    {
        if (
            $validated['type_assistant'] === 'RECEPTION'
            && !empty($validated['medecin_id'])
        ) {
            throw ValidationException::withMessages([
                'medecin_id' => [
                    'Un assistant de réception ne doit pas être lié à un médecin.',
                ],
            ]);
        }

        if (
            $validated['type_assistant'] === 'SPECIALISE'
            && empty($validated['medecin_id'])
        ) {
            throw ValidationException::withMessages([
                'medecin_id' => [
                    'Un médecin est obligatoire pour un assistant spécialisé.',
                ],
            ]);
        }

        if (
            $validated['type_assistant'] === 'SPECIALISE'
            && !empty($validated['medecin_id'])
        ) {
            $activeDoctorExists = User::where('role', 'MEDECIN')
                ->whereNull('deleted_at')
                ->whereHas('medecin', function ($query) use ($validated) {
                    $query->where('id', $validated['medecin_id']);
                })
                ->exists();

            if (!$activeDoctorExists) {
                throw ValidationException::withMessages([
                    'medecin_id' => [
                        'Le médecin sélectionné n’existe pas ou son compte est désactivé.',
                    ],
                ]);
            }
        }
    }
}
