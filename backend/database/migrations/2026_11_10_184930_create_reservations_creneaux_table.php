
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reservations_creneaux', function (Blueprint $table) {
            $table->id();

            $table->foreignId('creneau_id')
                ->unique()
                ->constrained('creneaux')
                ->restrictOnDelete();

            $table->foreignId('rendez_vous_id')
                ->unique()
                ->constrained('rendez_vous')
                ->restrictOnDelete();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reservations_creneaux');
    }
};
