<?php

namespace Tests\Unit;

use App\Models\CardPack;
use App\Models\CardPackOpening;
use App\Models\User;
use App\Models\UserCard;
use App\Models\UserCardPack;
use App\Services\CardCollectionService;
use Database\Seeders\CardCatalogSeeder;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use PHPUnit\Framework\TestCase;

class CardCollectionServiceTest extends TestCase
{
    private string $database;

    private User $user;

    private CardPack $pack;

    private CardCollectionService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $app = require __DIR__.'/../../bootstrap/app.php';
        $app->make(Kernel::class)->bootstrap();

        // A disposable schema, never migrations/rollbacks against the player's database.
        $this->database = 'cyberheroic_cards_test_'.bin2hex(random_bytes(6));
        $config = config('database.connections.mysql');
        config(['database.connections.cards_admin' => array_merge($config, ['database' => null])]);
        DB::connection('cards_admin')->statement('CREATE DATABASE `'.$this->database.'`');
        config(['database.default' => 'cards_test', 'database.connections.cards_test' => array_merge($config, ['database' => $this->database])]);
        DB::purge('cards_test');
        Schema::create('users', function (Blueprint $table) {
            $table->integer('id', true);
            $table->string('username')->unique();
            $table->string('password')->nullable();
        });
        (require __DIR__.'/../../database/migrations/2026_09_15_000000_create_card_collections.php')->up();
        (require __DIR__.'/../../database/migrations/2026_09_15_010000_create_card_decks.php')->up();
        (require __DIR__.'/../../database/migrations/2026_09_23_000000_enforce_unique_cards_per_deck.php')->up();
        (require __DIR__.'/../../database/migrations/2026_09_23_010000_add_soft_deletes_to_user_card_decks.php')->up();
        app(CardCatalogSeeder::class)->run();
        $this->user = User::withoutEvents(fn () => User::query()->create(['username' => 'teste123']));
        $this->pack = CardPack::query()->where('code', 'founders')->firstOrFail();
        UserCardPack::query()->create(['user_id' => $this->user->id, 'card_pack_id' => $this->pack->id, 'quantity' => 2]);
        $this->service = app(CardCollectionService::class);
    }

    protected function tearDown(): void
    {
        if (isset($this->database) && preg_match('/^cyberheroic_cards_test_[a-f0-9]{12}$/', $this->database)) {
            DB::purge('cards_test');
            DB::connection('cards_admin')->statement('DROP DATABASE `'.$this->database.'`');
        }
        parent::tearDown();
    }

    public function test_opening_spends_one_pack_grants_a_card_and_logs_it(): void
    {
        $opening = $this->service->open($this->user->id, $this->pack->id, (string) Str::uuid());
        $this->assertSame(1, UserCardPack::query()->first()->quantity);
        $this->assertSame(1, UserCard::query()->first()->quantity);
        $this->assertSame(2, $opening->quantity_before);
        $this->assertSame(1, $opening->quantity_after);
        $this->assertSame($opening->card_definition_id, $opening->reward_snapshot['id']);
        $this->assertSame(1, CardPackOpening::query()->count());
    }

    public function test_retry_is_idempotent_and_cannot_be_reused_for_another_pack(): void
    {
        $key = (string) Str::uuid();
        $first = $this->service->open($this->user->id, $this->pack->id, $key);
        $again = $this->service->open($this->user->id, $this->pack->id, $key);
        $this->assertSame($first->id, $again->id);
        $this->assertSame(1, UserCardPack::query()->first()->quantity);
        $this->assertSame(1, CardPackOpening::query()->count());
        try {
            $this->service->open($this->user->id, CardPack::query()->where('code', 'arctic')->first()->id, $key);
            $this->fail('A request key cannot identify a different pack.');
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $exception) {
            $this->assertSame(409, $exception->getStatusCode());
        }
    }

    public function test_empty_stock_cannot_be_opened_but_its_last_receipt_can_be_retried(): void
    {
        $this->service->open($this->user->id, $this->pack->id, (string) Str::uuid());
        $key = (string) Str::uuid();
        $last = $this->service->open($this->user->id, $this->pack->id, $key);
        $this->assertSame($last->id, $this->service->open($this->user->id, $this->pack->id, $key)->id);
        try {
            $this->service->open($this->user->id, $this->pack->id, (string) Str::uuid());
            $this->fail('Empty stock must be rejected.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('pack', $exception->errors());
        }
        $this->assertSame(0, UserCardPack::query()->first()->quantity);
        $this->assertSame(2, CardPackOpening::query()->count());
        $this->assertSame(2, (int) UserCard::query()->sum('quantity'));
    }

    public function test_collections_are_scoped_to_the_player(): void
    {
        $other = User::withoutEvents(fn () => User::query()->create(['username' => 'other-player']));
        $this->assertCount(0, $this->service->collection($other->id)['packs']);
        $this->assertCount(0, $this->service->collection($other->id)['cards']);
        $this->expectException(ValidationException::class);
        $this->service->open($other->id, $this->pack->id, (string) Str::uuid());
    }

    public function test_invalid_reward_pool_does_not_spend_a_pack(): void
    {
        DB::table('card_pack_rewards')->where('card_pack_id', $this->pack->id)->update(['weight' => 0]);
        try {
            $this->service->open($this->user->id, $this->pack->id, (string) Str::uuid());
            $this->fail('An empty reward pool must be rejected.');
        } catch (ValidationException $exception) {
            $this->assertSame(2, UserCardPack::query()->first()->quantity);
            $this->assertSame(0, CardPackOpening::query()->count());
            $this->assertSame(0, UserCard::query()->count());
        }
    }

    public function test_poc_grant_runs_once_and_does_not_refill_consumed_stock(): void
    {
        $this->assertSame(0, Artisan::call('cards:seed-poc', ['username' => $this->user->username]));
        $this->assertSame(52, UserCardPack::query()->where('card_pack_id', $this->pack->id)->first()->quantity);
        $this->service->open($this->user->id, $this->pack->id, (string) Str::uuid());
        $this->assertSame(0, Artisan::call('cards:seed-poc', ['username' => $this->user->username]));
        $this->assertSame(51, UserCardPack::query()->where('card_pack_id', $this->pack->id)->first()->quantity);
        $this->assertSame(3, DB::table('user_card_pack_grants')->count());
    }

    public function test_failure_writing_the_log_rolls_back_stock_and_reward(): void
    {
        CardPackOpening::creating(function () {
            throw new \RuntimeException('Simulated audit write failure.');
        });
        try {
            $this->service->open($this->user->id, $this->pack->id, (string) Str::uuid());
            $this->fail('The audit failure must abort the transaction.');
        } catch (\RuntimeException $exception) {
            $this->assertSame('Simulated audit write failure.', $exception->getMessage());
            $this->assertSame(2, UserCardPack::query()->first()->quantity);
            $this->assertSame(0, UserCard::query()->count());
            $this->assertSame(0, CardPackOpening::query()->count());
        } finally {
            CardPackOpening::flushEventListeners();
        }
    }

    public function test_collection_routes_require_authentication_and_csrf(): void
    {
        $route = app('router')->getRoutes()->getByName('api.game.collection.open');
        $middleware = app('router')->gatherRouteMiddleware($route);
        $this->assertContains(\App\Http\Middleware\Authenticate::class, $middleware);
        $this->assertContains(\App\Http\Middleware\VerifyCsrfToken::class, $middleware);
    }
}
