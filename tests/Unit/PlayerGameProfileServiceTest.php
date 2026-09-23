<?php

namespace Tests\Unit;

use App\Models\User;
use App\Services\PlayerGameProfileService;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use PHPUnit\Framework\TestCase;

class PlayerGameProfileServiceTest extends TestCase
{
    private string $database;
    private User $user;
    private PlayerGameProfileService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $app = require __DIR__.'/../../bootstrap/app.php';
        $app->make(Kernel::class)->bootstrap();
        $this->database = 'cyberheroic_profile_test_'.bin2hex(random_bytes(6));
        $config = config('database.connections.mysql');
        config(['database.connections.profile_admin' => array_merge($config, ['database' => null])]);
        DB::connection('profile_admin')->statement('CREATE DATABASE `'.$this->database.'`');
        config(['database.default' => 'profile_test', 'database.connections.profile_test' => array_merge($config, ['database' => $this->database])]);
        DB::purge('profile_test');
        Schema::create('users', function (Blueprint $table) {
            $table->integer('id', true);
            $table->string('username')->unique();
        });
        $this->user = User::withoutEvents(fn () => User::query()->create(['username' => 'profile-player']));
        (require __DIR__.'/../../database/migrations/2026_09_21_000000_create_player_game_profiles.php')->up();
        (require __DIR__.'/../../database/migrations/2026_09_22_010000_refine_game_resources.php')->up();
        $this->service = app(PlayerGameProfileService::class);
    }

    protected function tearDown(): void
    {
        if (isset($this->database) && preg_match('/^cyberheroic_profile_test_[a-f0-9]{12}$/', $this->database)) {
            DB::purge('profile_test');
            DB::connection('profile_admin')->statement('DROP DATABASE `'.$this->database.'`');
        }
        parent::tearDown();
    }

    public function test_backfill_has_three_capped_balances_and_does_not_reset_them(): void
    {
        $this->assertSame(3, DB::table('user_game_resources')->count());
        $resource = DB::table('game_resource_definitions')->where('code', 'data')->first();
        DB::table('user_game_resources')->where('resource_definition_id', $resource->id)->update(['quantity' => '23.456']);
        $this->service->initialize($this->user->id);
        $profile = $this->service->profile($this->user);
        $this->assertCount(3, $profile['resources']);
        $this->assertSame('data', $profile['resources'][0]->code);
        $this->assertSame('MB', $profile['resources'][0]->unit);
        $this->assertSame('23.456', $profile['resources'][0]->quantity);
        $this->assertSame('100.000', $profile['resources'][0]->capacity);
        $this->assertSame('oil', $profile['resources'][1]->code);
        $this->assertSame('0.000', $profile['resources'][1]->quantity);
        $this->assertSame('L', $profile['resources'][1]->unit);
        $this->assertSame(['theme' => 'dark', 'locale' => 'pt', 'terminal_key' => 'KeyC'], $profile['preferences']);
    }

    public function test_new_players_are_initialized_independently_and_cannot_update_balances(): void
    {
        $other = User::withoutEvents(fn () => User::query()->create(['username' => 'other-player']));
        $profile = $this->service->preferences($other, ['theme' => 'purple', 'locale' => 'es', 'terminal_key' => 'KeyT', 'user_id' => $this->user->id, 'resources' => ['oil' => 99999]]);
        $this->assertSame('purple', $profile['preferences']['theme']);
        $this->assertSame('es', $profile['preferences']['locale']);
        $this->assertSame('KeyT', $profile['preferences']['terminal_key']);
        $this->assertSame('dark', $this->service->profile($this->user)['preferences']['theme']);
        $this->assertSame('0.000', $profile['resources'][2]->quantity);
        $this->assertSame(6, DB::table('user_game_resources')->count());
        $this->assertSame(2, DB::table('user_game_preferences')->count());
    }

    public function test_resource_grants_stop_at_capacity_and_capacity_can_expand(): void
    {
        $this->service->grantResource($this->user->id, 'oil', 132);
        $profile = $this->service->profile($this->user);
        $this->assertSame('100.000', $profile['resources'][1]->quantity);
        $this->assertSame('100.000', $profile['resources'][1]->capacity);

        $this->service->expandResourceCapacity($this->user->id, 'oil', 50);
        $this->service->grantResource($this->user->id, 'oil', 40);
        $profile = $this->service->profile($this->user);
        $this->assertSame('140.000', $profile['resources'][1]->quantity);
        $this->assertSame('150.000', $profile['resources'][1]->capacity);
    }

    public function test_reserved_and_browser_keys_are_rejected_without_partial_saves(): void
    {
        foreach (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Escape', 'F5', 'ControlLeft', ''] as $key) {
            try {
                $this->service->preferences($this->user, ['theme' => 'light', 'terminal_key' => $key]);
                $this->fail('Reserved key accepted: '.$key);
            } catch (ValidationException $exception) {
                $this->assertArrayHasKey('terminal_key', $exception->errors());
            }
        }
        $this->assertSame('dark', $this->service->profile($this->user)['preferences']['theme']);
    }

    public function test_progress_is_private_and_preferences_do_not_modify_it(): void
    {
        $other = User::withoutEvents(fn () => User::query()->create(['username' => 'skill-player']));
        DB::table('user_skill_progress')->insert(['user_id' => $other->id, 'skill_code' => 'android.core', 'rank' => 1]);
        $this->assertCount(0, $this->service->profile($this->user)['skills']);
        $profile = $this->service->preferences($other, ['skills' => [['skill_code' => 'android.core', 'rank' => 99]]]);
        $this->assertSame(1, $profile['skills'][0]->rank);
    }

    public function test_invalid_locale_is_rejected(): void
    {
        $this->expectException(ValidationException::class);
        $this->service->preferences($this->user, ['locale' => 'xx']);
    }
}
