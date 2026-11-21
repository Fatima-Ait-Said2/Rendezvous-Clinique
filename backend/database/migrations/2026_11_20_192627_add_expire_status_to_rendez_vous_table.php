<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;


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
                'EXPIRE'
            ) NOT NULL DEFAULT 'EN_ATTENTE'
        ");
    }

    public function down(): void
    {
        if (DB::table('rendez_vous')->where('statut', 'EXPIRE')->exists()) {
            throw new \RuntimeException(
                'Impossible de supprimer EXPIRE : des rendez-vous utilisent encore ce statut.'
            );
        }

        DB::statement("
            ALTER TABLE rendez_vous
            MODIFY statut ENUM(
                'EN_ATTENTE',
                'CONFIRME',
                'ANNULE',
                'TERMINE'
            ) NOT NULL DEFAULT 'EN_ATTENTE'
        ");
    }
};
