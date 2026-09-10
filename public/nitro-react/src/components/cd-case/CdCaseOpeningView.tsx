import { ILinkEventTracker } from '@nitrots/nitro-renderer';
import { FC, useCallback, useEffect, useState } from 'react';
import { AddEventLinkTracker, RemoveLinkEventTracker } from '../../api';
import { Button, LayoutAvatarImageView, NitroCardContentView, NitroCardHeaderView, NitroCardView } from '../../common';
import { useSessionInfo } from '../../hooks';

interface CollectibleCardProps
{
    expanded?: boolean;
    figure: string;
    onClick?: () => void;
    tabIndex?: number;
}

const CollectibleCard: FC<CollectibleCardProps> = props =>
{
    const { expanded = false, figure, onClick = null, tabIndex = 0 } = props;
    const className = `cd-collectible-card ${ expanded ? 'is-expanded' : 'is-miniature' }`;
    const content = (
        <>
            <div className="cd-collectible-card-rarity">LENDARIO</div>
            <div className="cd-collectible-card-art">
                <span className="cd-collectible-card-grid" aria-hidden="true" />
                <LayoutAvatarImageView
                    figure={ figure }
                    direction={ 2 }
                    showLoading
                    loadingSize="small"
                    classNames={ [ 'cd-collectible-card-avatar' ] } />
            </div>
            <div className="cd-collectible-card-name">CYBER HERO</div>
            <div className="cd-collectible-card-stats">
                <span><b>98</b> PODER</span>
                <span><b>UR</b> SERIE 01</span>
            </div>
        </>
    );

    if(onClick)
    {
        return (
            <button type="button" className={ className } onClick={ onClick } tabIndex={ tabIndex } aria-label="Ampliar card Cyber Hero">
                { content }
            </button>
        );
    }

    return <div className={ className }>{ content }</div>;
}

export const CdCaseOpeningView: FC<{}> = props =>
{
    const [ isVisible, setIsVisible ] = useState(false);
    const [ isOpen, setIsOpen ] = useState(false);
    const [ isCardExpanded, setIsCardExpanded ] = useState(false);
    const { userFigure = null } = useSessionInfo();

    const resetCase = useCallback(() =>
    {
        setIsOpen(false);
        setIsCardExpanded(false);
    }, []);

    const closeWindow = useCallback(() =>
    {
        setIsVisible(false);
        resetCase();
    }, [ resetCase ]);

    const toggleWindow = useCallback(() =>
    {
        resetCase();
        setIsVisible(value => !value);
    }, [ resetCase ]);

    useEffect(() =>
    {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) =>
            {
                const parts = url.split('/');

                if(parts.length < 2) return;

                switch(parts[1])
                {
                    case 'toggle':
                        toggleWindow();
                        return;
                    case 'show':
                        resetCase();
                        setIsVisible(true);
                        return;
                    case 'hide':
                        closeWindow();
                        return;
                }
            },
            eventUrlPrefix: 'cd-case/'
        };

        AddEventLinkTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [ closeWindow, resetCase, toggleWindow ]);

    useEffect(() =>
    {
        if(!isCardExpanded) return;

        const onKeyDown = (event: globalThis.KeyboardEvent) =>
        {
            if(event.key === 'Escape') setIsCardExpanded(false);
        };

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, [ isCardExpanded ]);

    if(!isVisible) return null;

    return (
        <NitroCardView uniqueKey="cd-case-opening" className="nitro-cd-case-opening" theme="primary-slim">
            <NitroCardHeaderView headerText="Arquivo de cards em CD" onCloseClick={ closeWindow } />
            <NitroCardContentView overflow="hidden">
                <div className={ `cd-case-stage ${ isOpen ? 'is-open' : 'is-closed' }` }>
                    <div className="cd-case-stage-heading">
                        <strong>{ isOpen ? 'ARQUIVO DESBLOQUEADO' : 'CYBER DISC 01' }</strong>
                        <span>{ isOpen ? 'Clique no mini card para ampliar' : 'Clique na capa para abrir o estojo' }</span>
                    </div>

                    <div className="cd-case-scene">
                        <div className="cd-jewel-case">
                            <div className="cd-case-back" aria-hidden="true">
                                <span className="cd-case-tray-ring" />
                                <span className="cd-case-disc">
                                    <span>CH</span>
                                </span>
                                <span className="cd-case-tray-clasp cd-case-tray-clasp-top" />
                                <span className="cd-case-tray-clasp cd-case-tray-clasp-bottom" />
                            </div>

                            <div className="cd-case-card-slot" aria-hidden={ !isOpen }>
                                <CollectibleCard
                                    figure={ userFigure || '' }
                                    tabIndex={ isOpen ? 0 : -1 }
                                    onClick={ () => setIsCardExpanded(true) } />
                            </div>

                            <button
                                type="button"
                                className="cd-case-lid"
                                onClick={ () => setIsOpen(value => !value) }
                                aria-label={ isOpen ? 'Fechar capa do CD' : 'Abrir capa do CD' }
                                aria-expanded={ isOpen }>
                                <span className="cd-case-lid-front">
                                    <span className="cd-case-cover-kicker">COLLECTOR ARCHIVE</span>
                                    <span className="cd-case-cover-title">CYBER<br />HEROIC</span>
                                    <span className="cd-case-cover-disc" aria-hidden="true"><i /></span>
                                    <span className="cd-case-cover-edition">DISC 01 // FOUNDER EDITION</span>
                                </span>
                                <span className="cd-case-lid-inside">
                                    <span className="cd-case-booklet-mark">CH</span>
                                    <span className="cd-case-booklet-lines" aria-hidden="true" />
                                    <span className="cd-case-booklet-copy">CARD ARCHIVE<br />ACCESS GRANTED</span>
                                </span>
                            </button>

                            <span className="cd-case-fixed-spine" aria-hidden="true">
                                <span>CYBER HEROIC</span>
                            </span>
                        </div>
                    </div>

                    <div className="cd-case-action">
                        <Button variant={ isOpen ? 'secondary' : 'primary' } onClick={ () => setIsOpen(value => !value) }>
                            { isOpen ? 'FECHAR CAPA' : 'ABRIR CAPA' }
                        </Button>
                    </div>

                    { isCardExpanded &&
                        <div className="cd-card-preview-overlay" role="dialog" aria-modal="true" aria-label="Card Cyber Hero ampliado" onClick={ () => setIsCardExpanded(false) }>
                            <button type="button" className="cd-card-preview-close" onClick={ () => setIsCardExpanded(false) } aria-label="Fechar card ampliado">x</button>
                            <div className="cd-card-preview-content" onClick={ event => event.stopPropagation() }>
                                <CollectibleCard expanded figure={ userFigure || '' } />
                                <span>CARD DIGITAL // ARQUIVO 001</span>
                            </div>
                        </div> }
                </div>
            </NitroCardContentView>
        </NitroCardView>
    );
}
