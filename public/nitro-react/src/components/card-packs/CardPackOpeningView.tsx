import { ILinkEventTracker } from '@nitrots/nitro-renderer';
import { CSSProperties, FC, KeyboardEvent, PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from 'react';
import { AddEventLinkTracker, RemoveLinkEventTracker } from '../../api';
import { Button, LayoutAvatarImageView, LayoutPixelLoadingView, NitroCardContentView, NitroCardHeaderView, NitroCardView } from '../../common';
import { useSessionInfo } from '../../hooks';

type PackOpeningPhase = 'sealed' | 'tearing' | 'opening' | 'revealed';

interface DragState
{
    pointerId: number;
    startX: number;
    startProgress: number;
    currentProgress: number;
}

interface TearPoint
{
    x: number;
    y: number;
}

const DRAG_DISTANCE = 165;
const OPEN_THRESHOLD = 0.68;
const REVEAL_DELAY = 650;
const PACK_WIDTH = 205;
const TEAR_CANVAS_WIDTH = 228;
const TEAR_EDGE_Y = [ 43, 46, 41, 45, 40, 47, 43, 48, 41, 45, 42, 49, 43, 46, 40, 44, 42, 47, 41, 46, 43, 48, 42, 45, 41, 44, 43 ];

const roundPointValue = (value: number): number => Math.round(value * 10) / 10;

const getTearEdgeY = (x: number): number =>
{
    const position = Math.max(0, Math.min(TEAR_EDGE_Y.length - 1, (x / PACK_WIDTH) * (TEAR_EDGE_Y.length - 1)));
    const index = Math.floor(position);
    const nextIndex = Math.min(TEAR_EDGE_Y.length - 1, index + 1);
    const amount = position - index;

    return TEAR_EDGE_Y[index] + ((TEAR_EDGE_Y[nextIndex] - TEAR_EDGE_Y[index]) * amount);
}

const getEdgePoints = (startX: number, endX: number): TearPoint[] =>
{
    const points: TearPoint[] = [ { x: startX, y: getTearEdgeY(startX) } ];
    const step = PACK_WIDTH / (TEAR_EDGE_Y.length - 1);

    for(let index = 1; index < (TEAR_EDGE_Y.length - 1); index++)
    {
        const x = index * step;

        if((x > startX) && (x < endX)) points.push({ x, y: TEAR_EDGE_Y[index] });
    }

    if(endX > startX) points.push({ x: endX, y: getTearEdgeY(endX) });

    return points;
}

const getSpanPoints = (startX: number, endX: number, y: number, segments = 14): TearPoint[] =>
{
    const points: TearPoint[] = [];

    for(let index = 0; index <= segments; index++)
    {
        points.push({ x: startX + (((endX - startX) * index) / segments), y });
    }

    return points;
}

const warpPeeledPoint = (point: TearPoint, tearFront: number, progress: number): TearPoint =>
{
    if((progress <= 0) || (point.x <= tearFront)) return point;

    const freeWidth = Math.max(1, TEAR_CANVAS_WIDTH - tearFront);
    const amount = Math.max(0, Math.min(1, (point.x - tearFront) / freeWidth));
    const smoothAmount = amount * amount * (3 - (2 * amount));
    const curl = Math.sin(amount * Math.PI);

    return {
        x: point.x - (progress * 160 * smoothAmount),
        y: point.y - (progress * ((18 * smoothAmount) + (18 * curl)))
    };
}

const pointsToPath = (points: TearPoint[]): string => points
    .map((point, index) => `${ index ? 'L' : 'M' } ${ roundPointValue(point.x) } ${ roundPointValue(point.y) }`)
    .join(' ');

const getAttachedStripPath = (tearFront: number): string =>
{
    if(tearFront <= 0.1) return '';

    const edge = getEdgePoints(0, tearFront).reverse();

    return `${ pointsToPath([ { x: 0, y: 0 }, { x: tearFront, y: 0 }, ...edge ]) } Z`;
}

const getPeeledStripPath = (tearFront: number, progress: number): string =>
{
    const warp = (point: TearPoint) => warpPeeledPoint(point, tearFront, progress);
    const topEdge = getSpanPoints(tearFront, PACK_WIDTH, 0).map(warp);
    const pullTab = [
        { x: PACK_WIDTH, y: 18 },
        { x: TEAR_CANVAS_WIDTH, y: 18 },
        { x: TEAR_CANVAS_WIDTH, y: 49 },
        { x: PACK_WIDTH, y: 49 }
    ].map(warp);
    const tornEdge = getEdgePoints(tearFront, PACK_WIDTH).reverse().map(warp);

    return `${ pointsToPath([ ...topEdge, ...pullTab, ...tornEdge ]) } Z`;
}

const getEdgePath = (startX: number, endX: number, tearFront: number, progress: number, warped: boolean): string =>
{
    const points = getEdgePoints(startX, endX).map(point => warped ? warpPeeledPoint(point, tearFront, progress) : point);

    return pointsToPath(points);
}

export const CardPackOpeningView: FC<{}> = props =>
{
    const [ isVisible, setIsVisible ] = useState(false);
    const [ phase, setPhase ] = useState<PackOpeningPhase>('sealed');
    const [ tearProgress, setTearProgress ] = useState(0);
    const dragState = useRef<DragState>(null);
    const revealTimer = useRef<number>(null);
    const tearAnimation = useRef<number>(null);
    const { userFigure = null } = useSessionInfo();

    const clearRevealTimer = useCallback(() =>
    {
        if(revealTimer.current === null) return;

        window.clearTimeout(revealTimer.current);
        revealTimer.current = null;
    }, []);

    const clearTearAnimation = useCallback(() =>
    {
        if(tearAnimation.current === null) return;

        window.cancelAnimationFrame(tearAnimation.current);
        tearAnimation.current = null;
    }, []);

    const animateTearProgress = useCallback((from: number, to: number, duration: number, onComplete: () => void = null) =>
    {
        clearTearAnimation();

        const startedAt = window.performance.now();
        const update = (now: number) =>
        {
            const elapsed = Math.min(1, (now - startedAt) / duration);
            const eased = 1 - Math.pow(1 - elapsed, 3);

            setTearProgress(from + ((to - from) * eased));

            if(elapsed < 1)
            {
                tearAnimation.current = window.requestAnimationFrame(update);
                return;
            }

            tearAnimation.current = null;
            onComplete && onComplete();
        };

        tearAnimation.current = window.requestAnimationFrame(update);
    }, [ clearTearAnimation ]);

    const resetPack = useCallback(() =>
    {
        clearRevealTimer();
        clearTearAnimation();
        dragState.current = null;
        setTearProgress(0);
        setPhase('sealed');
    }, [ clearRevealTimer, clearTearAnimation ]);

    const startOpening = useCallback((fromProgress = tearProgress) =>
    {
        if((phase === 'opening') || (phase === 'revealed')) return;

        clearRevealTimer();
        dragState.current = null;
        setPhase('tearing');

        animateTearProgress(fromProgress, 1, Math.max(140, (1 - fromProgress) * 480), () =>
        {
            setPhase('opening');

            revealTimer.current = window.setTimeout(() =>
            {
                revealTimer.current = null;
                setPhase('revealed');
            }, REVEAL_DELAY);
        });
    }, [ phase, tearProgress, clearRevealTimer, animateTearProgress ]);

    const closeWindow = useCallback(() =>
    {
        setIsVisible(false);
        resetPack();
    }, [ resetPack ]);

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
                        setIsVisible(value => !value);
                        return;
                    case 'show':
                        setIsVisible(true);
                        return;
                    case 'hide':
                        closeWindow();
                        return;
                }
            },
            eventUrlPrefix: 'card-packs/'
        };

        AddEventLinkTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [ closeWindow ]);

    useEffect(() => () =>
    {
        clearRevealTimer();
        clearTearAnimation();
    }, [ clearRevealTimer, clearTearAnimation ]);

    const releasePointer = (event: ReactPointerEvent<HTMLButtonElement>) =>
    {
        if(event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const onTearPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) =>
    {
        if((phase !== 'sealed') && (phase !== 'tearing')) return;

        clearTearAnimation();
        dragState.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startProgress: tearProgress,
            currentProgress: tearProgress
        };

        event.currentTarget.setPointerCapture(event.pointerId);
        setPhase('tearing');
        event.preventDefault();
    }

    const onTearPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) =>
    {
        const drag = dragState.current;

        if(!drag || (drag.pointerId !== event.pointerId)) return;

        const distance = drag.startX - event.clientX;
        const progress = Math.max(0, Math.min(1, drag.startProgress + (distance / DRAG_DISTANCE)));

        drag.currentProgress = progress;
        setTearProgress(progress);
        event.preventDefault();
    }

    const onTearPointerUp = (event: ReactPointerEvent<HTMLButtonElement>) =>
    {
        const drag = dragState.current;

        if(!drag || (drag.pointerId !== event.pointerId)) return;

        releasePointer(event);
        dragState.current = null;

        if(drag.currentProgress >= OPEN_THRESHOLD)
        {
            startOpening(drag.currentProgress);
        }
        else
        {
            animateTearProgress(drag.currentProgress, 0, 240, () => setPhase('sealed'));
        }
    }

    const onTearPointerCancel = (event: ReactPointerEvent<HTMLButtonElement>) =>
    {
        releasePointer(event);
        dragState.current = null;
        animateTearProgress(tearProgress, 0, 240, () => setPhase('sealed'));
    }

    const onTearKeyDown = (event: KeyboardEvent<HTMLButtonElement>) =>
    {
        if((event.key !== 'Enter') && (event.key !== ' ')) return;

        event.preventDefault();
        startOpening(tearProgress);
    }

    if(!isVisible) return null;

    const packStyle = {
        '--tear-open': `${ tearProgress * 100 }%`
    } as CSSProperties;
    const tearFront = PACK_WIDTH * (1 - tearProgress);
    const attachedStripPath = getAttachedStripPath(tearFront);
    const peeledStripPath = getPeeledStripPath(tearFront, tearProgress);
    const attachedEdgePath = getEdgePath(0, tearFront, tearFront, tearProgress, false);
    const peeledEdgePath = getEdgePath(tearFront, PACK_WIDTH, tearFront, tearProgress, true);
    const pullLabelPoint = warpPeeledPoint({ x: 217, y: 40 }, tearFront, tearProgress);
    const tearFrontY = getTearEdgeY(tearFront);

    return (
        <NitroCardView uniqueKey="card-pack-opening" className="nitro-card-pack-opening" theme="primary-slim">
            <NitroCardHeaderView headerText="Abrir pacote de cards" onCloseClick={ closeWindow } />
            <NitroCardContentView overflow="hidden">
                <div className={ `card-pack-stage phase-${ phase }` }>
                    <div className="card-pack-stage-heading">
                        <strong>{ phase === 'revealed' ? 'VOCE ENCONTROU!' : 'PACOTE CYBER HEROIC' }</strong>
                        <span>{ phase === 'revealed' ? 'Carta adicionada apenas nesta demonstracao' : 'Arraste a aba da direita para a esquerda' }</span>
                    </div>

                    <div className="card-pack-reward" aria-hidden={ phase !== 'revealed' }>
                        <div className="card-pack-reward-rarity">LENDARIO</div>
                        <div className="card-pack-reward-art">
                            <span className="card-pack-reward-halo" aria-hidden="true" />
                            <LayoutAvatarImageView
                                figure={ userFigure || '' }
                                direction={ 2 }
                                showLoading
                                loadingSize="small"
                                classNames={ [ 'card-pack-reward-avatar' ] } />
                        </div>
                        <div className="card-pack-reward-name">CYBER HERO</div>
                        <div className="card-pack-reward-stats">
                            <span><b>98</b> PODER</span>
                            <span><b>UR</b> SERIE 01</span>
                        </div>
                    </div>

                    <div className="card-pack-shell" style={ packStyle } aria-hidden={ phase === 'revealed' }>
                        <div className="card-pack-seam" />
                        <div className="card-pack-body">
                            <span className="card-pack-shine" aria-hidden="true" />
                            <span className="card-pack-kicker">EDICAO FUNDADORES</span>
                            <span className="card-pack-logo">CYBER<br />HEROIC</span>
                            <span className="card-pack-emblem" aria-hidden="true">
                                <span />
                            </span>
                            <span className="card-pack-count">CONTEM 1 CARD</span>
                        </div>
                        <button
                            type="button"
                            className="card-pack-tear-strip"
                            aria-label="Segure e arraste para a esquerda para rasgar o pacote"
                            disabled={ (phase === 'opening') || (phase === 'revealed') }
                            onPointerDown={ onTearPointerDown }
                            onPointerMove={ onTearPointerMove }
                            onPointerUp={ onTearPointerUp }
                            onPointerCancel={ onTearPointerCancel }
                            onKeyDown={ onTearKeyDown }>
                            <svg className="card-pack-tear-surface" viewBox="0 0 228 72" preserveAspectRatio="none" aria-hidden="true">
                                <defs>
                                    <linearGradient id="card-pack-tear-fill" gradientUnits="userSpaceOnUse" x1="2" y1="-1" x2="203" y2="286">
                                        <stop offset="0" stopColor="#f8d65f" />
                                        <stop offset="0.18" stopColor="#f8d65f" />
                                        <stop offset="0.18" stopColor="#ef7728" />
                                        <stop offset="0.38" stopColor="#ef7728" />
                                        <stop offset="0.38" stopColor="#d73526" />
                                        <stop offset="0.65" stopColor="#d73526" />
                                        <stop offset="0.65" stopColor="#8e1f2b" />
                                        <stop offset="1" stopColor="#8e1f2b" />
                                    </linearGradient>
                                    <linearGradient id="card-pack-tear-rails" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="205" y2="0">
                                        <stop offset="0" stopColor="#fff" stopOpacity="0" />
                                        <stop offset="0.12" stopColor="#fff" stopOpacity="0" />
                                        <stop offset="0.12" stopColor="#fff" stopOpacity="0.16" />
                                        <stop offset="0.17" stopColor="#fff" stopOpacity="0.16" />
                                        <stop offset="0.17" stopColor="#fff" stopOpacity="0" />
                                        <stop offset="0.82" stopColor="#000" stopOpacity="0" />
                                        <stop offset="0.82" stopColor="#000" stopOpacity="0.18" />
                                        <stop offset="0.88" stopColor="#000" stopOpacity="0.18" />
                                        <stop offset="0.88" stopColor="#000" stopOpacity="0" />
                                        <stop offset="1" stopColor="#000" stopOpacity="0" />
                                    </linearGradient>
                                    <linearGradient id="card-pack-tear-fold" x1="0" y1="0" x2="1" y2="1">
                                        <stop offset="0" stopColor="#3c1020" stopOpacity="0.12" />
                                        <stop offset="0.48" stopColor="#521323" stopOpacity="0.72" />
                                        <stop offset="1" stopColor="#fff0a0" stopOpacity="0.3" />
                                    </linearGradient>
                                </defs>

                                { attachedStripPath &&
                                    <>
                                        <path className="card-pack-rip-attached" d={ attachedStripPath } />
                                        <path className="card-pack-rip-artwork-rails" d={ attachedStripPath } />
                                    </> }
                                { attachedEdgePath &&
                                    <>
                                        <path className="card-pack-rip-fiber" d={ attachedEdgePath } />
                                        <path className="card-pack-rip-perforation" d={ attachedEdgePath } />
                                    </> }

                                <g className="card-pack-rip-peeled">
                                    <path className="card-pack-rip-peeled-shadow" d={ peeledStripPath } />
                                    <path className="card-pack-rip-peeled-face" d={ peeledStripPath } />
                                    <path className="card-pack-rip-artwork-rails" d={ peeledStripPath } />
                                    <path className="card-pack-rip-fold-shade" d={ peeledStripPath } style={ { opacity: tearProgress * 0.72 } } />
                                    { peeledEdgePath &&
                                        <>
                                            <path className="card-pack-rip-fiber" d={ peeledEdgePath } />
                                            <path className="card-pack-rip-perforation" d={ peeledEdgePath } />
                                        </> }
                                    <text
                                        className="card-pack-rip-label"
                                        x={ roundPointValue(pullLabelPoint.x) }
                                        y={ roundPointValue(pullLabelPoint.y) }
                                        transform={ `rotate(${ -90 - (tearProgress * 7) } ${ roundPointValue(pullLabelPoint.x) } ${ roundPointValue(pullLabelPoint.y) })` }>
                                        PUXE
                                    </text>
                                </g>

                                { (tearProgress > 0.02) && (tearProgress < 0.99) &&
                                    <path
                                        className="card-pack-rip-front-fibers"
                                        d={ `M ${ roundPointValue(tearFront) } ${ roundPointValue(tearFrontY) } l 5 -8 M ${ roundPointValue(tearFront) } ${ roundPointValue(tearFrontY) } l 8 1 M ${ roundPointValue(tearFront) } ${ roundPointValue(tearFrontY) } l 4 7` } /> }
                            </svg>
                        </button>
                    </div>

                    { phase === 'opening' &&
                        <div className="card-pack-opening-status">
                            <LayoutPixelLoadingView size="large" label="Revelando card" />
                            <strong>REVELANDO...</strong>
                        </div> }

                    <div className="card-pack-action">
                        { phase === 'revealed'
                            ? <Button variant="success" onClick={ resetPack }>ABRIR OUTRO PACOTE</Button>
                            : <Button variant="primary" disabled={ phase === 'opening' } onClick={ () => startOpening() }>ABRIR SEM ARRASTAR</Button> }
                    </div>
                </div>
            </NitroCardContentView>
        </NitroCardView>
    );
}
