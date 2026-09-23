import { useSyncExternalStore } from 'react';

export type GameLocale = 'pt' | 'en' | 'es';
export type GameTheme = 'light' | 'dark' | 'purple';
export interface GamePreferences { theme: GameTheme; locale: GameLocale; terminal_key: string }
export interface GameResource { code: 'data' | 'oil' | 'iron'; unit: string; quantity: string; capacity: string }
interface GameProfile
{
    preferences: GamePreferences;
    resources: GameResource[];
    skills: { skill_code: string; rank: number }[];
    user_id?: number;
    csrf_token?: string;
    loaded: boolean;
    saving: boolean;
    error: boolean;
    resourcesError: boolean;
}
const defaults: GamePreferences = { theme: 'dark', locale: 'pt', terminal_key: 'KeyC' };
const cacheKey = 'cyber-game-preferences';
const cachedPreferences = (): GamePreferences =>
{
    try
    {
        const cached = JSON.parse(localStorage.getItem(cacheKey));
        return {
            theme: ['light', 'dark', 'purple'].includes(cached?.theme) ? cached.theme : defaults.theme,
            locale: ['pt', 'en', 'es'].includes(cached?.locale) ? cached.locale : defaults.locale,
            terminal_key: typeof cached?.terminal_key === 'string' ? cached.terminal_key : defaults.terminal_key
        };
    }
    catch { return defaults; }
};
const listeners = new Set<() => void>();
let state: GameProfile = { preferences: cachedPreferences(), resources: [], skills: [], loaded: false, saving: false, error: false, resourcesError: false };
let pending: Promise<void> = null;
document.documentElement.dataset.gameTheme = state.preferences.theme;
document.documentElement.lang = state.preferences.locale;
const publish = (next: GameProfile) =>
{
    state = next;
    document.documentElement.dataset.gameTheme = state.preferences.theme;
    document.documentElement.lang = state.preferences.locale;
    try { localStorage.setItem(cacheKey, JSON.stringify(state.preferences)); } catch { /* Storage can be disabled. */ }
    listeners.forEach(listener => listener());
};
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const useGameProfile = () => useSyncExternalStore(subscribe, () => state);
export const getGamePreferences = () => state.preferences;
export const validTerminalKey = (code: string) => /^(Key[BCE-Z]|Digit[0-9])$/.test(code) && !['KeyW', 'KeyS', 'KeyD', 'KeyA'].includes(code) || ['Backquote', 'BracketLeft', 'BracketRight', 'Semicolon', 'Quote', 'Comma', 'Period', 'Slash', 'Backslash', 'Minus', 'Equal'].includes(code);
export const keyLabel = (code: string) => ({ Backquote: '`', BracketLeft: '[', BracketRight: ']', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backslash: '\\', Minus: '-', Equal: '=' }[code] || code.replace(/^(Key|Digit)/, ''));

export const loadGameProfile = (): Promise<void> =>
{
    if(pending) return pending;
    if(state.saving) return Promise.resolve();
    pending = (async () =>
    {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 20000);
        try
        {
            const response = await fetch('/api/game/profile', { credentials: 'same-origin', cache: 'no-store', signal: controller.signal, headers: { Accept: 'application/json' }});
            if(!response.ok || response.redirected) throw new Error('Profile unavailable');
            const profile = await response.json();
            publish({ ...state, ...profile, loaded: true, error: false, resourcesError: false });
        }
        catch { publish({ ...state, error: true, resourcesError: true }); }
        finally { window.clearTimeout(timeout); pending = null; }
    })();
    return pending;
};

export const saveGamePreferences = async (changes: Partial<GamePreferences>): Promise<boolean> =>
{
    if(state.saving || !state.loaded) return false;
    if(pending) await pending;
    if(state.saving) return false;
    const previous = state.preferences;
    publish({ ...state, preferences: { ...previous, ...changes }, saving: true, error: false });
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    try
    {
        const response = await fetch('/api/game/preferences', {
            // IIS accepts POST; Laravel restores PATCH before routing and CSRF checks.
            method: 'POST', credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
            headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-TOKEN': state.csrf_token || '' },
            body: JSON.stringify({ ...changes, _method: 'PATCH' })
        });
        if(!response.ok || response.redirected) throw new Error('Preferences unavailable');
        const profile = await response.json();
        publish({ ...state, ...profile, saving: false, error: false, resourcesError: false });
        return true;
    }
    catch { publish({ ...state, preferences: previous, saving: false, error: true }); return false; }
    finally { window.clearTimeout(timeout); }
};
