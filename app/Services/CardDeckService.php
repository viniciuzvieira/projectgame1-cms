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
            ->map(fn ($deck) => [
                'id' => $deck->id,
                'name' => $deck->name,
                'is_primary' => $deck->id === (int) $primary,
                'cards' => $deck->cards->map(fn ($card) => $card->only([
                    'id', 'code', 'name', 'description', 'rarity', 'series', 'design_key', 'figure', 'power',
                ]) + ['quantity' => (int) $card->pivot->quantity])->values()->all(),
            ])->all();
    }

    public function create(int $userId, string $name): UserCardDeck
    {
        return DB::transaction(function () use ($userId, $name) {
            $this->lockPlayer($userId);
            $name = $this->validName($name);
            $decks = UserCardDeck::query()->where('user_id', $userId);
            // Retrying creation after a lost response reuses the deck with the same name.
            if ($existing = (clone $decks)->where('name', $name)->first()) {
                return $existing;
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
                throw ValidationException::withMessages(['name' => 'Voce ja tem um deck com esse nome.']);
            }
            $deck->update(['name' => $name]);
        }, 3);
    }

    public function setCard(int $userId, int $deckId, int $cardId, int $quantity): void
    {
        DB::transaction(function () use ($userId, $deckId, $cardId, $quantity) {
            $this->lockPlayer($userId);
            $deck = $this->ownedDeck($userId, $deckId);
            if ($quantity < 0) {
                throw ValidationException::withMessages(['quantity' => 'A quantidade nao pode ser negativa.']);
            }
            // Removing a membership never deletes or decrements the player's collection.
            if ($quantity === 0) {
                $deck->cards()->detach($cardId);

                return;
            }
            $owned = UserCard::query()->where('user_id', $userId)->where('card_definition_id', $cardId)->first();
            if (! $owned || $quantity > $owned->quantity) {
                throw ValidationException::withMessages(['quantity' => 'Este deck nao pode usar mais copias do que voce possui.']);
            }
            $deck->cards()->syncWithoutDetaching([$cardId => ['quantity' => $quantity]]);
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
            $this->ownedDeck($userId, $deckId)->delete();
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
}
