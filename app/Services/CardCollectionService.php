<?php

namespace App\Services;

use App\Models\CardDefinition;
use App\Models\CardPack;
use App\Models\CardPackOpening;
use App\Models\User;
use App\Models\UserCard;
use App\Models\UserCardPack;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CardCollectionService
{
    public function collection(int $userId): array
    {
        $packs = UserCardPack::query()->where('user_id', $userId)
            ->with('pack')->get()->filter(fn ($item) => $item->pack->is_active)
            ->sortBy(fn ($item) => $item->pack->sort_order)
            ->map(fn ($item) => [
                'id' => $item->pack->id,
                'code' => $item->pack->code,
                'name' => $item->pack->name,
                'description' => $item->pack->description,
                'design_key' => $item->pack->design_key,
                'quantity' => $item->quantity,
            ])->values();

        $cards = UserCard::query()->where('user_id', $userId)->where('quantity', '>', 0)
            ->with('card')->orderByDesc('updated_at')->get()
            ->map(fn ($item) => $this->cardData($item->card) + ['quantity' => $item->quantity]);

        return ['packs' => $packs, 'cards' => $cards, 'decks' => app(CardDeckService::class)->listing($userId)];
    }

    public function open(int $userId, int $packId, string $requestId): CardPackOpening
    {
        return DB::transaction(function () use ($userId, $packId, $requestId) {
            // Serialize this player's inventory changes, including different packs granting the same card.
            User::query()->whereKey($userId)->lockForUpdate()->firstOrFail();
            $previous = CardPackOpening::query()->where('user_id', $userId)->where('request_id', $requestId)->first();

            if ($previous) {
                abort_if($previous->card_pack_id !== $packId, 409, 'Esta abertura pertence a outro pacote.');

                return $previous;
            }

            $pack = CardPack::query()->whereKey($packId)->where('is_active', true)->firstOrFail();
            $stock = UserCardPack::query()->where('user_id', $userId)
                ->where('card_pack_id', $packId)->lockForUpdate()->first();

            if (! $stock || $stock->quantity < 1) {
                throw ValidationException::withMessages(['pack' => 'Voce nao tem mais unidades deste pacote.']);
            }

            $pool = $pack->rewards()->where('is_active', true)->wherePivot('weight', '>', 0)->get();
            $totalWeight = (int) $pool->sum(fn ($card) => $card->pivot->weight);
            if ($totalWeight < 1) {
                throw ValidationException::withMessages(['pack' => 'Este pacote ainda nao tem cartas disponiveis.']);
            }

            $roll = random_int(1, $totalWeight);
            $reward = null;
            foreach ($pool as $card) {
                $roll -= $card->pivot->weight;
                if ($roll <= 0) {
                    $reward = $card;
                    break;
                }
            }

            $before = $stock->quantity;
            $stock->update(['quantity' => $before - 1]);
            $owned = UserCard::query()->firstOrCreate(
                ['user_id' => $userId, 'card_definition_id' => $reward->id],
                ['quantity' => 0]
            );
            $owned->increment('quantity');

            return CardPackOpening::query()->create([
                'user_id' => $userId,
                'card_pack_id' => $packId,
                'card_definition_id' => $reward->id,
                'request_id' => $requestId,
                'quantity_before' => $before,
                'quantity_after' => $before - 1,
                'reward_snapshot' => $this->cardData($reward),
            ]);
        }, 3);
    }

    private function cardData(CardDefinition $card): array
    {
        return $card->only(['id', 'code', 'name', 'description', 'rarity', 'series', 'design_key', 'figure', 'power']);
    }
}
