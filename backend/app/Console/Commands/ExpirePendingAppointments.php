<?php

namespace App\Console\Commands;

use App\Models\Notification;
use App\Models\RendezVous;
use App\Models\ReservationCreneau;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

#[\Illuminate\Console\Attributes\Signature('app:expire-pending-appointments')]
#[\Illuminate\Console\Attributes\Description('Expire les rendez-vous en attente dont le créneau est terminé')]
class ExpirePendingAppointments extends Command
{
    public function handle(): int
    {
        $now = now();

        $count = 0;

        RendezVous::query()
            ->where('statut', 'EN_ATTENTE')
            ->whereHas('creneau', function ($query) use ($now) {
                $query->whereRaw(
                    'TIMESTAMP(date_creneau, heure_fin) < ?',
                    [$now->format('Y-m-d H:i:s')]
                );
            })
            ->select('id')
            ->chunkById(100, function ($appointments) use (&$count) {
                foreach ($appointments as $appointment) {
                    $expired = DB::transaction(function () use ($appointment) {
                        $rendezVous = RendezVous::whereKey($appointment->id)
                            ->lockForUpdate()
                            ->first();

                        if (!$rendezVous || $rendezVous->statut !== 'EN_ATTENTE') {
                            return false;
                        }

                        $creneau = $rendezVous->creneau()
                            ->lockForUpdate()
                            ->first();

                        if (!$creneau) {
                            return false;
                        }

                        if (
                            now()->format('Y-m-d H:i:s') <=
                            $creneau->date_creneau->format('Y-m-d') . ' ' . $creneau->heure_fin
                        ) {
                            return false;
                        }

                        $reservation = ReservationCreneau::where(
                            'rendez_vous_id',
                            $rendezVous->id
                        )
                            ->where('creneau_id', $creneau->id)
                            ->lockForUpdate()
                            ->first();

                        if ($reservation) {
                            $reservation->delete();
                        }

                        // Vérifier s'il reste une réservation active.
                        $hasActiveReservation = ReservationCreneau::where(
                            'creneau_id',
                            $creneau->id
                        )->exists();

                        if (!$hasActiveReservation) {
                            $creneau->update([
                                'disponible' => true,
                            ]);
                        }
                        
                        

                        $rendezVous->update([
                            'statut' => 'EXPIRE',
                        ]);

                        $userId = $rendezVous->patient?->user_id;

                        if ($userId) {
                            Notification::create([
                                'user_id' => $userId,
                                'rendez_vous_id' => $rendezVous->id,
                                'titre' => 'Rendez-vous expiré',
                                'message' => 'Votre demande de rendez-vous a expiré car le créneau est terminé.',
                                'type' => 'EXPIRE',
                                'date_envoi' => now(),
                                'lu' => false,
                            ]);
                        }

                        return true;
                    });

                    if ($expired) {
                        $count++;
                    }
                }
            });

        $this->info("Nombre de rendez-vous expirés : {$count}");

        return self::SUCCESS;
    }
}
