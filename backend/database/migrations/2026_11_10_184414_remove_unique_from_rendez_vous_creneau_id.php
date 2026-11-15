
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rendez_vous', function (Blueprint $table) {
            $table->dropForeign('rendez_vous_creneau_id_foreign');
            $table->dropUnique('rendez_vous_creneau_id_unique');
        });

        Schema::table('rendez_vous', function (Blueprint $table) {
            $table->foreign('creneau_id', 'rendez_vous_creneau_id_foreign')
                ->references('id')
                ->on('creneaux')
                ->onDelete('restrict');
        });
    }

    public function down(): void
    {
        Schema::table('rendez_vous', function (Blueprint $table) {
            $table->dropForeign('rendez_vous_creneau_id_foreign');
        });

        Schema::table('rendez_vous', function (Blueprint $table) {
            $table->unique('creneau_id');

            $table->foreign('creneau_id', 'rendez_vous_creneau_id_foreign')
                ->references('id')
                ->on('creneaux')
                ->onDelete('restrict');
        });
    }
};
