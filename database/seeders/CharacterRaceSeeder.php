<?php

namespace Database\Seeders;

use App\Models\CharacterRace;
use App\Models\CharacterSpriteSet;
use Illuminate\Database\Seeder;

class CharacterRaceSeeder extends Seeder
{
    public function run()
    {
        $fireDemon = CharacterSpriteSet::query()->updateOrCreate(
            ['code' => 'fire_demon'],
            [
                'name' => 'Fire Demon',
                'description' => 'Temporary sprite set used by the Android race.',
                'removed_figure_types' => ['wa', 'hr', 'ch', 'sh'],
            ]
        );

        $parts = [
            [
                'slot' => 'legs',
                'figure_type' => 'lg',
                'figure_set_id' => 990001576,
                'nitro_file' => 'trousers_U_firedemon.nitro',
                'color_ids' => null,
                'sort_order' => 10,
            ],
            [
                'slot' => 'torso_arms',
                'figure_type' => 'cc',
                'figure_set_id' => 990001570,
                'nitro_file' => 'jacket_U_firedemon.nitro',
                'color_ids' => null,
                'sort_order' => 20,
            ],
            [
                'slot' => 'head',
                'figure_type' => 'ha',
                'figure_set_id' => 990001573,
                'nitro_file' => 'hat_U_firedemon.nitro',
                'color_ids' => null,
                'sort_order' => 30,
            ],
        ];

        foreach ($parts as $part) {
            $fireDemon->parts()->updateOrCreate(
                ['figure_type' => $part['figure_type']],
                $part
            );
        }

        $fireDemon->parts()
            ->whereNotIn('figure_type', collect($parts)->pluck('figure_type'))
            ->delete();

        $races = [
            [
                'code' => 'android',
                'name' => 'Android',
                'description' => 'Corpos sinteticos com foco em precisao e resistencia.',
                'default_sprite_set_id' => $fireDemon->id,
                'sort_order' => 10,
            ],
            [
                'code' => 'cyclops',
                'name' => 'Ciclope',
                'description' => 'Visao singular e presenca intimidadora em combate e exploracao.',
                'default_sprite_set_id' => null,
                'sort_order' => 20,
            ],
            [
                'code' => 'bionic',
                'name' => 'Bionic',
                'description' => 'Mistura de carne e maquina, com adaptabilidade elevada.',
                'default_sprite_set_id' => null,
                'sort_order' => 30,
            ],
            [
                'code' => 'basalt',
                'name' => 'Basalts',
                'description' => 'Estrutura pesada e robusta, otima para suportar dano.',
                'default_sprite_set_id' => null,
                'sort_order' => 40,
            ],
            [
                'code' => 'hammer',
                'name' => 'Hammer',
                'description' => 'Perfil agressivo e tecnico, ideal para avancar ofensivamente.',
                'default_sprite_set_id' => null,
                'sort_order' => 50,
            ],
        ];

        foreach ($races as $race) {
            CharacterRace::query()->updateOrCreate(
                ['code' => $race['code']],
                $race + ['is_active' => true]
            );
        }
    }
}
