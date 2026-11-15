
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rendez_vous', function (Blueprint $table) {
            $table->id();

            $table->foreignId('patient_id')
                ->constrained('patients')
                ->restrictOnDelete();

            $table->foreignId('medecin_id')
                ->constrained('medecins')
                ->restrictOnDelete();

            $table->foreignId('creneau_id')
                ->unique()
                ->constrained('creneaux')
                ->restrictOnDelete();

            $table->foreignId('assistant_id')
                ->nullable()
                ->constrained('assistants')
                ->nullOnDelete();

            $table->text('motif')->nullable();

            $table->enum('statut', [
                'EN_ATTENTE',
                'CONFIRME',
                'ANNULE',
                'TERMINE'
            ])->default('EN_ATTENTE');

            $table->timestamps();

            $table->index(['medecin_id', 'statut']);
            $table->index(['patient_id', 'statut']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rendez_vous');
    }
};
