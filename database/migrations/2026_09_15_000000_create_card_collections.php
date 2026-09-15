<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('card_definitions', function (Blueprint $table) {
            $table->id();
            $table->string('code', 64)->unique();
            $table->string('name');
            $table->string('description')->nullable();
            $table->string('rarity', 32);
            $table->string('series', 64);
            $table->string('design_key', 64);
            $table->string('figure', 512);
            $table->unsignedSmallInteger('power');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('card_packs', function (Blueprint $table) {
            $table->id();
            $table->string('code', 64)->unique();
            $table->string('name');
            $table->string('description')->nullable();
            $table->string('design_key', 64);
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('card_pack_rewards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('card_pack_id')->constrained('card_packs')->cascadeOnDelete();
            $table->foreignId('card_definition_id')->constrained('card_definitions')->cascadeOnDelete();
            $table->unsignedInteger('weight')->default(1);
            $table->timestamps();
            $table->unique(['card_pack_id', 'card_definition_id']);
        });

        Schema::create('user_card_packs', function (Blueprint $table) {
            $table->id();
            // The emulator's users.id is a signed INT, not Laravel's unsigned BIGINT.
            $table->integer('user_id');
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreignId('card_pack_id')->constrained('card_packs');
            $table->unsignedInteger('quantity')->default(0);
            $table->timestamps();
            $table->unique(['user_id', 'card_pack_id']);
        });

        Schema::create('user_cards', function (Blueprint $table) {
            $table->id();
            $table->integer('user_id');
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreignId('card_definition_id')->constrained('card_definitions');
            $table->unsignedInteger('quantity')->default(0);
            $table->timestamps();
            $table->unique(['user_id', 'card_definition_id']);
        });

        Schema::create('card_pack_openings', function (Blueprint $table) {
            $table->id();
            $table->integer('user_id');
            $table->foreign('user_id')->references('id')->on('users');
            $table->foreignId('card_pack_id')->constrained('card_packs');
            $table->foreignId('card_definition_id')->constrained('card_definitions');
            $table->uuid('request_id');
            $table->unsignedInteger('quantity_before');
            $table->unsignedInteger('quantity_after');
            $table->json('reward_snapshot');
            $table->timestamps();
            $table->unique(['user_id', 'request_id']);
            $table->index(['user_id', 'created_at']);
        });

        Schema::create('user_card_pack_grants', function (Blueprint $table) {
            $table->id();
            $table->integer('user_id');
            $table->foreign('user_id')->references('id')->on('users');
            $table->foreignId('card_pack_id')->constrained('card_packs');
            $table->string('grant_key', 64);
            $table->unsignedInteger('quantity');
            $table->timestamps();
            $table->unique(['user_id', 'card_pack_id', 'grant_key'], 'user_card_pack_grant_unique');
        });
    }

    public function down()
    {
        Schema::dropIfExists('user_card_pack_grants');
        Schema::dropIfExists('card_pack_openings');
        Schema::dropIfExists('user_cards');
        Schema::dropIfExists('user_card_packs');
        Schema::dropIfExists('card_pack_rewards');
        Schema::dropIfExists('card_packs');
        Schema::dropIfExists('card_definitions');
    }
};
