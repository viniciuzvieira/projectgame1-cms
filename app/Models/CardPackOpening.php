<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CardPackOpening extends Model
{
    protected $guarded = ['id'];

    protected $casts = ['reward_snapshot' => 'array', 'card_pack_id' => 'integer', 'quantity_before' => 'integer', 'quantity_after' => 'integer'];
}
