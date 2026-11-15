<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;

use Laravel\Sanctum\HasApiTokens;

#[Fillable([
    'nom',
    'prenom',
    'email',
    'telephone',
    'role',
    'password',
    'must_change_password',
])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    // Profil patient
    public function patient(): HasOne
    {
        return $this->hasOne(Patient::class, 'user_id');
    }

    // Profil médecin
    public function medecin(): HasOne
    {
        return $this->hasOne(Medecin::class, 'user_id');
    }

    // Profil assistant
    public function assistant(): HasOne
    {
        return $this->hasOne(Assistant::class, 'user_id');
    }

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'must_change_password' => 'boolean',
        ];
    }

    // Les notifications de l'utilisateur
    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class, 'user_id');
    }
}
