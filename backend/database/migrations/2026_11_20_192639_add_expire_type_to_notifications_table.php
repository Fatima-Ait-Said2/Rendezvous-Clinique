<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;


return new class extends Migration
{
    public function up(): void
    {
        DB::statement("
            ALTER TABLE notifications
            MODIFY type ENUM(
                'CONFIRMATION',
                'RAPPEL_24H',
                'RAPPEL_1H',
                'ANNULATION',
                'NOUVELLE_DEMANDE',
                'MODIFICATION',
                'EXPIRE'
            ) NOT NULL
        ");
    }

    public function down(): void
    {
        if (DB::table('notifications')->where('type', 'EXPIRE')->exists()) {
            throw new \RuntimeException(
                'Impossible de supprimer EXPIRE : des notifications utilisent encore ce type.'
            );
        }

        DB::statement("
            ALTER TABLE notifications
            MODIFY type ENUM(
                'CONFIRMATION',
                'RAPPEL_24H',
                'RAPPEL_1H',
                'ANNULATION',
                'NOUVELLE_DEMANDE',
                'MODIFICATION'
            ) NOT NULL
        ");
    }
};
