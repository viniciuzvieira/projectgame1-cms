<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CharacterSpriteSetPart extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'color_ids' => 'array',
        'figure_set_id' => 'integer',
        'sort_order' => 'integer',
    ];

    public function spriteSet(): BelongsTo
    {
        return $this->belongsTo(CharacterSpriteSet::class, 'character_sprite_set_id');
    }

    public function figureString(): string
    {
        $figure = sprintf('%s-%s', $this->figure_type, $this->figure_set_id);

        if (is_array($this->color_ids) && count($this->color_ids)) {
            $figure .= '-'.implode('-', $this->color_ids);
        }

        return $figure;
    }
}
