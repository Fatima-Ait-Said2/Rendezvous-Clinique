<?php

namespace App\Console\Commands;

use App\Models\Notification;
use App\Models\RendezVous;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class SendAppointmentReminders extends Command
{
    protected $signature = 'app:send-appointment-reminders';

    protected $description = 'Envoyer les rappels des rendez-vous 24 heures et 1 heure avant';

    public function handle(): int
    {
        $this->sendReminders(24, 'RAPPEL_24H');
        $this->sendReminders(1, 'RAPPEL_1H');

        return self::SUCCESS;
    }

    private function sendReminders(int $hours, string $type): void
    {
        $now = now();
        $windowEnd = $now->copy()->addHours($hours);
        $windowStart = $windowEnd->copy()->subMinute();

        RendezVous::query()
            ->where('statut', 'CONFIRME')
            ->whereDoesntHave('notifications', function ($query) use ($type) {
                $query->where('type', $type);
            })
            ->whereHas('creneau', function ($query) use ($windowStart, $windowEnd) {
                $query->whereRaw(
                    'TIMESTAMP(date_creneau, heure_debut) > ?
                     AND TIMESTAMP(date_creneau, heure_debut) <= ?',
                    [
                        $windowStart->format('Y-m-d H:i:s'),
                        $windowEnd->format('Y-m-d H:i:s'),
                    ]
                );
            })
            ->with(['patient', 'creneau'])
            ->chunkById(100, function ($appointments) use ($type, $hours) {
                foreach ($appointments as $appointment) {
                    DB::transaction(function () use ($appointment, $type, $hours) {
                        $rendezVous = RendezVous::query()
                            ->lockForUpdate()
                            ->find($appointment->id);

                        if (!$rendezVous || $rendezVous->statut !== 'CONFIRME') {
                            return;
                        }

                        if ($rendezVous->notifications()
                            ->where('type', $type)
                            ->exists()) {
                            return;
                        }

                        $rendezVous->loadMissing(['patient', 'creneau']);

                        $userId = $rendezVous->patient?->user_id;

                        if (!$userId) {
                            return;
                        }

                        $dateRendezVous = $rendezVous->creneau->date_creneau;
                        $heureRendezVous = $rendezVous->creneau->heure_debut;

                        $delai = $hours === 24 ? '24 heures' : '1 heure';

                        Notification::create([
                            'user_id' => $userId,
                            'rendez_vous_id' => $rendezVous->id,
                            'titre' => 'Rappel de votre rendez-vous médical',
                            'message' => "Nous vous rappelons que vous avez un rendez-vous médical dans {$delai}. Date : {$dateRendezVous}, heure : {$heureRendezVous}.",
                            'type' => $type,
                            'date_envoi' => now(),
                            'lu' => false,
                        ]);

                        $this->info("Rappel {$type} envoyé pour le rendez-vous #{$rendezVous->id}");
                    });
                }
            });
    }
}
