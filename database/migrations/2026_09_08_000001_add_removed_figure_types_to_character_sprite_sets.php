<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('character_sprite_sets', function (Blueprint $table) {
            $table->json('removed_figure_types')->nullable()->after('description');
        });
    }

    public function down()
    {
        Schema::table('character_sprite_sets', function (Blueprint $table) {
            $table->dropColumn('removed_figure_types');
        });
    }
};
