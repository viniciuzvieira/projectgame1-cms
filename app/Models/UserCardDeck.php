<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class UserCardDeck extends Model
{
    protected $fillable = ['user_id', 'name'];

    public function cards(): BelongsToMany
    {
        return $this->belongsToMany(CardDefinition::class, 'user_card_deck_cards')
            ->withPivot('quantity')->withTimestamps();
    }
}
