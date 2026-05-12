<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class SteamAuthController extends Controller
{
    private const OPENID_ENDPOINT = 'https://steamcommunity.com/openid/';

    public function redirect(Request $request): RedirectResponse
    {
        $returnTo = route('steam.callback');
        $realm = rtrim(config('app.url'), '/');

        $query = http_build_query([
            'openid.ns' => 'http://specs.openid.net/auth/2.0',
            'openid.mode' => 'checkid_setup',
            'openid.return_to' => $returnTo,
            'openid.realm' => $realm,
            'openid.identity' => 'http://specs.openid.net/auth/2.0/identifier_select',
            'openid.claimed_id' => 'http://specs.openid.net/auth/2.0/identifier_select',
        ]);

        return redirect()->away(self::OPENID_ENDPOINT . '?' . $query);
    }

    public function callback(Request $request): RedirectResponse
    {
        if (!$this->validateOpenIdResponse($request)) {
            return redirect()->route('nitro-client');
        }

        $steamId = $this->extractSteamId($request->input('openid_claimed_id'));

        if (!$steamId) {
            return redirect()->route('nitro-client');
        }

        $linkedUserId = DB::table('user_steam_accounts')
            ->where('steam_id', $steamId)
            ->value('user_id');

        if ($linkedUserId) {
            $user = User::query()->find($linkedUserId);

            if (!$user) {
                DB::table('user_steam_accounts')->where('steam_id', $steamId)->delete();
                $user = $this->createSteamUser($request, $steamId);
            }
        } else {
            $user = $this->createSteamUser($request, $steamId);
        }

        Auth::login($user);
        $request->session()->regenerate();

        $sso = $user->ssoTicket();

        return redirect()->route('nitro-client', [
            'sso' => $sso,
        ]);
    }

    private function validateOpenIdResponse(Request $request): bool
    {
        if (!$request->filled('openid_assoc_handle') ||
            !$request->filled('openid_signed') ||
            !$request->filled('openid_sig') ||
            !$request->filled('openid_claimed_id') ||
            !$request->filled('openid_identity')) {
            return false;
        }

        $response = Http::asForm()->post(self::OPENID_ENDPOINT, [
            'openid.assoc_handle' => $request->input('openid_assoc_handle'),
            'openid.signed' => $request->input('openid_signed'),
            'openid.sig' => $request->input('openid_sig'),
            'openid.ns' => $request->input('openid_ns', 'http://specs.openid.net/auth/2.0'),
            'openid.mode' => 'check_authentication',
            'openid.op_endpoint' => $request->input('openid_op_endpoint'),
            'openid.claimed_id' => $request->input('openid_claimed_id'),
            'openid.identity' => $request->input('openid_identity'),
            'openid.return_to' => $request->input('openid_return_to'),
            'openid.response_nonce' => $request->input('openid_response_nonce'),
        ]);

        if (!$response->successful()) {
            return false;
        }

        return str_contains($response->body(), 'is_valid:true');
    }

    private function extractSteamId(?string $claimedId): ?string
    {
        if (!$claimedId) {
            return null;
        }

        if (!preg_match('#^https?://steamcommunity\.com/openid/id/(\d+)$#', $claimedId, $matches)) {
            return null;
        }

        return $matches[1] ?? null;
    }

    private function createSteamUser(Request $request, string $steamId): User
    {
        $username = $this->generateUniqueUsername($steamId);
        $mail = sprintf('steam_%s@steam.local', $steamId);

        $user = User::query()->create([
            'username' => $username,
            'real_name' => $username,
            'password' => Hash::make(Str::random(40)),
            'mail' => $mail,
            'mail_verified' => 1,
            'account_created' => now(),
            'account_day_of_birth' => '1970-01-01',
            'last_online' => time(),
            'motto' => '',
            'look' => 'hr-100-42.hd-190-1.ch-210-66.lg-270-82.sh-290-80',
            'gender' => 'M',
            'rank' => 1,
            'team_id' => 0,
            'hidden_staff' => 0,
            'credits' => 0,
            'pixels' => 0,
            'points' => 0,
            'online' => 0,
            'auth_ticket' => '',
            'ip_register' => $request->ip(),
            'ip_current' => $request->ip(),
            'machine_id' => '',
            'home_room' => 0,
            'referral_code' => $this->generateUniqueReferralCode(),
            'secret_key' => Str::random(32),
            'pincode' => '000000',
            'extra_rank' => 0,
        ]);

        DB::table('user_steam_accounts')->updateOrInsert(
            ['steam_id' => $steamId],
            ['user_id' => $user->id]
        );

        return $user;
    }

    private function generateUniqueUsername(string $steamId): string
    {
        $base = 'steam_' . substr($steamId, -8);
        $username = $base;
        $suffix = 1;

        while (User::query()->where('username', $username)->exists()) {
            $username = $base . '_' . $suffix;
            $suffix++;
        }

        return $username;
    }

    private function generateUniqueReferralCode(): string
    {
        do {
            $code = Str::upper(Str::random(8));
        } while (User::query()->where('referral_code', $code)->exists());

        return $code;
    }
}