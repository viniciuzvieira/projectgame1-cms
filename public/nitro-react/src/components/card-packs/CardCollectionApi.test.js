jest.mock('../game-shell/GameLocale', () => ({ t: text => text }));
const response = data => ({ ok: true, redirected: false, headers: { get: () => 'application/json' }, json: async () => data });

beforeEach(() => {
    jest.resetModules();
    global.fetch = jest.fn().mockResolvedValueOnce(response({ packs: [], cards: [], decks: [], csrf_token: 'deck-token' }));
});

test.each([
    ['createCardDeck', ['Test'], '', undefined, { name: 'Test' }],
    ['renameCardDeck', [7, 'Renamed'], '/7', 'PATCH', { name: 'Renamed' }],
    ['deleteCardDeck', [7], '/7', 'DELETE', {}],
    ['restoreCardDeck', [7], '/7/restore', 'PUT', {}],
    ['makePrimaryCardDeck', [7], '/7/primary', 'PUT', {}],
    ['setCardDeckQuantity', [7, 3, 1], '/7/cards/3', 'PUT', { quantity: 1 }],
    ['setCardDeckQuantity', [7, 3, 0], '/7/cards/3', 'PUT', { quantity: 0 }]
])('%s uses an IIS-compatible POST with authenticated Laravel method override', async (operation, args, path, method, body) => {
    const api = require('./CardCollectionApi');
    fetch.mockResolvedValueOnce(response({ decks: [] }));
    await api[operation](...args);
    expect(fetch.mock.calls[0][0]).toBe('/api/game/collection');
    const [url, options] = fetch.mock.calls[1];
    expect(url).toBe('/api/game/collection/decks' + path);
    expect(options.method).toBe('POST');
    expect(options.credentials).toBe('same-origin');
    expect(options.headers['X-CSRF-TOKEN']).toBe('deck-token');
    expect(JSON.parse(options.body)).toEqual({ ...body, ...(method ? { _method: method } : {}) });
});

test('a rejected membership is surfaced instead of being treated as a successful addition', async () => {
    const api = require('./CardCollectionApi');
    fetch.mockResolvedValueOnce({ ...response({ errors: { quantity: ['Not enough copies'] } }), ok: false, status: 422 });
    await expect(api.setCardDeckQuantity(7, 3, 99)).rejects.toMatchObject({ status: 422, message: 'Not enough copies' });
});
