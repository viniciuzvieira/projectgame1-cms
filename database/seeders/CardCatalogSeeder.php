<?php

namespace Database\Seeders;

use App\Models\CardDefinition;
use App\Models\CardPack;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CardCatalogSeeder extends Seeder
{
    public function run()
    {
        DB::transaction(function () {
            $figure = 'hr-100.hd-180-7.ch-215-66.lg-270-79.sh-305-62.ha-1002-70.wa-2007';
            $sets = [
                ['founders', 'Edicao Fundadores', 'O inicio da sua colecao. Herois que escreveram os primeiros capitulos.', 'SERIE 01', [
                    ['cyber-hero', 'Cyber Hero', 'LENDARIO', 98, 10],
                    ['forge-guardian', 'Guardiao da Forja', 'RARO', 82, 30],
                    ['spark-runner', 'Corredor Faisca', 'COMUM', 65, 60],
                ]],
                ['arctic', 'Circuito Artico', 'Tecnologia glacial e exploradores das fronteiras digitais.', 'SERIE 02', [
                    ['arctic-sentinel', 'Sentinela Artico', 'LENDARIO', 96, 10],
                    ['neon-ranger', 'Patrulheiro Neon', 'RARO', 84, 30],
                    ['frost-scout', 'Batedor Glacial', 'COMUM', 68, 60],
                ]],
            ];

            foreach ($sets as $index => [$code, $name, $description, $series, $cards]) {
                $pack = CardPack::query()->updateOrCreate(['code' => $code], [
                    'name' => $name, 'description' => $description, 'design_key' => $code,
                    'is_active' => true, 'sort_order' => ($index + 1) * 10,
                ]);
                $rewards = [];
                foreach ($cards as [$cardCode, $cardName, $rarity, $power, $weight]) {
                    $card = CardDefinition::query()->updateOrCreate(['code' => $cardCode], [
                        'name' => $cardName, 'description' => $description, 'rarity' => $rarity,
                        'series' => $series, 'design_key' => $code, 'figure' => $figure,
                        'power' => $power, 'is_active' => true,
                    ]);
                    $rewards[$card->id] = ['weight' => $weight];
                }
                $pack->rewards()->sync($rewards);
            }
        });
    }
}
