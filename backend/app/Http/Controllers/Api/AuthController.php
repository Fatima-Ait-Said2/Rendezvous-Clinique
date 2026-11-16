<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Inscription d'un nouveau patient.
     */
    public function register(Request $request)
    {
        $validated = $request->validate([
            'nom' => ['required', 'string', 'max:255'],
            'prenom' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'telephone' => ['nullable', 'string', 'max:20'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $result = DB::transaction(function () use ($validated) {

            $user = User::create([
                'nom' => $validated['nom'],
                'prenom' => $validated['prenom'],
                'email' => $validated['email'],
                'telephone' => $validated['telephone'] ?? null,
                'role' => 'PATIENT',
                'password' => $validated['password'],
            ]);

            // Création automatique du profil patient.
            $user->patient()->create([]);

            // Création du token Sanctum.
            $token = $user->createToken('auth_token')->plainTextToken;

            return [
                'user' => $user,
                'token' => $token,
            ];
        });

        $user = $this->loadUserProfile($result['user']);

        return response()->json([
            'message' => 'Inscription réussie.',
            'user' => $user,
            'token' => $result['token'],
            'token_type' => 'Bearer',
            'must_change_password' => (bool) $user->must_change_password,
        ], 201);
    }

    /**
     * Connexion.
     */
    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (!$user || !Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Les identifiants sont incorrects.'],
            ]);
        }

        $user = $this->loadUserProfile($user);
	    // Supprimer les anciens tokens avant de créer un nouveau token.
	    $user->tokens()->delete();

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Connexion réussie.',
            'user' => $user,
            'token' => $token,
            'token_type' => 'Bearer',
            'must_change_password' => (bool) $user->must_change_password,
        ]);
    }

    /**
     * Informations de l'utilisateur connecté.
     */
    public function me(Request $request)
    {
        $user = $this->loadUserProfile($request->user());

        return response()->json([
            'user' => $user,
            'must_change_password' => (bool) $user->must_change_password,
        ]);
    }

    /**
     * Changement du mot de passe.
     */
    public function changePassword(Request $request)
    {
        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => [
                'required',
                'string',
                'min:8',
                'confirmed',
                'different:current_password',
            ],
        ]);

        $user = $request->user();

        if (!Hash::check($validated['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Le mot de passe actuel est incorrect.'],
            ]);
        }

        $user->password = $validated['password'];
        $user->must_change_password = false;
        $user->save();

        // Garder le token actuel et supprimer les autres tokens.
        $currentToken = $user->currentAccessToken();

        if ($currentToken) {
            $user->tokens()
                ->where('id', '!=', $currentToken->getKey())
                ->delete();
        }

        $user = $this->loadUserProfile($user);

        return response()->json([
            'message' => 'Mot de passe modifié avec succès.',
            'user' => $user,
            'must_change_password' => false,
        ]);
    }

    /**
     * Déconnexion.
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Déconnexion réussie.',
        ]);
    }

    /**
     * Chargement du profil selon le rôle.
     */
    private function loadUserProfile(User $user): User
    {
        $relation = match (strtoupper($user->role)) {
            'PATIENT' => 'patient',
            'MEDECIN' => 'medecin',
            'ASSISTANT' => 'assistant',
            default => null,
        };

        if ($relation !== null) {
            $user->load($relation);
        }

        return $user;
    }
}
