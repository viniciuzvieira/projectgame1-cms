<?php

namespace Tests\Unit;

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use PHPUnit\Framework\TestCase;

class AutomaticCurrencySettingsTest extends TestCase
{
    private string $database;
    private const KEYS = [
        'subscriptions.hc.payday.enabled',
        'hotel.auto.credits.enabled',
        'hotel.auto.pixels.enabled',
        'hotel.auto.points.enabled',
    ];

    protected function setUp(): void
    {
        parent::setUp();
        $app = require __DIR__.'/../../bootstrap/app.php';
        $app->make(Kernel::class)->bootstrap();
        $this->database = 'cyberheroic_economy_test_'.bin2hex(random_bytes(6));
        $config = config('database.connections.mysql');
        config(['database.connections.economy_admin' => array_merge($config, ['database' => null])]);
        DB::connection('economy_admin')->statement('CREATE DATABASE `'.$this->database.'`');
        config(['database.default' => 'economy_test', 'database.connections.economy_test' => array_merge($config, ['database' => $this->database])]);
        DB::purge('economy_test');
        Schema::create('emulator_settings', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->text('value');
        });
        Schema::create('users', function (Blueprint $table) {
            $table->integer('id')->primary();
            $table->integer('credits');
        });
        DB::table('users')->insert(['id' => 1, 'credits' => 14010]);
    }

    protected function tearDown(): void
    {
        if (isset($this->database) && preg_match('/^cyberheroic_economy_test_[a-f0-9]{12}$/', $this->database)) {
            DB::purge('economy_test');
            DB::connection('economy_admin')->statement('DROP DATABASE `'.$this->database.'`');
        }
        parent::tearDown();
    }

    public function test_disables_only_automatic_grants_without_resetting_balances(): void
    {
        foreach (self::KEYS as $key) {
            DB::table('emulator_settings')->insert(['key' => $key, 'value' => '1']);
        }
        DB::table('emulator_settings')->insert(['key' => 'hotel.trading.enabled', 'value' => '1']);
        $migration = require __DIR__.'/../../database/migrations/2026_09_22_000000_disable_automatic_currency_rewards.php';
        $migration->up();
        $migration->up();
        $this->assertSame(5, DB::table('emulator_settings')->count());
        foreach (self::KEYS as $key) {
            $this->assertSame('0', DB::table('emulator_settings')->where('key', $key)->value('value'));
        }
        $this->assertSame('1', DB::table('emulator_settings')->where('key', 'hotel.trading.enabled')->value('value'));
        $this->assertSame(14010, (int) DB::table('users')->where('id', 1)->value('credits'));
    }

    public function test_missing_flags_are_disabled_and_rollback_does_not_restart_payments(): void
    {
        $migration = require __DIR__.'/../../database/migrations/2026_09_22_000000_disable_automatic_currency_rewards.php';
        $migration->up();
        $migration->down();
        $this->assertSame(4, DB::table('emulator_settings')->where('value', '0')->count());
    }
}
