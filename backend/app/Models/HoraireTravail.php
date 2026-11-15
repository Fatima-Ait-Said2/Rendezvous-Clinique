<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class HoraireTravail extends Model
{
    protected $table = 'horaires_travail';

    protected $fillable = [
        'medecin_id',
        'jour_semaine',
        'heure_debut',
        'heure_fin',
        'duree_rendez_vous',
    ];

    public function medecin(): BelongsTo
    {
        return $this->belongsTo(Medecin::class, 'medecin_id');
    }

    public function creneaux(): HasMany
    {
        return $this->hasMany(Creneau::class, 'horaire_id');
    }
}
