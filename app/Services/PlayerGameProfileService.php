<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class PlayerGameProfileService
{
    public function initialize(int $userId): void
    {
        $now = now();
        $resources = DB::table('game_resource_definitions')->get()->map(fn ($resource) => [
            'user_id' => $userId, 'resource_definition_id' => $resource->id,
            'quantity' => 0, 'capacity' => $resource->default_capacity,
            'created_at' => $now, 'updated_at' => $now,
        ])->all();
        if ($resources) {
            // Unique owner/resource pairs make concurrent initialization safe; never reset a balance.
            DB::table('user_game_resources')->insertOrIgnore($resources);
        }
        DB::table('user_game_preferences')->insertOrIgnore([
            'user_id' => $userId, 'created_at' => $now, 'updated_at' => $now,
        ]);
    }

    public function profile(User $user): array
    {
        $this->initialize($user->id);
        $preferences = DB::table('user_game_preferences')->where('user_id', $user->id)->first();
        return [
            'user_id' => $user->id,
            'preferences' => collect($preferences)->only(['theme', 'locale', 'terminal_key'])->all(),
            'resources' => DB::table('user_game_resources as balances')
                ->join('game_resource_definitions as resources', 'resources.id', '=', 'balances.resource_definition_id')
                ->where('balances.user_id', $user->id)->orderBy('resources.sort_order')
                ->get(['resources.code', 'resources.unit', 'balances.quantity', 'balances.capacity'])->all(),
            'skills' => DB::table('user_skill_progress')->where('user_id', $user->id)
                ->get(['skill_code', 'rank'])->all(),
        ];
    }

    public function preferences(User $user, array $input): array
    {
        $allowedKeys = array_merge(
            array_map(fn ($letter) => 'Key'.$letter, array_diff(range('A', 'Z'), ['W', 'A', 'S', 'D'])),
            array_map(fn ($digit) => 'Digit'.$digit, range(0, 9)),
            ['Backquote', 'BracketLeft', 'BracketRight', 'Semicolon', 'Quote', 'Comma', 'Period', 'Slash', 'Backslash', 'Minus', 'Equal']
        );
        $data = Validator::make($input, [
            'theme' => ['sometimes', 'required', Rule::in(['light', 'dark', 'purple'])],
            'locale' => ['sometimes', 'required', Rule::in(['pt', 'en', 'es'])],
            'terminal_key' => ['sometimes', 'required', Rule::in($allowedKeys)],
        ])->validate();
        $this->initialize($user->id);
        if ($data) {
            DB::table('user_game_preferences')->where('user_id', $user->id)->update($data + ['updated_at' => now()]);
        }
        return $this->profile($user);
    }

    public function grantResource(int $userId, string $code, float $amount): void
    {
        $amount = $this->positiveAmount($amount);
        $this->initialize($userId);

        DB::transaction(function () use ($userId, $code, $amount) {
            $balance = $this->resourceBalance($userId, $code);
            $quantity = min((float) $balance->capacity, (float) $balance->quantity + $amount);

            DB::table('user_game_resources')->where('id', $balance->id)->update([
                'quantity' => number_format($quantity, 3, '.', ''),
                'updated_at' => now(),
            ]);
        }, 3);
    }

    public function expandResourceCapacity(int $userId, string $code, float $amount): void
    {
        $amount = $this->positiveAmount($amount);
        $this->initialize($userId);

        DB::transaction(function () use ($userId, $code, $amount) {
            $balance = $this->resourceBalance($userId, $code);

            DB::table('user_game_resources')->where('id', $balance->id)->update([
                'capacity' => number_format((float) $balance->capacity + $amount, 3, '.', ''),
                'updated_at' => now(),
            ]);
        }, 3);
    }

    private function resourceBalance(int $userId, string $code): object
    {
        $balance = DB::table('user_game_resources as balances')
            ->join('game_resource_definitions as resources', 'resources.id', '=', 'balances.resource_definition_id')
            ->where('balances.user_id', $userId)->where('resources.code', $code)
            ->lockForUpdate()->first(['balances.id', 'balances.quantity', 'balances.capacity']);

        if (! $balance) {
            throw new \InvalidArgumentException('Unknown game resource: '.$code);
        }

        return $balance;
    }

    private function positiveAmount(float $amount): float
    {
        if (! is_finite($amount) || $amount <= 0) {
            throw new \InvalidArgumentException('Resource amount must be greater than zero.');
        }

        return round($amount, 3);
    }
}
