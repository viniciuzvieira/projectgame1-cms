<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('user_card_decks', function (Blueprint $table) {
            $table->id();
            $table->integer('user_id');
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->string('name', 60);
            $table->timestamps();
            $table->unique(['user_id', 'name']);
        });

        Schema::create('user_card_deck_cards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_card_deck_id')->constrained('user_card_decks')->cascadeOnDelete();
            $table->foreignId('card_definition_id')->constrained('card_definitions');
            $table->unsignedInteger('quantity')->default(1);
            $table->timestamps();
            $table->unique(['user_card_deck_id', 'card_definition_id'], 'user_deck_card_unique');
        });

        // One preference row per player makes multiple primary decks impossible.
        Schema::create('user_card_deck_preferences', function (Blueprint $table) {
            $table->id();
            $table->integer('user_id')->unique();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreignId('primary_deck_id')->nullable()->constrained('user_card_decks')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('user_card_deck_preferences');
        Schema::dropIfExists('user_card_deck_cards');
        Schema::dropIfExists('user_card_decks');
    }
};
