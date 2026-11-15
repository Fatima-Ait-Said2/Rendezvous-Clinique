<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RendezVous extends Model
{
    protected $table = 'rendez_vous';

    protected $fillable = [
        'patient_id',
        'medecin_id',
        'creneau_id',
        'assistant_id',
        'motif',
        'statut',
        'rendez_vous_precedent_id',
    ];

    // Le créneau du rendez-vous
    public function creneau(): BelongsTo
    {
        return $this->belongsTo(Creneau::class, 'creneau_id');
    }

    // La réservation active du rendez-vous
    public function reservationActive(): HasOne
    {
        return $this->hasOne(ReservationCreneau::class, 'rendez_vous_id');
    }

    // Le patient concerné par le rendez-vous
    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    }

    // Le médecin du rendez-vous
    public function medecin(): BelongsTo
    {
        return $this->belongsTo(Medecin::class, 'medecin_id');
    }

    // L'assistant qui a créé le rendez-vous
    public function assistant(): BelongsTo
    {
        return $this->belongsTo(Assistant::class, 'assistant_id');
    }

    // Le rendez-vous précédent
    public function rendezVousPrecedent(): BelongsTo
    {
        return $this->belongsTo(
            RendezVous::class,
            'rendez_vous_precedent_id'
        );
    }

    // Les rendez-vous créés à partir de celui-ci
    public function rendezVousSuivants(): HasMany
    {
        return $this->hasMany(
            RendezVous::class,
            'rendez_vous_precedent_id'
        );
    }


        // La consultation associée au rendez-vous
    public function consultation(): HasOne
    {
        return $this->hasOne(Consultation::class, 'rendez_vous_id');
    }

    // Les notifications liées au rendez-vous
    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class, 'rendez_vous_id');
    }
}
