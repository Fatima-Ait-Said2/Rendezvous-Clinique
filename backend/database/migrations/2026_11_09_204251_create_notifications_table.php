
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                ->constrained('users')
                ->cascadeOnDelete();

            $table->foreignId('rendez_vous_id')
                ->nullable()
                ->constrained('rendez_vous')
                ->cascadeOnDelete();

            $table->string('titre');
            $table->text('message');

            $table->enum('type', [
                'CONFIRMATION',
                'RAPPEL_24H',
                'RAPPEL_1H',
                'ANNULATION'
            ]);

            $table->timestamp('date_envoi')->nullable();

            $table->boolean('lu')->default(false);

            $table->timestamps();

            $table->index(['user_id', 'lu']);
            $table->index(['rendez_vous_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
