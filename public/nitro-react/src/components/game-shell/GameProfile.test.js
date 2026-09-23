const profileData = () => ({
    user_id: 7, preferences: { theme: 'dark', locale: 'pt', terminal_key: 'KeyC' },
    resources: [{ code: 'data', unit: 'MB', quantity: '12.125', capacity: '100.000' }], skills: [], csrf_token: 'test-token'
});
const response = data => ({ ok: true, redirected: false, json: async () => data });
const snapshot = () => {
    const hook = jest.spyOn(require('react'), 'useSyncExternalStore').mockImplementation((subscribe, read) => read());
    try { return require('./GameProfile').useGameProfile(); }
    finally { hook.mockRestore(); }
};

beforeEach(() => {
    jest.resetModules();
    localStorage.clear();
    global.fetch = jest.fn();
});

test('movement and browser keys cannot be assigned to the terminal', () => {
    const { validTerminalKey, keyLabel } = require('./GameProfile');
    for(const key of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Escape', 'F5', 'ControlLeft', '']) expect(validTerminalKey(key)).toBe(false);
    for(const key of ['KeyC', 'KeyT', 'Digit1', 'Slash']) expect(validTerminalKey(key)).toBe(true);
    expect(keyLabel('KeyT')).toBe('T');
    expect(keyLabel('Slash')).toBe('/');
});

test('preferences use authenticated requests with CSRF and localize legacy accents', async () => {
    const profile = require('./GameProfile');
    const { t } = require('./GameLocale');
    fetch.mockResolvedValueOnce(response(profileData()));
    await profile.loadGameProfile();
    expect(t('Minha colecao')).toBe('Minha coleção');
    const next = { ...profileData(), preferences: { theme: 'light', locale: 'es', terminal_key: 'KeyT' } };
    fetch.mockResolvedValueOnce(response(next));
    expect(await profile.saveGamePreferences(next.preferences)).toBe(true);
    expect(fetch.mock.calls[1][1].headers['X-CSRF-TOKEN']).toBe('test-token');
    expect(fetch.mock.calls[1][1].credentials).toBe('same-origin');
    expect(fetch.mock.calls[1][1].method).toBe('POST');
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ ...next.preferences, _method: 'PATCH' });
    expect(document.documentElement.dataset.gameTheme).toBe('light');
    expect(t('Minha colecao')).toBe('Mi colección');
    expect(t('{count} disponíveis', { count: 5 })).toBe('5 disponibles');
    expect(JSON.parse(localStorage.getItem('cyber-game-preferences')).terminal_key).toBe('KeyT');
});

test('failed preference writes roll back theme and terminal shortcut', async () => {
    const profile = require('./GameProfile');
    fetch.mockResolvedValueOnce(response(profileData()));
    await profile.loadGameProfile();
    fetch.mockResolvedValueOnce({ ok: false, status: 419 });
    expect(await profile.saveGamePreferences({ theme: 'light', terminal_key: 'KeyT' })).toBe(false);
    expect(profile.getGamePreferences()).toEqual(profileData().preferences);
    expect(document.documentElement.dataset.gameTheme).toBe('dark');
    expect(JSON.parse(localStorage.getItem('cyber-game-preferences')).terminal_key).toBe('KeyC');
    expect(snapshot().error).toBe(true);
    expect(snapshot().resourcesError).toBe(false);
    expect(snapshot().resources).toEqual(profileData().resources);
});

test('resource failures are reported independently and clear after a successful refresh', async () => {
    const profile = require('./GameProfile');
    fetch.mockRejectedValueOnce(new Error('Offline'));
    await profile.loadGameProfile();
    expect(snapshot().resourcesError).toBe(true);
    fetch.mockResolvedValueOnce(response(profileData()));
    await profile.loadGameProfile();
    expect(snapshot().resourcesError).toBe(false);
});

test.each(['light', 'purple', 'dark'])('the %s theme survives a profile reload', async theme => {
    const profile = require('./GameProfile');
    fetch.mockResolvedValueOnce(response(profileData()));
    await profile.loadGameProfile();
    const saved = { ...profileData(), preferences: { ...profileData().preferences, theme } };
    fetch.mockResolvedValueOnce(response(saved));
    expect(await profile.saveGamePreferences({ theme })).toBe(true);
    fetch.mockResolvedValueOnce(response(saved));
    await profile.loadGameProfile();
    expect(document.documentElement.dataset.gameTheme).toBe(theme);
    expect(snapshot().resourcesError).toBe(false);
});

test('concurrent loads are coalesced and writes are serialized', async () => {
    const profile = require('./GameProfile');
    let complete;
    fetch.mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
    const first = profile.loadGameProfile();
    const second = profile.loadGameProfile();
    expect(fetch).toHaveBeenCalledTimes(1);
    complete(response(profileData()));
    await Promise.all([first, second]);
    fetch.mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
    const save = profile.saveGamePreferences({ theme: 'light' });
    expect(await profile.saveGamePreferences({ terminal_key: 'KeyT' })).toBe(false);
    complete(response({ ...profileData(), preferences: { ...profileData().preferences, theme: 'light' } }));
    expect(await save).toBe(true);
});
