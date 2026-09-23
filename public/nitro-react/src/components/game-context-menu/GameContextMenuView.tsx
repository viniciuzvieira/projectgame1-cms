import { FC, KeyboardEvent, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CreateLinkEvent } from '../../api';
import { GameIcon } from '../game-shell/GameIcon';
import { useGameLocale } from '../game-shell/GameLocale';
import { GAME_MENU_CLOSE, GAME_MENU_OPEN, GameMenuItem, GameMenuRequest } from './GameContextMenu';

export const GameContextMenuView: FC = () =>
{
    const { t } = useGameLocale();
    const [ menu, setMenu ] = useState<GameMenuRequest>(null);
    const [ position, setPosition ] = useState({ x: 0, y: 0 });
    const [ sub, setSub ] = useState<{ item: GameMenuItem; top: number; left: number }>(null);
    const layerRef = useRef<HTMLDivElement>(null);
    const rootRef = useRef<HTMLDivElement>(null);
    const subRef = useRef<HTMLDivElement>(null);
    const parentRef = useRef<HTMLButtonElement>(null);
    const focusBefore = useRef<HTMLElement>(null);

    useEffect(() =>
    {
        const show = (event: Event) =>
        {
            focusBefore.current = document.activeElement as HTMLElement;
            setSub(null);
            setMenu((event as CustomEvent<GameMenuRequest>).detail);
        };
        const hide = () => { setMenu(null); setSub(null); };
        const context = (event: MouseEvent) =>
        {
            event.preventDefault();
            focusBefore.current = document.activeElement as HTMLElement;
            setSub(null);
            setMenu({ x: event.clientX, y: event.clientY, title: 'CYBER HEROIC', items: [
                { id: 'collection', label: 'Minha colecao', action: () => CreateLinkEvent('card-collection/show') },
                { id: 'packs', label: 'Pacotes', action: () => CreateLinkEvent('card-collection/packs') },
                { id: 'cards', label: 'Cartas', action: () => CreateLinkEvent('card-collection/cards') },
                { id: 'decks', label: 'Decks', action: () => CreateLinkEvent('card-collection/decks') },
                { id: 'skills', label: 'Evolução de skills', action: () => CreateLinkEvent('game-skills/show') },
                { id: 'settings', label: 'Configurações', action: () => CreateLinkEvent('user-settings/show') }
            ] });
        };
        const outside = (event: PointerEvent) => { if(!layerRef.current?.contains(event.target as Node)) hide(); };
        const scroll = (event: Event) => { if(!layerRef.current?.contains(event.target as Node)) hide(); };
        document.addEventListener('contextmenu', context);
        document.addEventListener('pointerdown', outside);
        document.addEventListener('scroll', scroll, true);
        window.addEventListener(GAME_MENU_OPEN, show);
        window.addEventListener(GAME_MENU_CLOSE, hide);
        window.addEventListener('resize', hide);
        window.addEventListener('blur', hide);
        return () =>
        {
            document.removeEventListener('contextmenu', context);
            document.removeEventListener('pointerdown', outside);
            document.removeEventListener('scroll', scroll, true);
            window.removeEventListener(GAME_MENU_OPEN, show);
            window.removeEventListener(GAME_MENU_CLOSE, hide);
            window.removeEventListener('resize', hide);
            window.removeEventListener('blur', hide);
        };
    }, []);

    useLayoutEffect(() =>
    {
        if(!menu || !rootRef.current) return;
        const bounds = rootRef.current.getBoundingClientRect();
        setPosition({ x: Math.max(8, Math.min(menu.x, window.innerWidth - bounds.width - 8)), y: Math.max(8, Math.min(menu.y, window.innerHeight - bounds.height - 8)) });
        rootRef.current.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({ preventScroll: true });
    }, [ menu ]);

    useLayoutEffect(() =>
    {
        if(!sub || !subRef.current) return;
        const bounds = subRef.current.getBoundingClientRect();
        const top = Math.max(8, Math.min(sub.top, window.innerHeight - bounds.height - 8));
        const left = Math.max(8, Math.min(sub.left, window.innerWidth - bounds.width - 8));
        if(top !== sub.top || left !== sub.left) setSub({ ...sub, top, left });
    }, [ sub ]);

    const expand = (item: GameMenuItem, target: HTMLButtonElement, focus = false) =>
    {
        if(!item.children || item.disabled) { setSub(null); return; }
        const rect = target.getBoundingClientRect();
        parentRef.current = target;
        setSub({ item, top: rect.top, left: rect.right + 220 > window.innerWidth - 8 ? position.x - 216 : rect.right - 2 });
        if(focus) requestAnimationFrame(() => subRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus());
    };
    const activate = (item: GameMenuItem, button: HTMLButtonElement) =>
    {
        if(item.disabled) return;
        if(item.children) { expand(item, button, true); return; }
        setMenu(null);
        item.action?.();
    };
    const keyboard = (event: KeyboardEvent<HTMLDivElement>, child: boolean) =>
    {
        event.stopPropagation();
        if(event.key === 'Escape' || event.key === 'Tab')
        {
            event.preventDefault(); setMenu(null);
            if(focusBefore.current?.isConnected) focusBefore.current.focus({ preventScroll: true });
            return;
        }
        if(event.key === 'ArrowLeft' && child) { event.preventDefault(); setSub(null); parentRef.current?.focus(); return; }
        const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
        const index = items.indexOf(document.activeElement as HTMLButtonElement);
        if(['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key))
        {
            event.preventDefault();
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
            items[next]?.focus();
        }
        if(event.key === 'ArrowRight' && !child && index >= 0)
        {
            const item = menu.items.find(value => value.id === items[index].dataset.menuId);
            if(item?.children) { event.preventDefault(); expand(item, items[index], true); }
        }
    };
    if(!menu) return null;
    return createPortal(<div ref={ layerRef } className="game-context-menu-layer" onContextMenu={ event => { event.preventDefault(); event.stopPropagation(); } }>
        <div ref={ rootRef } className="game-context-menu" role="menu" aria-label={ menu.title || 'Menu do jogo' } style={ { left: position.x, top: position.y } } onKeyDown={ event => keyboard(event, false) }>
            { menu.title && <div className="game-context-menu-title">{ menu.title }</div> }
            { menu.items.map(item => <button key={ item.id } data-menu-id={ item.id } type="button" role="menuitem" disabled={ item.disabled } aria-haspopup={ item.children ? 'menu' : undefined } aria-expanded={ item.children ? sub?.item.id === item.id : undefined }
                onMouseEnter={ event => expand(item, event.currentTarget) } onClick={ event => activate(item, event.currentTarget) }>
                <GameIcon name={ item.icon || item.id } /><span>{ t(item.label) }</span>{ item.children && <b aria-hidden="true">&gt;</b> }
            </button>) }
        </div>
        { sub && <div ref={ subRef } className="game-context-menu game-context-submenu" role="menu" aria-label={ sub.item.label } style={ { left: sub.left, top: sub.top } } onKeyDown={ event => keyboard(event, true) }>
            { sub.item.children.map(item => <button key={ item.id } type="button" role="menuitem" disabled={ item.disabled } onClick={ event => activate(item, event.currentTarget) }><GameIcon name={ item.icon || 'folder' } /><span>{ t(item.label) }</span></button>) }
        </div> }
    </div>, document.getElementById('draggable-windows-container'));
};
