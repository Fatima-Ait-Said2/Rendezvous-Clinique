
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->renameColumn('name', 'nom');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('prenom')->nullable()->after('nom');
            $table->string('telephone')->nullable()->after('email');
            $table->string('role')->default('PATIENT')->after('telephone');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['prenom', 'telephone', 'role']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->renameColumn('nom', 'name');
        });
    }
};
