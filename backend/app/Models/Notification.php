<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notification extends Model
{
    protected $table = 'notifications';

    protected $fillable = [
        'user_id',
        'rendez_vous_id',
        'titre',
        'message',
        'type',
        'date_envoi',
        'lu',
    ];

    protected function casts(): array
    {
        return [
            'date_envoi' => 'datetime',
            'lu' => 'boolean',
        ];
    }

    // L'utilisateur qui reçoit la notification
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    // Le rendez-vous associé (peut être null)
    public function rendezVous(): BelongsTo
    {
        return $this->belongsTo(
            RendezVous::class,
            'rendez_vous_id'
        );
    }
}
