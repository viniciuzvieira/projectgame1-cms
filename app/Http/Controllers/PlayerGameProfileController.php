<?php

namespace App\Http\Controllers;

use App\Services\PlayerGameProfileService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PlayerGameProfileController extends Controller
{
    public function index(Request $request, PlayerGameProfileService $service): JsonResponse
    {
        return response()->json($service->profile($request->user()) + ['csrf_token' => csrf_token()])
            ->header('Cache-Control', 'private, no-store');
    }

    public function update(Request $request, PlayerGameProfileService $service): JsonResponse
    {
        return response()->json($service->preferences($request->user(), $request->only(['theme', 'locale', 'terminal_key'])))
            ->header('Cache-Control', 'private, no-store');
    }
}
