<?php

namespace Tests\Unit;

use App\Models\CharacterSpriteSet;
use App\Models\CharacterSpriteSetPart;
use App\Services\CharacterSpriteSetLookService;
use Illuminate\Support\Collection;
use PHPUnit\Framework\TestCase;

class CharacterSpriteSetLookServiceTest extends TestCase
{
    public function test_it_keeps_the_base_head_for_sprite_layer_hiding(): void
    {
        $spriteSet = new CharacterSpriteSet();
        $spriteSet->removed_figure_types = ['wa', 'hr', 'ch', 'sh'];
        $spriteSet->setRelation('parts', new Collection([
            $this->part('lg', 990001576),
            $this->part('cc', 990001570),
            $this->part('ha', 990001573),
        ]));

        $look = (new CharacterSpriteSetLookService())->apply(
            'hr-100.hd-180-7.ch-215-66.lg-270-79.sh-305-62.ha-1002-70.wa-2007',
            $spriteSet
        );

        $this->assertSame(
            'hd-180-7.lg-990001576.ha-990001573.cc-990001570',
            $look
        );
    }

    private function part(string $figureType, int $figureSetId): CharacterSpriteSetPart
    {
        $part = new CharacterSpriteSetPart();
        $part->figure_type = $figureType;
        $part->figure_set_id = $figureSetId;

        return $part;
    }
}
