<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rendez_vous', function (Blueprint $table) {
            $table->foreignId('rendez_vous_precedent_id')
                ->nullable()
                ->constrained('rendez_vous')
                ->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('rendez_vous', function (Blueprint $table) {
            $table->dropForeign(['rendez_vous_precedent_id']);
            $table->dropColumn('rendez_vous_precedent_id');
        });
    }
};
