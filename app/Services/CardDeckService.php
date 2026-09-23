<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserCard;
use App\Models\UserCardDeck;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CardDeckService
{
    public function listing(int $userId): array
    {
        $primary = DB::table('user_card_deck_preferences')->where('user_id', $userId)->value('primary_deck_id');

        return UserCardDeck::query()->where('user_id', $userId)->with('cards')->orderBy('id')->get()
            ->map(fn ($deck) => $this->deckData($deck, $deck->id === (int) $primary))->all();
    }

    public function trashedListing(int $userId): array
    {
        return UserCardDeck::onlyTrashed()->where('user_id', $userId)->with('cards')->orderByDesc('deleted_at')->get()
            ->map(fn ($deck) => $this->deckData($deck, false))->all();
    }

    public function create(int $userId, string $name): UserCardDeck
    {
        return DB::transaction(function () use ($userId, $name) {
            $this->lockPlayer($userId);
            $name = $this->validName($name);
            $decks = UserCardDeck::query()->where('user_id', $userId);
            if (UserCardDeck::withTrashed()->where('user_id', $userId)->where('name', $name)->exists()) {
                throw ValidationException::withMessages(['name' => 'Você já tem um deck com esse nome.']);
            }
            if ($decks->count() >= 50) {
                throw ValidationException::withMessages(['name' => 'Voce pode criar ate 50 decks.']);
            }

            return UserCardDeck::query()->create(['user_id' => $userId, 'name' => $name]);
        }, 3);
    }

    public function rename(int $userId, int $deckId, string $name): void
    {
        DB::transaction(function () use ($userId, $deckId, $name) {
            $this->lockPlayer($userId);
            $deck = $this->ownedDeck($userId, $deckId);
            $name = $this->validName($name);
            if (UserCardDeck::query()->where('user_id', $userId)->where('name', $name)->whereKeyNot($deckId)->exists()) {
                throw ValidationException::withMessages(['name' => 'Você já tem um deck com esse nome.']);
            }
            $deck->update(['name' => $name]);
        }, 3);
    }

    public function setCard(int $userId, int $deckId, int $cardId, int $quantity): void
    {
        DB::transaction(function () use ($userId, $deckId, $cardId, $quantity) {
            $this->lockPlayer($userId);
            $deck = $this->ownedDeck($userId, $deckId);
            if (! in_array($quantity, [0, 1], true)) {
                throw ValidationException::withMessages(['quantity' => 'Uma carta pode aparecer apenas uma vez no mesmo deck.']);
            }
            // Removing a membership never deletes or decrements the player's collection.
            if ($quantity === 0) {
                $deck->cards()->detach($cardId);

                return;
            }
            $owned = UserCard::query()->where('user_id', $userId)->where('card_definition_id', $cardId)->first();
            if (! $owned) {
                throw ValidationException::withMessages(['quantity' => 'Voce nao possui esta carta.']);
            }
            $deck->cards()->syncWithoutDetaching([$cardId]);
        }, 3);
    }

    public function makePrimary(int $userId, int $deckId): void
    {
        DB::transaction(function () use ($userId, $deckId) {
            $this->lockPlayer($userId);
            $this->ownedDeck($userId, $deckId);
            DB::table('user_card_deck_preferences')->upsert([[
                'user_id' => $userId, 'primary_deck_id' => $deckId, 'created_at' => now(), 'updated_at' => now(),
            ]], ['user_id'], ['primary_deck_id', 'updated_at']);
        }, 3);
    }

    public function delete(int $userId, int $deckId): void
    {
        DB::transaction(function () use ($userId, $deckId) {
            $this->lockPlayer($userId);
            $deck = $this->ownedDeck($userId, $deckId);
            DB::table('user_card_deck_preferences')->where('user_id', $userId)
                ->where('primary_deck_id', $deckId)->update(['primary_deck_id' => null, 'updated_at' => now()]);
            $deck->delete();
        }, 3);
    }

    public function restore(int $userId, int $deckId): void
    {
        DB::transaction(function () use ($userId, $deckId) {
            $this->lockPlayer($userId);
            UserCardDeck::onlyTrashed()->where('user_id', $userId)->whereKey($deckId)->firstOrFail()->restore();
        }, 3);
    }

    private function lockPlayer(int $userId): void
    {
        User::query()->whereKey($userId)->lockForUpdate()->firstOrFail();
    }

    private function ownedDeck(int $userId, int $deckId): UserCardDeck
    {
        return UserCardDeck::query()->where('user_id', $userId)->whereKey($deckId)->firstOrFail();
    }

    private function validName(string $name): string
    {
        $name = trim($name);
        if ($name === '' || mb_strlen($name) > 60) {
            throw ValidationException::withMessages(['name' => 'Use um nome de 1 a 60 caracteres.']);
        }

        return $name;
    }

    private function deckData(UserCardDeck $deck, bool $isPrimary): array
    {
        return [
            'id' => $deck->id,
            'name' => $deck->name,
            'is_primary' => $isPrimary,
            'cards' => $deck->cards->map(fn ($card) => $card->only([
                'id', 'code', 'name', 'description', 'rarity', 'series', 'design_key', 'figure', 'power',
            ]) + ['quantity' => 1])->values()->all(),
        ];
    }
}
