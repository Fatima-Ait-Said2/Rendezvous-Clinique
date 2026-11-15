<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Ordonnance extends Model
{
    protected $table = 'ordonnances';

    protected $fillable = [
        'consultation_id',
        'date_creation',
        'instructions',
    ];

    protected function casts(): array
    {
        return [
            'date_creation' => 'date',
        ];
    }

    // La consultation associée à cette ordonnance
    public function consultation(): BelongsTo
    {
        return $this->belongsTo(
            Consultation::class,
            'consultation_id'
        );
    }

    // Les lignes de cette ordonnance
    public function lignes(): HasMany
    {
        return $this->hasMany(
            LigneOrdonnance::class,
            'ordonnance_id'
        );
    }
}
