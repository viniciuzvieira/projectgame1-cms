<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('game_resource_definitions', function (Blueprint $table) {
            $table->id();
            $table->string('code', 32)->unique();
            $table->string('unit', 8);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });
        Schema::create('user_game_resources', function (Blueprint $table) {
            $table->id();
            $table->integer('user_id');
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreignId('resource_definition_id')->constrained('game_resource_definitions')->cascadeOnDelete();
            $table->unsignedDecimal('quantity', 20, 3)->default(0);
            $table->timestamps();
            $table->unique(['user_id', 'resource_definition_id'], 'user_game_resources_owner_unique');
        });
        Schema::create('user_game_preferences', function (Blueprint $table) {
            $table->id();
            $table->integer('user_id')->unique();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->string('theme', 8)->default('dark');
            $table->string('locale', 5)->default('pt');
            $table->string('terminal_key', 24)->default('KeyC');
            $table->timestamps();
        });
        Schema::create('user_skill_progress', function (Blueprint $table) {
            $table->id();
            $table->integer('user_id');
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->string('skill_code', 64);
            $table->unsignedSmallInteger('rank')->default(0);
            $table->timestamps();
            $table->unique(['user_id', 'skill_code']);
        });
        foreach (['data' => 'MB', 'gas' => 'kg', 'iron' => 'kg', 'gold' => 'kg'] as $code => $unit) {
            DB::table('game_resource_definitions')->insert([
                'code' => $code, 'unit' => $unit, 'sort_order' => DB::table('game_resource_definitions')->count(),
                'created_at' => now(), 'updated_at' => now(),
            ]);
        }
        // Backfill without changing any existing game currencies or granting resources.
        DB::table('user_game_resources')->insertUsing(
            ['user_id', 'resource_definition_id', 'quantity', 'created_at', 'updated_at'],
            DB::table('users')->crossJoin('game_resource_definitions')
                ->selectRaw('users.id, game_resource_definitions.id, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP')
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('user_skill_progress');
        Schema::dropIfExists('user_game_preferences');
        Schema::dropIfExists('user_game_resources');
        Schema::dropIfExists('game_resource_definitions');
    }
};
