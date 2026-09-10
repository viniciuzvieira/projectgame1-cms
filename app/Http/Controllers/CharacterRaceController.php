<?php

namespace App\Http\Controllers;

use App\Models\CharacterRace;
use App\Models\CharacterSpriteSet;
use App\Models\CharacterSpriteSetPart;
use Illuminate\Http\JsonResponse;

class CharacterRaceController extends Controller
{
    public function index(): JsonResponse
    {
        $races = CharacterRace::query()
            ->active()
            ->with('defaultSpriteSet.parts')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(function (CharacterRace $race) {
                $spriteSet = $race->defaultSpriteSet;

                return [
                    'code' => $race->code,
                    'name' => $race->name,
                    'description' => $race->description,
                    'look' => $spriteSet ? $spriteSet->figureString() : '',
                    'spriteSet' => $spriteSet ? $this->mapSpriteSet($spriteSet) : null,
                ];
            });

        return response()->json(['data' => $races]);
    }

    private function mapSpriteSet(CharacterSpriteSet $spriteSet): array
    {
        return [
            'code' => $spriteSet->code,
            'name' => $spriteSet->name,
            'removedFigureTypes' => $spriteSet->removed_figure_types ?? [],
            'parts' => $spriteSet->parts
                ->map(fn (CharacterSpriteSetPart $part) => [
                    'slot' => $part->slot,
                    'figureType' => $part->figure_type,
                    'figureSetId' => $part->figure_set_id,
                    'nitroFile' => $part->nitro_file,
                    'colorIds' => $part->color_ids ?? [],
                ])
                ->values(),
        ];
    }
}
