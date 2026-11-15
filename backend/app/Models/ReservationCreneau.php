<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReservationCreneau extends Model
{
    protected $table = 'reservations_creneaux';

    protected $fillable = [
        'creneau_id',
        'rendez_vous_id',
    ];

    public function creneau(): BelongsTo
    {
        return $this->belongsTo(Creneau::class, 'creneau_id');
    }

    public function rendezVous(): BelongsTo
    {
        return $this->belongsTo(RendezVous::class, 'rendez_vous_id');
    }
}
