<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CharacterSpriteSet extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'removed_figure_types' => 'array',
    ];

    public function parts(): HasMany
    {
        return $this->hasMany(CharacterSpriteSetPart::class)
            ->orderBy('sort_order')
            ->orderBy('id');
    }

    public function races(): HasMany
    {
        return $this->hasMany(CharacterRace::class, 'default_sprite_set_id');
    }

    public function figureString(): string
    {
        return $this->parts
            ->map(fn (CharacterSpriteSetPart $part) => $part->figureString())
            ->implode('.');
    }
}
