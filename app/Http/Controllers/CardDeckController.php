<?php

namespace App\Http\Controllers;

use App\Services\CardDeckService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CardDeckController extends Controller
{
    public function store(Request $request, CardDeckService $service): JsonResponse
    {
        $data = $request->validate(['name' => ['required', 'string', 'max:60']]);
        $deck = $service->create($request->user()->id, $data['name']);

        return $this->result($request, $service, ['deck_id' => $deck->id]);
    }

    public function rename(Request $request, int $deckId, CardDeckService $service): JsonResponse
    {
        $data = $request->validate(['name' => ['required', 'string', 'max:60']]);
        $service->rename($request->user()->id, $deckId, $data['name']);

        return $this->result($request, $service);
    }

    public function card(Request $request, int $deckId, int $cardId, CardDeckService $service): JsonResponse
    {
        $data = $request->validate(['quantity' => ['required', 'integer', 'min:0', 'max:4294967295']]);
        $service->setCard($request->user()->id, $deckId, $cardId, $data['quantity']);

        return $this->result($request, $service);
    }

    public function primary(Request $request, int $deckId, CardDeckService $service): JsonResponse
    {
        $service->makePrimary($request->user()->id, $deckId);

        return $this->result($request, $service);
    }

    public function destroy(Request $request, int $deckId, CardDeckService $service): JsonResponse
    {
        $service->delete($request->user()->id, $deckId);

        return $this->result($request, $service);
    }

    private function result(Request $request, CardDeckService $service, array $extra = []): JsonResponse
    {
        return response()->json($extra + ['decks' => $service->listing($request->user()->id)])
            ->header('Cache-Control', 'private, no-store');
    }
}
