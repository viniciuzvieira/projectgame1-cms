<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class GameAuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'usernameOrEmail' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string', 'max:255'],
        ]);

        $login = trim($data['usernameOrEmail']);
        $password = $data['password'];

        $user = User::query()
            ->where('username', $login)
            ->first();

        if(!$user || !Hash::check($password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Usuário ou senha inválidos.',
            ], 422);
        }

        Auth::login($user);
        $request->session()->regenerate();

        return response()->json([
            'success' => true,
            'sso' => $user->ssoTicket(),
            'username' => $user->username,
        ]);
    }
}