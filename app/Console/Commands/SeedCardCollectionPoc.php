<?php

namespace App\Console\Commands;

use App\Models\CardPack;
use App\Models\User;
use App\Models\UserCardPack;
use Database\Seeders\CardCatalogSeeder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class SeedCardCollectionPoc extends Command
{
    protected $signature = 'cards:seed-poc {username=teste123}';

    protected $description = 'Seed the POC catalogs and grant 50 of each pack once to the selected player.';

    public function handle(): int
    {
        $user = User::query()->where('username', $this->argument('username'))->first();
        if (! $user) {
            $this->error('Usuario nao encontrado. Nenhum saldo foi alterado.');

            return self::FAILURE;
        }

        app(CardCatalogSeeder::class)->run();
        DB::transaction(function () use ($user) {
            User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();
            foreach (CardPack::query()->whereIn('code', ['founders', 'arctic', 'arcade'])->get() as $pack) {
                $grant = ['user_id' => $user->id, 'card_pack_id' => $pack->id, 'grant_key' => 'collection-poc-2026-09-15'];
                if (DB::table('user_card_pack_grants')->where($grant)->exists()) {
                    continue;
                }
                DB::table('user_card_pack_grants')->insert($grant + ['quantity' => 50, 'created_at' => now(), 'updated_at' => now()]);
                UserCardPack::query()->firstOrCreate(
                    ['user_id' => $user->id, 'card_pack_id' => $pack->id], ['quantity' => 0]
                )->increment('quantity', 50);
            }
        });

        $this->table(['Usuario', 'Pacote', 'Quantidade atual'], UserCardPack::query()
            ->with('pack')->where('user_id', $user->id)->get()
            ->map(fn ($stock) => [$user->username, $stock->pack->name, $stock->quantity])->all());
        $this->info('Carga concluida. Reexecutar nao duplica nem restaura pacotes ja abertos.');

        return self::SUCCESS;
    }
}
