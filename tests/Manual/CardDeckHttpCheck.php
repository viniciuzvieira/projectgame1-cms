<?php

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

// php tests/Manual/CardDeckHttpCheck.php teste123
// Exercises IIS + Laravel using a disposable deck, never spending owned cards.
require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$user = App\Models\User::where('username', $argv[1] ?? '')->firstOrFail();
$session = app('session')->driver();
$session->start();
$session->put(Illuminate\Support\Facades\Auth::guard('web')->getName(), $user->id);
$session->save();
$cookieName = config('session.cookie');
$cookie = app('encrypter')->encrypt(Illuminate\Cookie\CookieValuePrefix::create($cookieName, app('encrypter')->getKey()).$session->getId(), false);
$client = fn ($csrf = true) => Illuminate\Support\Facades\Http::withHeaders([
    'Accept' => 'application/json', 'Cookie' => $cookieName.'='.rawurlencode($cookie),
    'X-CSRF-TOKEN' => $csrf ? $session->token() : '',
])->withoutRedirecting()->timeout(20);
$base = 'http://localhost/api/game/collection';
$name = 'HTTP check '.bin2hex(random_bytes(8));
$deckId = null;
$check = function ($condition, $message) { if (!$condition) throw new RuntimeException($message); echo $message." OK\n"; };
try {
    $initial = $client()->get($base);
    $check($initial->status() === 200, 'Authenticated collection through IIS');
    $cards = $initial->json('cards');
    if (!$cards) throw new RuntimeException('This test requires at least one owned card.');
    $cardId = $cards[0]['id'];
    $created = $client()->post($base.'/decks', ['name' => $name]);
    $check($created->status() === 200, 'Create disposable deck');
    $deckId = $created->json('deck_id');
    $duplicate = $client()->post($base.'/decks', ['name' => $name]);
    $check($duplicate->status() === 422, 'Reject duplicate active deck name');
    $path = $base.'/decks/'.$deckId;
    $added = $client()->post($path.'/cards/'.$cardId, ['_method' => 'PUT', 'quantity' => 1]);
    $check($added->status() === 200, 'Add card using POST + PUT override');
    $reload = $client()->get($base);
    $deck = collect($reload->json('decks'))->firstWhere('id', $deckId);
    $check(($deck['cards'][0]['id'] ?? null) === $cardId && $deck['cards'][0]['quantity'] === 1, 'Membership persists after reloading');
    $check($reload->json('cards') === $cards, 'Owned collection unchanged');
    $rejected = $client(false)->post($path.'/cards/'.$cardId, ['_method' => 'PUT', 'quantity' => 0]);
    $check($rejected->status() === 419, 'CSRF protection retained');
    $renamed = $client()->post($path, ['_method' => 'PATCH', 'name' => $name.' edited']);
    $check($renamed->status() === 200, 'Rename using PATCH override');
    $removed = $client()->post($path.'/cards/'.$cardId, ['_method' => 'PUT', 'quantity' => 0]);
    $check($removed->status() === 200, 'Remove membership using PUT override');
    $deleted = $client()->post($path, ['_method' => 'DELETE']);
    $check($deleted->status() === 200 && collect($deleted->json('trashed_decks'))->contains('id', $deckId), 'Recycle disposable deck using DELETE override');
    $duplicate = $client()->post($base.'/decks', ['name' => $name.' edited']);
    $check($duplicate->status() === 422, 'Reject duplicate recycled deck name');
    $restored = $client()->post($path.'/restore', ['_method' => 'PUT']);
    $check($restored->status() === 200 && collect($restored->json('decks'))->contains('id', $deckId), 'Restore disposable deck using PUT override');
    $client()->post($path, ['_method' => 'DELETE']);
    $final = $client()->get($base);
    $check($final->json('cards') === $cards && $final->json('decks') === $initial->json('decks'), 'Original cards and decks preserved');
} finally {
    $leftover = App\Models\UserCardDeck::withTrashed()->where('user_id', $user->id)->whereIn('name', [$name, $name.' edited'])->first();
    if ($leftover) $leftover->forceDelete();
    $session->getHandler()->destroy($session->getId());
}
