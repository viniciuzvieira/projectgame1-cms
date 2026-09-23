export interface GameMenuItem
{
    id: string;
    label: string;
    icon?: string;
    disabled?: boolean;
    children?: GameMenuItem[];
    action?: () => void;
}

export interface GameMenuRequest
{
    x: number;
    y: number;
    title?: string;
    items: GameMenuItem[];
}

export const GAME_MENU_OPEN = 'cyber-game-menu-open';
export const GAME_MENU_CLOSE = 'cyber-game-menu-close';
export const openGameContextMenu = (menu: GameMenuRequest) => window.dispatchEvent(new CustomEvent(GAME_MENU_OPEN, { detail: menu }));
export const closeGameContextMenu = () => window.dispatchEvent(new Event(GAME_MENU_CLOSE));
