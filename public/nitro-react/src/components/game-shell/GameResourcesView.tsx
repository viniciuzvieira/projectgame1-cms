import { FC, useEffect } from 'react';
import dataIcon from '../../assets/images/retro/resource-data.png';
import ironIcon from '../../assets/images/retro/resource-iron.png';
import oilIcon from '../../assets/images/retro/resource-oil.png';
import { useGameLocale } from './GameLocale';
import { loadGameProfile, useGameProfile } from './GameProfile';
import { ResourceCapacityBar } from './ResourceCapacityBar';

const resources = [
    { code: 'data', name: 'Dados', icon: dataIcon, fallbackUnit: 'MB' },
    { code: 'oil', name: 'Petróleo', icon: oilIcon, fallbackUnit: 'L' },
    { code: 'iron', name: 'Ferro', icon: ironIcon, fallbackUnit: 'kg' }
] as const;

export const GameResourcesView: FC = () =>
{
    const profile = useGameProfile();
    const { t, locale } = useGameLocale();
    useEffect(() =>
    {
        loadGameProfile();
        const refresh = () => { if(!document.hidden) loadGameProfile(); };
        const interval = window.setInterval(refresh, 30000);
        document.addEventListener('visibilitychange', refresh);
        return () => { clearInterval(interval); document.removeEventListener('visibilitychange', refresh); };
    }, []);
    const formatter = new Intl.NumberFormat({ pt: 'pt-BR', en: 'en-US', es: 'es-ES' }[locale], { maximumFractionDigits: 3 });
    const resourcesLoading = !profile.loaded && !profile.resourcesError;
    return <aside className="game-resources-hud" aria-label={ t('Recursos do jogador') }>
        <div className="resource-hud-inner">
            <svg className="resource-hud-frame" viewBox="0 0 790 88" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                <path className="resource-hud-rim" d="M8 2H782Q788 2 785 8L754 80Q752 86 746 86H44Q38 86 36 80L5 8Q2 2 8 2Z" />
                <path className="resource-hud-face" d="M13 7H777L747 81H43Z" />
                <path className="resource-hud-bevel" d="M13 7H777M13 7L43 81" />
            </svg>
            { resources.map(resource =>
            {
                const balance = profile.resources.find(item => item.code === resource.code);
                const quantity = Number(balance?.quantity || 0);
                const capacity = Number(balance?.capacity || 0);

                return <div key={ resource.code } className={ `resource-meter resource-${ resource.code }` } title={ t(resource.name) }>
                    <img className="resource-icon" src={ resource.icon } alt="" />
                    <span className="resource-name">{ t(resource.name) }</span>
                    <ResourceCapacityBar label={ t(resource.name) } quantity={ quantity } capacity={ capacity } loading={ resourcesLoading } />
                    <output className="resource-value">{ balance ? `${ formatter.format(quantity) }/${ formatter.format(capacity) }` : '.../...' }{ balance?.unit || resource.fallbackUnit }</output>
                </div>;
            }) }
        </div>
        { profile.resourcesError && <button className="resource-retry" onClick={ loadGameProfile } title={ t('Tentar novamente') }>{ t('Recursos indisponíveis') }</button> }
    </aside>;
};
