<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('emulator_settings')->upsert(array_map(fn ($key) => [
            'key' => $key,
            'value' => '0',
        ], [
            'subscriptions.hc.payday.enabled',
            'hotel.auto.credits.enabled',
            'hotel.auto.pixels.enabled',
            'hotel.auto.points.enabled',
        ]), ['key'], ['value']);
    }

    public function down(): void
    {
        // Re-enabling currency grants is an explicit economy decision, not a rollback side effect.
    }
};
