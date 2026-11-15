
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ordonnances', function (Blueprint $table) {
            $table->dropForeign('ordonnances_consultation_id_foreign');
            $table->dropUnique('ordonnances_consultation_id_unique');
        });

        Schema::table('ordonnances', function (Blueprint $table) {
            $table->foreign('consultation_id', 'ordonnances_consultation_id_foreign')
                ->references('id')
                ->on('consultations')
                ->onDelete('restrict');
        });
    }

    public function down(): void
    {
        Schema::table('ordonnances', function (Blueprint $table) {
            $table->dropForeign('ordonnances_consultation_id_foreign');
        });

        Schema::table('ordonnances', function (Blueprint $table) {
            $table->unique('consultation_id');

            $table->foreign('consultation_id', 'ordonnances_consultation_id_foreign')
                ->references('id')
                ->on('consultations')
                ->onDelete('restrict');
        });
    }
};
