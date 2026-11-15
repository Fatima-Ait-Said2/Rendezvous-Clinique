
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('creneaux', function (Blueprint $table) {
            $table->id();

            $table->foreignId('horaire_id')
                ->constrained('horaires_travail')
                ->cascadeOnDelete();

            $table->date('date_creneau');
            $table->time('heure_debut');
            $table->time('heure_fin');

            $table->boolean('disponible')->default(true);

            $table->timestamps();

            $table->unique([
                'horaire_id',
                'date_creneau',
                'heure_debut'
            ], 'unique_creneau_horaire_date_heure');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('creneaux');
    }
};
