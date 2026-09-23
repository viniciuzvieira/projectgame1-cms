import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { CardCollectionView } from './CardCollectionView';
import { loadCardCollection, setCardDeckQuantity } from './CardCollectionApi';
import { openGameContextMenu } from '../game-context-menu/GameContextMenu';

let mockTracker;
jest.mock('../../api', () => ({ AddEventLinkTracker: tracker => { mockTracker = tracker; }, RemoveLinkEventTracker: () => {} }));
jest.mock('../../common', () => {
    const { createElement: h } = require('react');
    return {
        NitroCardView: ({ children, className }) => h('div', { className }, children),
        NitroCardContentView: ({ children }) => h('div', { className: 'content-area' }, children),
        LayoutAvatarImageView: () => null
    };
});
jest.mock('../game-shell/GameLocale', () => ({ t: text => text, useGameLocale: () => ({ t: text => text, locale: 'pt' }) }));
jest.mock('../game-context-menu/GameContextMenu', () => ({ closeGameContextMenu: () => {}, openGameContextMenu: jest.fn() }));
jest.mock('./CardCollectionApi', () => ({ loadCardCollection: jest.fn(), setCardDeckQuantity: jest.fn() }));
jest.mock('./CardPackOpeningView', () => ({ CardPackOpeningView: () => null }));
jest.mock('./CardPackThumbnailView', () => ({ CardPackThumbnailView: () => null }));
jest.mock('./CollectionOrbView', () => ({ CollectionOrbView: () => null }));

let container;
let root;
let decks;
beforeEach(async () => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    decks = [{ id: 1, name: 'teste 1', is_primary: false, cards: [{ id: 1, quantity: 1 }] }, { id: 2, name: 'teste 2', is_primary: false, cards: [] }];
    loadCardCollection.mockResolvedValue({ packs: [], cards: [{ id: 1, name: 'Test card', series: 'Series', rarity: 'Rare', design_key: 'founders', power: 5, quantity: 2 }], decks });
    await act(async () => { root.render(createElement(CardCollectionView)); });
    await act(async () => { mockTracker.linkReceived('card-collection/show'); });
});
afterEach(() => {
    act(() => root.unmount());
    container.remove();
    delete global.IS_REACT_ACT_ENVIRONMENT;
});
const click = async selector => { await act(async () => { container.querySelector(selector).click(); }); };

test('the collection starts at its tabs and every icon precedes its label', () => {
    expect(container.querySelector('.content-area').firstElementChild.className).toContain('collection-browser-tabs');
    expect(container.querySelector('.nitro-card-header')).toBeNull();
    for(const tab of container.querySelectorAll('[role="tab"]')) {
        expect(tab.firstElementChild.classList.contains('game-pixel-icon')).toBe(true);
        expect(tab.children[1].className).toBe('collection-tab-label');
    }
});

test('switching tabs and adding a blank tab retains the address bar and active panel', async () => {
    await click('#collection-tab-decks');
    expect(container.querySelector('[aria-selected="true"]').id).toBe('collection-tab-decks');
    expect(container.querySelector('.collection-address-prefix').textContent).toBe('ch://decks/');
    await click('.collection-new-tab');
    const selected = container.querySelector('[aria-selected="true"]');
    expect(selected.textContent).toContain('Nova aba');
    expect(container.querySelector('[role="tabpanel"]').getAttribute('aria-labelledby')).toBe(selected.id);
    expect(container.querySelector('#collection-search')).not.toBeNull();
    expect(container.querySelectorAll('[role="tab"]')).toHaveLength(5);
});

test('the new-deck plus uses the card-counter badge and still starts inline naming', async () => {
    await click('#collection-tab-decks');
    const badge = container.querySelector('.collection-folder-add');
    expect(badge.classList.contains('collection-folder-count')).toBe(true);
    expect(badge.textContent).toBe('+');
    expect(container.querySelectorAll('.collection-folder-count')).toHaveLength(3);
    expect(container.querySelector('.collection-deck-list').lastElementChild.classList.contains('collection-deck-new-tile')).toBe(true);
    await click('.collection-deck-new-trigger');
    expect(container.querySelector('.collection-deck-inline-name').value).toBe('Novo deck');
});

const cardMenu = async () => {
    await act(async () => { container.querySelector('.card-tile').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true })); });
    return openGameContextMenu.mock.calls[openGameContextMenu.mock.calls.length - 1][0].items.find(item => item.id === 'add').children;
};

test('context menu marks existing memberships and updates after adding a card', async () => {
    await click('#collection-tab-cards');
    let items = await cardMenu();
    expect(items[0].label).toBe('teste 1 (já adicionado)');
    expect(items[0].disabled).toBe(false);
    expect(items[1].label).toBe('teste 2');
    expect(items[items.length - 1].id).toBe('new-deck');
    setCardDeckQuantity.mockResolvedValue({ decks: [decks[0], { ...decks[1], cards: [{ id: 1, quantity: 1 }] }] });
    await act(async () => { items[1].action(); });
    expect(setCardDeckQuantity).toHaveBeenCalledWith(2, 1, 1);
    items = await cardMenu();
    expect(items[1].label).toBe('teste 2 (já adicionado)');
    expect(items[1].disabled).toBe(false);
    setCardDeckQuantity.mockResolvedValue({ decks: [decks[0], { ...decks[1], cards: [{ id: 1, quantity: 2 }] }] });
    await act(async () => { items[1].action(); });
    expect(setCardDeckQuantity).toHaveBeenLastCalledWith(2, 1, 2);
    expect((await cardMenu())[1].disabled).toBe(true);
});

test('failed additions keep the previous membership state and show the error', async () => {
    await click('#collection-tab-cards');
    const items = await cardMenu();
    setCardDeckQuantity.mockRejectedValue(new Error('Could not save the deck'));
    await act(async () => { items[1].action(); });
    expect(container.querySelector('.collection-error').textContent).toContain('Could not save the deck');
    expect((await cardMenu())[1].label).toBe('teste 2');
});
