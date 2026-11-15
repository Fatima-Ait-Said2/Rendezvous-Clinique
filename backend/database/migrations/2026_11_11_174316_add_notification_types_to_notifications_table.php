<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
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
                'MODIFICATION'
            ) NOT NULL
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $newTypesExist = DB::table('notifications')
            ->whereIn('type', ['NOUVELLE_DEMANDE', 'MODIFICATION'])
            ->exists();

        if ($newTypesExist) {
            throw new RuntimeException(
                'Impossible de supprimer ces types : des notifications les utilisent.'
            );
        }

        DB::statement("
            ALTER TABLE notifications
            MODIFY type ENUM(
                'CONFIRMATION',
                'RAPPEL_24H',
                'RAPPEL_1H',
                'ANNULATION'
            ) NOT NULL
        ");
    }
};
