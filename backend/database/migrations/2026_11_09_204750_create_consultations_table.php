<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('consultations', function (Blueprint $table) {
            $table->id();

            $table->foreignId('dossier_medical_id')
                ->constrained('dossiers_medicaux')
                ->restrictOnDelete();

            $table->foreignId('medecin_id')
                ->constrained('medecins')
                ->restrictOnDelete();

            $table->foreignId('rendez_vous_id')
                ->unique()
                ->constrained('rendez_vous')
                ->restrictOnDelete();

            $table->dateTime('date_consultation');

            $table->text('diagnostic');

            $table->text('notes')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('consultations');
    }
};