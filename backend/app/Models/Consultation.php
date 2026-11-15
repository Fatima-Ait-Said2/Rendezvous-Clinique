<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Consultation extends Model
{
    protected $table = 'consultations';

    protected $fillable = [
        'dossier_medical_id',
        'medecin_id',
        'rendez_vous_id',
        'date_consultation',
        'diagnostic',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'date_consultation' => 'datetime',
        ];
    }

    // Le dossier médical de la consultation
    public function dossierMedical(): BelongsTo
    {
        return $this->belongsTo(
            DossierMedical::class,
            'dossier_medical_id'
        );
    }

    // Le médecin qui effectue la consultation
    public function medecin(): BelongsTo
    {
        return $this->belongsTo(Medecin::class, 'medecin_id');
    }

    // Le rendez-vous associé à la consultation
    public function rendezVous(): BelongsTo
    {
        return $this->belongsTo(RendezVous::class, 'rendez_vous_id');
    }

    // Les ordonnances de la consultation
    public function ordonnances(): HasMany
    {
        return $this->hasMany(Ordonnance::class, 'consultation_id');
    }
}
