
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("
            ALTER TABLE rendez_vous
            MODIFY statut ENUM(
                'EN_ATTENTE',
                'CONFIRME',
                'ANNULE',
                'TERMINE',
                'EXPIRE',
                'ABSENT'
            ) NOT NULL DEFAULT 'EN_ATTENTE'
        ");
    }

    public function down(): void
    {
        if (DB::table('rendez_vous')->where('statut', 'ABSENT')->exists()) {
            throw new \RuntimeException(
                'Impossible de supprimer ABSENT : des rendez-vous utilisent encore ce statut.'
            );
        }

        DB::statement("
            ALTER TABLE rendez_vous
            MODIFY statut ENUM(
                'EN_ATTENTE',
                'CONFIRME',
                'ANNULE',
                'TERMINE',
                'EXPIRE'
            ) NOT NULL DEFAULT 'EN_ATTENTE'
        ");
    }
};
