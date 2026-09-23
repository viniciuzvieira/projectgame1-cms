import { FC, ReactNode } from 'react';
import { t } from '../game-shell/GameLocale';

interface ToolbarButtonViewProps
{
    label: string;
    icon?: string;
    className?: string;
    active?: boolean;
    onClick: () => void;
    children?: ReactNode;
}

export const ToolbarButtonView: FC<ToolbarButtonViewProps> = ({ label, icon, className = '', active, onClick, children }) => (
    <button type="button" className={ `navigation-item cyber-toolbar-action ${ className }${ active ? ' active' : '' }` }
        title={ t(label) } aria-label={ t(label) } aria-pressed={ active } onClick={ onClick }>
        { icon && <span className={ `icon ${ icon }` } aria-hidden="true" /> }
        { children }
    </button>
);
