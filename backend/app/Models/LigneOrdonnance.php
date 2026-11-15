<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LigneOrdonnance extends Model
{
    protected $table = 'lignes_ordonnance';

    protected $fillable = [
        'ordonnance_id',
        'nom_medicament',
        'dosage',
        'frequence',
        'duree',
        'quantite',
        'instructions',
    ];

    // L'ordonnance à laquelle appartient cette ligne
    public function ordonnance(): BelongsTo
    {
        return $this->belongsTo(
            Ordonnance::class,
            'ordonnance_id'
        );
    }
}
