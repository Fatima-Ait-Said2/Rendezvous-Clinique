<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Medecin extends Model
{
    protected $table = 'medecins';

    protected $fillable = [
        'user_id',
        'specialite',
        'description',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function horairesTravail(): HasMany
    {
        return $this->hasMany(HoraireTravail::class, 'medecin_id');
    }

    public function assistants(): HasMany
    {
        return $this->hasMany(Assistant::class, 'medecin_id');
    }

    public function rendezVous(): HasMany
    {
        return $this->hasMany(RendezVous::class, 'medecin_id');
    }

    public function consultations(): HasMany
    {
        return $this->hasMany(Consultation::class, 'medecin_id');
    }
}
