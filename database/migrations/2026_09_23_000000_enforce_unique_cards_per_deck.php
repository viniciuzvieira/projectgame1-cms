<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        // The unique deck/card key already represents membership; quantity allowed duplicates semantically.
        Schema::table('user_card_deck_cards', function (Blueprint $table) {
            $table->dropColumn('quantity');
        });
    }

    public function down()
    {
        Schema::table('user_card_deck_cards', function (Blueprint $table) {
            $table->unsignedInteger('quantity')->default(1)->after('card_definition_id');
        });
    }
};
