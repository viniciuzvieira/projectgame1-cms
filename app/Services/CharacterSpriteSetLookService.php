<?php

namespace App\Services;

use App\Models\CharacterSpriteSet;

class CharacterSpriteSetLookService
{
    public function apply(string $baseLook, CharacterSpriteSet $spriteSet): string
    {
        $figureParts = [];
        $figureOrder = [];

        foreach (array_filter(explode('.', $baseLook)) as $figurePart) {
            $figureType = strtok($figurePart, '-');

            if (! $figureType || ! preg_match('/^[a-z]{2,4}$/', $figureType)) {
                continue;
            }

            if (! array_key_exists($figureType, $figureParts)) {
                $figureOrder[] = $figureType;
            }

            $figureParts[$figureType] = $figurePart;
        }

        foreach ($spriteSet->removed_figure_types ?? [] as $removedFigureType) {
            unset($figureParts[$removedFigureType]);
            $figureOrder = array_values(array_filter(
                $figureOrder,
                fn (string $figureType) => $figureType !== $removedFigureType
            ));
        }

        foreach ($spriteSet->parts as $spritePart) {
            if (! array_key_exists($spritePart->figure_type, $figureParts)) {
                $figureOrder[] = $spritePart->figure_type;
            }

            $figureParts[$spritePart->figure_type] = $spritePart->figureString();
        }

        return collect($figureOrder)
            ->map(fn (string $figureType) => $figureParts[$figureType])
            ->implode('.');
    }
}
