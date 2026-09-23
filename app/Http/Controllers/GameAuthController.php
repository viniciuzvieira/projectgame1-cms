<?php

namespace App\Http\Controllers;

use App\Actions\Fortify\CreateNewUser;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class GameAuthController extends Controller
{
    public function register(Request $request, CreateNewUser $createNewUser): JsonResponse
    {
        $input = [
            'username' => $request->input('username'),
            'mail' => $request->input('email'),
            'password' => $request->input('password'),
            'password_confirmation' => $request->input('passwordConfirm'),
            'gender' => $request->input('gender'),
            'race' => $request->input('race'),
            'referral_code' => '',
            'terms' => true,
        ];

        if ($request->filled('look')) {
            $input['look'] = $request->input('look');
        }

        $user = $createNewUser->create($input);

        Auth::login($user);
        $request->session()->regenerate();

        return response()->json([
            'success' => true,
            'sso' => $user->ssoTicket(),
            'username' => $user->username,
        ], 201);
    }

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
