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
                ['founders', 'Edição Fundadores', 'O início da sua coleção. Heróis que escreveram os primeiros capítulos.', 'SÉRIE 01', [
                    ['cyber-hero', 'Cyber Hero', 'LENDÁRIO', 98, 10],
                    ['forge-guardian', 'Guardião da Forja', 'RARO', 82, 30],
                    ['spark-runner', 'Corredor Faísca', 'COMUM', 65, 60],
                ]],
                ['arctic', 'Circuito Ártico', 'Tecnologia glacial e exploradores das fronteiras digitais.', 'SÉRIE 02', [
                    ['arctic-sentinel', 'Sentinela Ártico', 'LENDÁRIO', 96, 10],
                    ['neon-ranger', 'Patrulheiro Neon', 'RARO', 84, 30],
                    ['frost-scout', 'Batedor Glacial', 'COMUM', 68, 60],
                ]],
                ['arcade', 'Arcade Sintético', 'Relíquias portáteis, circuitos neon e guardiões de uma nova geração.', 'SÉRIE 03', [
                    ['pixel-sovereign', 'Soberano Pixel', 'LENDÁRIO', 97, 10],
                    ['byte-mechanic', 'Mecânico Byte', 'RARO', 83, 30],
                    ['pocket-runner', 'Corredor Pocket', 'COMUM', 67, 60],
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
