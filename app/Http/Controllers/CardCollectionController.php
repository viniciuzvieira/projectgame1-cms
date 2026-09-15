<?php

namespace App\Http\Controllers;

use App\Services\CardCollectionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CardCollectionController extends Controller
{
    public function index(Request $request, CardCollectionService $service): JsonResponse
    {
        return response()->json($service->collection($request->user()->id) + ['csrf_token' => csrf_token()])
            ->header('Cache-Control', 'private, no-store');
    }

    public function open(Request $request, int $packId, CardCollectionService $service): JsonResponse
    {
        $data = $request->validate(['request_id' => ['required', 'uuid']]);
        $opening = $service->open($request->user()->id, $packId, $data['request_id']);

        return response()->json([
            'opening_id' => $opening->id,
            'request_id' => $opening->request_id,
            'card' => $opening->reward_snapshot,
            'collection' => $service->collection($request->user()->id),
        ])->header('Cache-Control', 'private, no-store');
    }
}
