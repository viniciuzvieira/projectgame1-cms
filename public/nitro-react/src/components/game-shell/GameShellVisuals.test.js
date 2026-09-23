import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GameIcon } from './GameIcon';
import { GameResourcesView } from './GameResourcesView';
import { ANDROID_SKILLS } from './GameSkillsView';
import { useGameProfile } from './GameProfile';
import { RESOURCE_CELL, ResourceBarArtwork, resourceBarLayout } from './ResourceCapacityBar';

jest.mock('../../api', () => ({}));
jest.mock('../../common', () => ({}));
jest.mock('./GameLocale', () => ({ useGameLocale: () => ({ t: text => text, locale: 'pt' }) }));
jest.mock('./GameProfile', () => ({ useGameProfile: jest.fn() }));
beforeEach(() => {
    useGameProfile.mockReturnValue({
        resources: [
            { code: 'data', quantity: '32', capacity: '100', unit: 'MB' },
            { code: 'oil', quantity: '50', capacity: '200', unit: 'L' },
            { code: 'iron', quantity: '75', capacity: '150', unit: 'kg' }
        ], skills: [], loaded: true, error: true, resourcesError: false
    });
});

test('collection and deck actions share the isometric folder without rotated artwork', () => {
    const folder = renderToStaticMarkup(createElement(GameIcon, { name: 'folder' }));
    for(const name of ['collection', 'decks', 'add', 'manage', 'create']) {
        expect(renderToStaticMarkup(createElement(GameIcon, { name }))).toBe(folder);
    }
    expect(folder).toContain('viewBox="0 0 48 48"');
    expect(folder).toContain('shape-rendering="crispEdges"');
    expect(folder).not.toContain('transform=');
    expect(renderToStaticMarkup(createElement(GameIcon, { name: 'cards' }))).toContain('viewBox="0 0 32 32"');
});

test('shop and marketplace reuse the pixel cart while trash uses full desktop artwork', () => {
    const shop = renderToStaticMarkup(createElement(GameIcon, { name: 'shop' }));
    const market = renderToStaticMarkup(createElement(GameIcon, { name: 'market' }));
    expect(shop).toBe(market);
    expect(shop).toContain('viewBox="0 0 32 32"');
    const trash = renderToStaticMarkup(createElement(GameIcon, { name: 'trash' }));
    expect(trash).toContain('game-trash-icon');
    expect(trash).toContain('viewBox="0 0 48 48"');
});

test('all existing Android branches advance from left to right with space for labels', () => {
    expect(ANDROID_SKILLS).toHaveLength(13);
    expect(new Set(ANDROID_SKILLS.map(skill => skill.code)).size).toBe(13);
    expect(ANDROID_SKILLS.filter(skill => !skill.parents.length).map(skill => skill.code)).toEqual(['android.core']);
    expect(ANDROID_SKILLS.flatMap(skill => skill.parents)).toHaveLength(15);
    for(const skill of ANDROID_SKILLS) {
        expect(skill.x).toBeGreaterThan(79);
        expect(skill.x).toBeLessThan(960 - 79);
        expect(skill.y).toBeGreaterThanOrEqual(24);
        expect(skill.y).toBeLessThan(530 - 55);
        for(const code of skill.parents) {
            const parent = ANDROID_SKILLS.find(node => node.code === code);
            expect(parent).toBeDefined();
            expect(parent.x).toBeLessThan(skill.x);
        }
    }
});

test('resource HUD keeps labels, quantities and units without a decorative title', () => {
    const holder = document.createElement('div');
    holder.innerHTML = renderToStaticMarkup(createElement(GameResourcesView));
    expect(holder.querySelector('.resource-hud-cap')).toBeNull();
    expect(holder.textContent).not.toContain('CH / RESOURCES');
    expect(holder.querySelector('aside').getAttribute('aria-label')).toBeTruthy();
    expect(holder.querySelectorAll('.resource-meter')).toHaveLength(3);
    expect(holder.querySelectorAll('.resource-capacity-bar')).toHaveLength(3);
    expect(holder.querySelector('.resource-retry')).toBeNull();
    expect(holder.querySelector('.resource-data .resource-value').textContent).toBe('32/100MB');
    expect(holder.querySelector('.resource-oil .resource-value').textContent).toBe('50/200L');
    expect(holder.querySelector('.resource-iron .resource-value').textContent).toBe('75/150kg');
    expect(holder.querySelector('.resource-data [role="meter"]').getAttribute('aria-valuenow')).toBe('32');
});

test('resource HUD exposes the initial fetch as a busy meter instead of empty progress', () => {
    useGameProfile.mockReturnValue({ resources: [], skills: [], loaded: false, error: false, resourcesError: false });
    const holder = document.createElement('div');
    holder.innerHTML = renderToStaticMarkup(createElement(GameResourcesView));
    const meters = [...holder.querySelectorAll('[role="meter"]')];
    expect(meters).toHaveLength(3);
    for(const meter of meters) {
        expect(meter.getAttribute('aria-busy')).toBe('true');
        expect(meter.hasAttribute('aria-valuenow')).toBe(false);
    }
});

test.each([
    [0, 100, 0], [5.263, 100, 0], [5.264, 100, 1],
    [32, 100, 6], [80, 100, 15], [54, 100, 10],
    [4.999, 95, 0], [5, 95, 1], [5.001, 95, 1],
    [9.999, 95, 1], [10, 95, 2], [10.001, 95, 2],
    [99.999, 100, 18], [100, 100, 19], [150, 100, 19],
    [32, 200, 3], [10, 0, 0], [-1, 100, 0],
    [0.014, 0.019, 14], [0.015, 0.019, 15], [0.016, 0.019, 16],
    [0.008, 0.057, 2], [0.009, 0.057, 3], [0.01, 0.057, 3]
])('resource %s/%s shows exactly %s whole segments without resizing the grid', (quantity, capacity, filled) => {
    const holder = document.createElement('div');
    holder.innerHTML = renderToStaticMarkup(createElement(ResourceBarArtwork, { width: 212.8, quantity, capacity }));
    const meter = holder.querySelector('.resource-capacity-art');
    expect(meter.style.width).toBe('212px');
    const segments = [...meter.querySelectorAll('.resource-capacity-fill > span')];
    expect(segments).toHaveLength(19);
    expect(segments.filter(segment => segment.classList.contains('is-filled'))).toHaveLength(filled);
    expect(segments.map(segment => segment.classList.contains('is-filled'))).toEqual(Array.from({ length: 19 }, (_, index) => index < filled));
    for(const segment of segments) {
        expect(segment.style.width).toBe('7px');
        expect(segment.style.height).toBe('12px');
    }
});

test.each([0, 17, 69.33, 105.67, 147.875, 202.8, 216])('native sprite cells and gaps stay on integer pixels at width %s', width => {
    const layout = resourceBarLayout(width, 100, 100);
    expect(Number.isInteger(layout.width)).toBe(true);
    expect(layout.left).toBe(7);
    expect(layout.filled).toBe(layout.count);
    for(let index = 0; index < layout.count; index++) {
        const left = layout.left + index * (RESOURCE_CELL.width + RESOURCE_CELL.gap);
        expect(Number.isInteger(left)).toBe(true);
        expect(left + RESOURCE_CELL.width).toBeLessThanOrEqual(layout.width - RESOURCE_CELL.inset);
    }
});

test('resource loading crosses the unchanged track with exactly three whole cells', () => {
    const holder = document.createElement('div');
    holder.innerHTML = renderToStaticMarkup(createElement(ResourceBarArtwork, { width: 212.8, quantity: 0, capacity: 0, loading: true }));
    expect(holder.querySelectorAll('.resource-capacity-fill > .is-filled')).toHaveLength(0);
    const loader = holder.querySelector('.resource-capacity-loader');
    const cells = [...loader.children];
    expect(cells).toHaveLength(3);
    expect(loader.style.gap).toBe('3px');
    for(const cell of cells) {
        expect(cell.style.width).toBe('7px');
        expect(cell.style.height).toBe('12px');
    }
});

test('about has a visible dot and selling uses a bounded pixel coin', () => {
    const holder = document.createElement('div');
    holder.innerHTML = renderToStaticMarkup(createElement(GameIcon, { name: 'about' }));
    expect(holder.querySelector('path').getAttribute('d')).toContain('M14 8h4v4h-4Z');
    const sell = renderToStaticMarkup(createElement(GameIcon, { name: 'sell' }));
    expect(sell).toContain('viewBox="0 0 32 32"');
    expect(sell).not.toContain('S4 15');
});
