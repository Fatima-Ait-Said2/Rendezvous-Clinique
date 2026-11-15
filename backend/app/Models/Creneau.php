<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Creneau extends Model
{
    protected $table = 'creneaux';

    protected $fillable = [
        'horaire_id',
        'date_creneau',
        'heure_debut',
        'heure_fin',
        'disponible',
    ];

    protected function casts(): array
    {
        return [
            'date_creneau' => 'date',
            'disponible' => 'boolean',
        ];
    }

    public function horaire(): BelongsTo
    {
        return $this->belongsTo(HoraireTravail::class, 'horaire_id');
    }

    public function rendezVous(): HasMany
    {
        return $this->hasMany(RendezVous::class, 'creneau_id');
    }

    public function reservationActive(): HasOne
    {
        return $this->hasOne(ReservationCreneau::class, 'creneau_id');
    }
}
