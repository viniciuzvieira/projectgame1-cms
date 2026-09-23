<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class CardPack extends Model
{
    protected $guarded = ['id'];

    protected $casts = ['is_active' => 'boolean'];

    public function rewards(): BelongsToMany
    {
        return $this->belongsToMany(CardDefinition::class, 'card_pack_rewards')
            ->withPivot('weight')->withTimestamps();
    }
}
