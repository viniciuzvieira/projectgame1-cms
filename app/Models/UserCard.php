<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserCard extends Model
{
    protected $guarded = ['id'];

    protected $casts = ['quantity' => 'integer'];

    public function card(): BelongsTo
    {
        return $this->belongsTo(CardDefinition::class, 'card_definition_id');
    }
}
