<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('character_sprite_sets', function (Blueprint $table) {
            $table->id();
            $table->string('code', 64)->unique();
            $table->string('name');
            $table->string('description')->nullable();
            $table->timestamps();
        });

        Schema::create('character_sprite_set_parts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('character_sprite_set_id')
                ->constrained('character_sprite_sets')
                ->cascadeOnDelete();
            $table->string('slot', 32);
            $table->string('figure_type', 8);
            $table->unsignedBigInteger('figure_set_id');
            $table->string('nitro_file');
            $table->json('color_ids')->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(
                ['character_sprite_set_id', 'figure_type'],
                'character_sprite_set_figure_type_unique'
            );
        });

        Schema::create('character_races', function (Blueprint $table) {
            $table->id();
            $table->string('code', 64)->unique();
            $table->string('name');
            $table->string('description')->nullable();
            $table->foreignId('default_sprite_set_id')
                ->nullable()
                ->constrained('character_sprite_sets')
                ->nullOnDelete();
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('character_race_id')
                ->nullable()
                ->after('gender')
                ->constrained('character_races')
                ->nullOnDelete();
        });
    }

    public function down()
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('character_race_id');
        });

        Schema::dropIfExists('character_races');
        Schema::dropIfExists('character_sprite_set_parts');
        Schema::dropIfExists('character_sprite_sets');
    }
};
