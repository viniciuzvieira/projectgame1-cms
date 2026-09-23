<?php

namespace Tests\Unit;

use App\Models\CardDefinition;
use App\Models\User;
use App\Models\UserCard;
use App\Models\UserCardDeck;
use App\Services\CardCollectionService;
use App\Services\CardDeckService;
use Database\Seeders\CardCatalogSeeder;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use PHPUnit\Framework\TestCase;

class CardDeckServiceTest extends TestCase
{
    private string $database;

    private int $userId;

    private int $cardId;

    private CardDeckService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $app = require __DIR__.'/../../bootstrap/app.php';
        $app->make(Kernel::class)->bootstrap();
        $this->database = 'cyberheroic_decks_test_'.bin2hex(random_bytes(6));
        $config = config('database.connections.mysql');
        config(['database.connections.decks_admin' => array_merge($config, ['database' => null])]);
        DB::connection('decks_admin')->statement('CREATE DATABASE `'.$this->database.'`');
        config(['database.default' => 'decks_test', 'database.connections.decks_test' => array_merge($config, ['database' => $this->database])]);
        DB::purge('decks_test');
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
        $this->userId = User::withoutEvents(fn () => User::query()->create(['username' => 'deck-player']))->id;
        $this->cardId = CardDefinition::query()->firstOrFail()->id;
        UserCard::query()->create(['user_id' => $this->userId, 'card_definition_id' => $this->cardId, 'quantity' => 2]);
        $this->service = app(CardDeckService::class);
    }

    protected function tearDown(): void
    {
        if (isset($this->database) && preg_match('/^cyberheroic_decks_test_[a-f0-9]{12}$/', $this->database)) {
            DB::purge('decks_test');
            DB::connection('decks_admin')->statement('DROP DATABASE `'.$this->database.'`');
        }
        parent::tearDown();
    }

    public function test_membership_updates_are_idempotent_and_duplicate_deck_names_are_rejected(): void
    {
        $deck = $this->service->create($this->userId, '  Forja  ');
        try {
            $this->service->create($this->userId, 'Forja');
            $this->fail('Duplicate deck names must be rejected.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('name', $exception->errors());
        }
        $this->assertSame('Forja', $deck->name);
        $this->service->setCard($this->userId, $deck->id, $this->cardId, 1);
        $this->service->setCard($this->userId, $deck->id, $this->cardId, 1);
        $this->assertSame(1, DB::table('user_card_deck_cards')->count());
        $this->assertSame(1, $this->service->listing($this->userId)[0]['cards'][0]['quantity']);
        $this->assertSame(2, UserCard::query()->first()->quantity);
        $this->assertFalse(Schema::hasColumn('user_card_deck_cards', 'quantity'));
    }

    public function test_same_cards_can_be_used_in_different_decks_without_spending_them(): void
    {
        foreach (['Deck 1', 'Deck 2'] as $name) {
            $deck = $this->service->create($this->userId, $name);
            $this->service->setCard($this->userId, $deck->id, $this->cardId, 1);
        }
        $this->assertSame(2, DB::table('user_card_deck_cards')->count());
        $this->assertSame(2, UserCard::query()->first()->quantity);
    }

    public function test_removing_a_card_or_recycling_and_restoring_a_deck_preserves_collection(): void
    {
        $deck = $this->service->create($this->userId, 'Temporario');
        $this->service->setCard($this->userId, $deck->id, $this->cardId, 1);
        $this->assertSame(1, $this->service->listing($this->userId)[0]['cards'][0]['quantity']);
        $this->service->setCard($this->userId, $deck->id, $this->cardId, 0);
        $this->assertSame(0, DB::table('user_card_deck_cards')->count());
        $this->assertSame(2, UserCard::query()->first()->quantity);
        $this->service->setCard($this->userId, $deck->id, $this->cardId, 1);
        $this->service->makePrimary($this->userId, $deck->id);
        $this->service->delete($this->userId, $deck->id);
        $this->assertNull(DB::table('user_card_deck_preferences')->value('primary_deck_id'));
        $this->assertSame([], $this->service->listing($this->userId));
        $this->assertSame('Temporario', $this->service->trashedListing($this->userId)[0]['name']);
        $this->assertSame($this->cardId, $this->service->trashedListing($this->userId)[0]['cards'][0]['id']);
        $this->assertSame(1, DB::table('user_card_deck_cards')->count());
        $this->assertSame(2, UserCard::query()->first()->quantity);
        $this->service->restore($this->userId, $deck->id);
        $this->assertSame('Temporario', $this->service->listing($this->userId)[0]['name']);
        $this->assertSame([], $this->service->trashedListing($this->userId));
    }

    public function test_unowned_cards_and_excess_copies_are_rejected(): void
    {
        $deck = $this->service->create($this->userId, 'Limites');
        $unowned = CardDefinition::query()->whereKeyNot($this->cardId)->firstOrFail()->id;
        foreach ([[$this->cardId, 2], [$this->cardId, -1], [$unowned, 1]] as [$id, $quantity]) {
            try {
                $this->service->setCard($this->userId, $deck->id, $id, $quantity);
                $this->fail('Invalid deck quantity must be rejected.');
            } catch (ValidationException $exception) {
                $this->assertArrayHasKey('quantity', $exception->errors());
            }
        }
        $this->assertSame(0, DB::table('user_card_deck_cards')->count());
        $this->assertSame(2, UserCard::query()->first()->quantity);
    }

    public function test_every_mutation_is_scoped_to_its_owner(): void
    {
        $deck = $this->service->create($this->userId, 'Privado');
        $other = User::withoutEvents(fn () => User::query()->create(['username' => 'other-player']))->id;
        $this->assertSame([], $this->service->listing($other));
        foreach ([
            fn () => $this->service->rename($other, $deck->id, 'Invadido'),
            fn () => $this->service->setCard($other, $deck->id, $this->cardId, 0),
            fn () => $this->service->setCard($other, $deck->id, $this->cardId, 1),
            fn () => $this->service->makePrimary($other, $deck->id),
            fn () => $this->service->delete($other, $deck->id),
        ] as $operation) {
            try {
                $operation();
                $this->fail('Cross-player access must be rejected.');
            } catch (ModelNotFoundException $exception) {
                $this->assertSame(UserCardDeck::class, $exception->getModel());
            }
        }
        $this->service->delete($this->userId, $deck->id);
        try {
            $this->service->restore($other, $deck->id);
            $this->fail('Cross-player restore must be rejected.');
        } catch (ModelNotFoundException $exception) {
            $this->assertSame(UserCardDeck::class, $exception->getModel());
        }
        $this->assertSame('Privado', UserCardDeck::withTrashed()->findOrFail($deck->id)->name);
    }

    public function test_only_one_deck_is_primary_and_collection_includes_it(): void
    {
        $first = $this->service->create($this->userId, 'Um');
        $second = $this->service->create($this->userId, 'Dois');
        $this->service->makePrimary($this->userId, $first->id);
        $this->service->makePrimary($this->userId, $second->id);
        $this->service->makePrimary($this->userId, $second->id);
        $decks = app(CardCollectionService::class)->collection($this->userId)['decks'];
        $this->assertFalse($decks[0]['is_primary']);
        $this->assertTrue($decks[1]['is_primary']);
        $this->assertSame(1, DB::table('user_card_deck_preferences')->count());
        $this->assertSame($second->id, (int) DB::table('user_card_deck_preferences')->value('primary_deck_id'));
    }

    public function test_names_can_be_changed_but_not_duplicated_or_blank(): void
    {
        $deck = $this->service->create($this->userId, 'Original');
        $this->service->rename($this->userId, $deck->id, '  Renomeado  ');
        $this->assertSame('Renomeado', $deck->fresh()->name);
        $this->service->create($this->userId, 'Outro');
        foreach (['Outro', '  ', str_repeat('x', 61)] as $name) {
            try {
                $this->service->rename($this->userId, $deck->id, $name);
                $this->fail('Invalid names must be rejected.');
            } catch (ValidationException $exception) {
                $this->assertArrayHasKey('name', $exception->errors());
            }
        }
        $this->assertSame('Renomeado', $deck->fresh()->name);
    }

    public function test_deck_routes_require_authentication_and_csrf(): void
    {
        foreach (['store', 'rename', 'card', 'primary', 'destroy', 'restore'] as $action) {
            $route = app('router')->getRoutes()->getByName('api.game.decks.'.$action);
            $middleware = app('router')->gatherRouteMiddleware($route);
            $this->assertContains(\App\Http\Middleware\Authenticate::class, $middleware);
            $this->assertContains(\App\Http\Middleware\VerifyCsrfToken::class, $middleware);
        }
    }
}
