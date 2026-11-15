
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('horaires_travail', function (Blueprint $table) {
            $table->id();

            $table->foreignId('medecin_id')
                ->constrained('medecins')
                ->cascadeOnDelete();

            $table->unsignedTinyInteger('jour_semaine')
                ->comment('1 = Lundi, 7 = Dimanche');

            $table->time('heure_debut');
            $table->time('heure_fin');

            $table->unsignedSmallInteger('duree_rendez_vous')
                ->default(30);

            $table->timestamps();

            $table->index(['medecin_id', 'jour_semaine']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('horaires_travail');
    }
};
