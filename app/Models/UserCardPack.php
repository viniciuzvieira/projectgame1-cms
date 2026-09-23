<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserCardPack extends Model
{
    protected $guarded = ['id'];

    protected $casts = ['quantity' => 'integer'];

    public function pack(): BelongsTo
    {
        return $this->belongsTo(CardPack::class, 'card_pack_id');
    }
}
