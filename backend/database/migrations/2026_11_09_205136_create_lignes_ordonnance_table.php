<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lignes_ordonnance', function (Blueprint $table) {
            $table->id();

            $table->foreignId('ordonnance_id')
                ->constrained('ordonnances')
                ->restrictOnDelete();

            $table->string('nom_medicament');

            $table->string('dosage');

            $table->string('frequence');

            $table->string('duree');

            $table->string('quantite')->nullable();

            $table->text('instructions')->nullable();

            $table->timestamps();

            $table->index('ordonnance_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lignes_ordonnance');
    }
};