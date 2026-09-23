<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('game_resource_definitions', function (Blueprint $table) {
            $table->unsignedDecimal('default_capacity', 20, 3)->default(100)->after('unit');
        });
        Schema::table('user_game_resources', function (Blueprint $table) {
            $table->unsignedDecimal('capacity', 20, 3)->default(100)->after('quantity');
        });

        // Oil replaces gas while retaining every player's existing balance.
        DB::table('game_resource_definitions')->where('code', 'gas')->update([
            'code' => 'oil', 'unit' => 'L', 'sort_order' => 1, 'default_capacity' => 100, 'updated_at' => now(),
        ]);
        DB::table('game_resource_definitions')->where('code', 'data')->update([
            'unit' => 'MB', 'sort_order' => 0, 'default_capacity' => 100, 'updated_at' => now(),
        ]);
        DB::table('game_resource_definitions')->where('code', 'iron')->update([
            'unit' => 'kg', 'sort_order' => 2, 'default_capacity' => 100, 'updated_at' => now(),
        ]);
        DB::table('game_resource_definitions')->where('code', 'gold')->delete();
    }

    public function down(): void
    {
        DB::table('game_resource_definitions')->where('code', 'oil')->update([
            'code' => 'gas', 'unit' => 'kg', 'sort_order' => 1, 'updated_at' => now(),
        ]);
        DB::table('game_resource_definitions')->insertOrIgnore([
            'code' => 'gold', 'unit' => 'kg', 'default_capacity' => 100, 'sort_order' => 3,
            'created_at' => now(), 'updated_at' => now(),
        ]);

        Schema::table('user_game_resources', function (Blueprint $table) {
            $table->dropColumn('capacity');
        });
        Schema::table('game_resource_definitions', function (Blueprint $table) {
            $table->dropColumn('default_capacity');
        });
    }
};
