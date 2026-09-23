import { ILinkEventTracker } from '@nitrots/nitro-renderer';
import { FC, KeyboardEvent, PointerEvent as ReactPointerEvent, useCallback, useEffect, useId, useRef, useState } from 'react';
import { AddEventLinkTracker, RemoveLinkEventTracker } from '../../api';
import { Button, LayoutAvatarImageView, LayoutPixelLoadingView, NitroCardContentView, NitroCardHeaderView, NitroCardView } from '../../common';
import { useSessionInfo } from '../../hooks';
import { bendPackagePath, COMPLETE_TEAR_PROGRESS, getPackageColorBand, getTearFront, PACK_HEIGHT, PACK_WIDTH, TearDirection } from './CardPackGeometry';
import { CollectionCard, CollectionPack } from './CardCollectionApi';
import { CardPackDesign, getCardPackDesign } from './CardPackDesign';
import { DeviceCardControls } from './DeviceCardControls';
import { t } from '../game-shell/GameLocale';

type PackOpeningPhase = 'sealed' | 'tearing' | 'authorizing' | 'opening' | 'revealed';

interface DragState
{
    pointerId: number;
    startX: number;
    startProgress: number;
    currentProgress: number;
    direction: TearDirection;
}

interface TearPoint
{
    x: number;
    y: number;
}

const DRAG_DISTANCE = 165;
const OPEN_THRESHOLD = 0.68;
const REVEAL_DELAY = 650;
const PERFORATION_INSET = 11;
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

const pointsToPath = (points: TearPoint[]): string => points
    .map((point, index) => `${ index ? 'L' : 'M' } ${ roundPointValue(point.x) } ${ roundPointValue(point.y) }`)
    .join(' ');

const getSerratedEdge = (startX: number, endX: number, baseY: number, tipY: number, toothWidth = 7): string[] =>
{
    const direction = Math.sign(endX - startX);
    const distance = Math.abs(endX - startX);
    const toothCount = Math.max(1, Math.round(distance / toothWidth));
    const step = distance / toothCount;
    const points: string[] = [];

    for(let index = 0; index < toothCount; index++)
    {
        const midpoint = startX + (direction * step * (index + 0.5));
        const endpoint = startX + (direction * step * (index + 1));

        points.push(`L ${ roundPointValue(midpoint) } ${ roundPointValue(tipY) }`);
        points.push(`L ${ roundPointValue(endpoint) } ${ roundPointValue(baseY) }`);
    }

    return points;
}

const getPackageOutlinePath = (inset: number): string =>
{
    const sealLeft = 4 + inset;
    const sealRight = PACK_WIDTH - 4 - inset;
    const bodyLeft = 9 + inset;
    const bodyRight = PACK_WIDTH - 9 - inset;
    const top = 2 + inset;
    const bottom = PACK_HEIGHT - 2 - inset;
    const toothDepth = Math.max(1, 3 - (inset * 0.25));
    const topBase = top + toothDepth;
    const bottomBase = bottom - toothDepth;
    const upperShoulder = 37 + (inset * 0.35);
    const bodyTop = 44 + (inset * 0.2);
    const bodyBottom = 241 - (inset * 0.2);
    const lowerShoulder = 248 - (inset * 0.35);

    return [
        `M ${ roundPointValue(sealLeft) } ${ roundPointValue(topBase) }`,
        ...getSerratedEdge(sealLeft, sealRight, topBase, top),
        `L ${ roundPointValue(sealRight) } ${ roundPointValue(upperShoulder) }`,
        `L ${ roundPointValue(bodyRight) } ${ roundPointValue(bodyTop) }`,
        `C ${ roundPointValue(bodyRight - 2) } 92 ${ roundPointValue(bodyRight - 1) } 201 ${ roundPointValue(bodyRight) } ${ roundPointValue(bodyBottom) }`,
        `L ${ roundPointValue(sealRight) } ${ roundPointValue(lowerShoulder) }`,
        `L ${ roundPointValue(sealRight) } ${ roundPointValue(bottomBase) }`,
        ...getSerratedEdge(sealRight, sealLeft, bottomBase, bottom),
        `L ${ roundPointValue(sealLeft) } ${ roundPointValue(lowerShoulder) }`,
        `L ${ roundPointValue(bodyLeft) } ${ roundPointValue(bodyBottom) }`,
        `C ${ roundPointValue(bodyLeft + 2) } 201 ${ roundPointValue(bodyLeft + 1) } 92 ${ roundPointValue(bodyLeft) } ${ roundPointValue(bodyTop) }`,
        `L ${ roundPointValue(sealLeft) } ${ roundPointValue(upperShoulder) } Z`
    ].join(' ');
}

const getEdgePath = (startX: number, endX: number, offsetY = 0): string =>
{
    return pointsToPath(getEdgePoints(startX, endX).map(point => ({ ...point, y: point.y + offsetY })));
}

const getTopClipPath = (): string =>
{
    const points = getEdgePoints(0, PACK_WIDTH).reverse();

    return `M 0 -8 H ${ PACK_WIDTH } L ${ roundPointValue(points[0].x) } ${ roundPointValue(points[0].y) } ${ points.slice(1).map(point => `L ${ roundPointValue(point.x) } ${ roundPointValue(point.y) }`).join(' ') } Z`;
}

const getBodyClipPath = (tearFront: number, direction: TearDirection): string =>
{
    // Overlap only the attached tear edge, so antialiasing cannot expose a seam.
    const attachedSide = direction === 'left-to-right' ? 1 : -1;
    const blendStart = Math.max(0, Math.min(PACK_WIDTH, tearFront + attachedSide * 2));
    const points = [
        ...getEdgePoints(0, PACK_WIDTH),
        { x: blendStart, y: getTearEdgeY(blendStart) },
        { x: tearFront, y: getTearEdgeY(tearFront) }
    ]
        .sort((first, second) => first.x - second.x)
        .map(point => ({ ...point, y: point.y - Math.max(0, Math.min(1, attachedSide * (point.x - tearFront) / 2)) }));

    return `${ pointsToPath(points) } L ${ PACK_WIDTH } ${ PACK_HEIGHT } L 0 ${ PACK_HEIGHT } Z`;
}

export const renderPackageArtwork = (id: string, progress = 0, direction: TearDirection = 'right-to-left', design: CardPackDesign = getCardPackDesign('founders')) =>
{
    const path = (d: string) => bendPackagePath(d, progress, direction);

    return <g id={ id }>
        <defs>
            <clipPath id={ `${ id }-outline` } clipPathUnits="userSpaceOnUse">
                <path d={ path(getPackageOutlinePath(0)) } />
            </clipPath>
        </defs>
        <g clipPath={ `url(#${ id }-outline)` }>
            <path d={ path(`M 0 0 H ${ PACK_WIDTH } V ${ PACK_HEIGHT } H 0 Z`) } fill="var(--card-pack-color-yellow)" />
            <path d={ path(getPackageColorBand(0.18)) } fill="var(--card-pack-color-orange)" />
            <path d={ path(getPackageColorBand(0.38)) } fill="var(--card-pack-color-red)" />
            <path d={ path(getPackageColorBand(0.65)) } fill="var(--card-pack-color-deep-red)" />
            <path d={ path('M 24.6 0 H 34.85 V 285 H 24.6 Z') } fill="#fff" fillOpacity="0.16" />
            <path d={ path('M 168.1 0 H 180.4 V 285 H 168.1 Z') } fill="#000" fillOpacity="0.18" />
            <path className="card-pack-master-shine" d={ path('M 144 -20 L 226 -20 L 166 305 L 103 305 Z') } />
            <path className="card-pack-master-bottom" d={ path('M 0 268 H 205 V 285 H 0 Z') } />
            <path className="card-pack-master-left-fold" d={ path('M 4 37 L 9 44 C 7 99 7 193 9 241 L 4 248 Z') } />
            <path className="card-pack-master-right-fold" d={ path('M 201 37 L 196 44 C 198 99 198 193 196 241 L 201 248 Z') } />
            <path className="card-pack-master-top-crimp" d={ path('M 6 9 H 199 M 6 14 H 199 M 6 19 H 199 M 6 24 H 199 M 6 29 H 199 M 6 34 H 199') } />
            <path className="card-pack-master-bottom-crimp" d={ path('M 6 268 H 199 M 6 273 H 199 M 6 278 H 199') } />
        </g>

        { progress === 0 && <>
            { design.key === 'arcade' ? <g stroke="#382b48" strokeWidth="3" strokeLinejoin="round" shapeRendering="crispEdges">
                <path d="M73 144h65v72l-14 15H73Z" fill="#382b48" opacity=".4" />
                <path d="M67 138h65v72l-14 15H67Z" fill="#ffc579" />
                <path d="M71 142h57v64l-13 15H71Z" fill="#ed9874" stroke="#ffe5a8" strokeWidth="2" />
                <path d="M75 150h49v39H75Z" fill="#574258" /><path d="M81 156h37v25H81Z" fill="#afcf85" strokeWidth="2" />
                <path d="M92 161h15v3h4v11H88v-11h4Z" fill="#46655b" stroke="none" /><path d="M92 167h4v4h-4Zm11 0h4v4h-4Z" fill="#dbebad" stroke="none" />
                <path d="M81 197h7v-6h7v6h6v7h-6v6h-7v-6h-7Z" fill="#382b48" strokeWidth="1" />
                <circle cx="111" cy="203" r="4" fill="#b74274" strokeWidth="2" /><circle cx="122" cy="197" r="4" fill="#b74274" strokeWidth="2" />
                <path d="m106 215 8-3m-5 7 8-3" strokeWidth="2" /><path d="M51 155h8m-4-4v8m85 42h9m-4-4v8" stroke="#ffe2ae" strokeWidth="2" />
            </g> : <g className="card-pack-master-emblem" transform="rotate(45 102.5 172.5)">
                <rect className="card-pack-master-emblem-shadow" x="77" y="147" width="59" height="59" />
                <rect className="card-pack-master-emblem-outer" x="73" y="143" width="59" height="59" />
                <rect className="card-pack-master-emblem-inner" x="87" y="157" width="31" height="31" />
            </g> }
            <text className="card-pack-master-copy card-pack-master-kicker" x="102.5" y="67">{ design.kicker }</text>
            <text className="card-pack-master-copy card-pack-master-logo" x="102.5" y="101">{ design.title[0] }</text>
            <text className="card-pack-master-copy card-pack-master-logo" x="102.5" y="125">{ design.title[1] }</text>
            <text className="card-pack-master-copy card-pack-master-count" x="102.5" y="258">CONTÉM 1 CARD</text>
        </> }
        <path className="card-pack-master-bottom-stitch" d={ path('M 10 276 H 195') } />
        <path className="card-pack-master-shadow-frame" d={ path(getPackageOutlinePath(6.5)) } />
        <path className="card-pack-master-inner-frame" d={ path(getPackageOutlinePath(4)) } />
        <path className="card-pack-master-outer-frame" d={ path(getPackageOutlinePath(1.5)) } />
    </g>;
}

interface CardPackOpeningViewProps
{
    embedded?: boolean;
    pack?: CollectionPack;
    onOpen?: () => Promise<CollectionCard>;
    onBusyChange?: (busy: boolean) => void;
}

export const CardPackOpeningView: FC<CardPackOpeningViewProps> = props =>
{
    const { embedded = false, pack, onOpen, onBusyChange } = props;
    const [ isVisible, setIsVisible ] = useState(embedded);
    const [ phase, setPhase ] = useState<PackOpeningPhase>('sealed');
    const [ tearProgress, setTearProgress ] = useState(0);
    const [ tearDirection, setTearDirection ] = useState<TearDirection>('right-to-left');
    const [ reward, setReward ] = useState<CollectionCard>(null);
    const [ error, setError ] = useState('');
    const openingBusy = useRef(false);
    const generation = useRef(0);
    const instanceId = useId().replace(/:/g, '');
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
        generation.current++;
        openingBusy.current = false;
        setReward(null);
        setError('');
        onBusyChange?.(false);
        clearRevealTimer();
        clearTearAnimation();
        dragState.current = null;
        setTearProgress(0);
        setTearDirection('right-to-left');
        setPhase('sealed');
    }, [ clearRevealTimer, clearTearAnimation, onBusyChange ]);

    const startOpening = useCallback(async (fromProgress = tearProgress) =>
    {
        if(openingBusy.current || (phase === 'revealed') || (pack && pack.quantity < 1)) return;

        openingBusy.current = true;
        onBusyChange?.(true);
        setError('');
        const currentGeneration = ++generation.current;

        clearRevealTimer();
        clearTearAnimation();
        dragState.current = null;

        if(onOpen)
        {
            setPhase('authorizing');
            try
            {
                const card = await onOpen();
                if(currentGeneration !== generation.current) return;
                setReward(card);
            }
            catch(openError)
            {
                if(currentGeneration !== generation.current) return;
                openingBusy.current = false;
                onBusyChange?.(false);
                setError(openError instanceof Error ? openError.message : 'Nao foi possivel abrir este pacote.');
                setTearProgress(0);
                setPhase('sealed');
                return;
            }
        }
        setPhase('tearing');

        animateTearProgress(fromProgress, COMPLETE_TEAR_PROGRESS, Math.max(140, (COMPLETE_TEAR_PROGRESS - fromProgress) * 480), () =>
        {
            setPhase('opening');

            revealTimer.current = window.setTimeout(() =>
            {
                revealTimer.current = null;
                setPhase('revealed');
                openingBusy.current = false;
                onBusyChange?.(false);
            }, REVEAL_DELAY);
        });
    }, [ phase, tearProgress, pack, onOpen, onBusyChange, clearRevealTimer, clearTearAnimation, animateTearProgress ]);

    const closeWindow = useCallback(() =>
    {
        setIsVisible(false);
        resetPack();
    }, [ resetPack ]);

    useEffect(() =>
    {
        if(embedded) return;

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
    }, [ closeWindow, embedded ]);

    useEffect(() => () =>
    {
        generation.current++;
        onBusyChange?.(false);
        clearRevealTimer();
        clearTearAnimation();
    }, [ clearRevealTimer, clearTearAnimation, onBusyChange ]);

    const releasePointer = (event: ReactPointerEvent<HTMLButtonElement>) =>
    {
        if(event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const onTearPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) =>
    {
        if((phase !== 'sealed') && (phase !== 'tearing')) return;
        if(openingBusy.current || (pack && pack.quantity < 1)) return;
        if((event.button !== 0) || dragState.current) return;

        clearTearAnimation();
        const bounds = event.currentTarget.getBoundingClientRect();
        // Choose an end for a fresh pack; resuming a partial cut keeps its direction.
        const direction = tearProgress > 0 ? tearDirection :
            (event.clientX < bounds.left + bounds.width / 2 ? 'left-to-right' : 'right-to-left');

        setTearDirection(direction);
        dragState.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startProgress: tearProgress,
            currentProgress: tearProgress,
            direction
        };

        event.currentTarget.setPointerCapture(event.pointerId);
        setPhase('tearing');
        event.preventDefault();
    }

    const onTearPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) =>
    {
        const drag = dragState.current;

        if(!drag || (drag.pointerId !== event.pointerId)) return;

        const distance = (event.clientX - drag.startX) * (drag.direction === 'left-to-right' ? 1 : -1);
        const progress = Math.max(0, Math.min(COMPLETE_TEAR_PROGRESS, drag.startProgress + (distance / DRAG_DISTANCE)));

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
        if(!dragState.current || (dragState.current.pointerId !== event.pointerId)) return;

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

    const cutProgress = Math.min(1, tearProgress);
    const tearFront = getTearFront(cutProgress, tearDirection);
    const liftedTopClipPath = bendPackagePath(getTopClipPath(), tearProgress, tearDirection);
    const finishedBodyClipPath = getBodyClipPath(tearFront, tearDirection);
    // Keep the torn-edge pattern anchored to the package while a moving clip reveals it.
    const tornEdgePath = getEdgePath(0, PACK_WIDTH);
    const tornUpperEdgePath = bendPackagePath(tornEdgePath, tearProgress, tearDirection);
    const edgeClipStart = tearDirection === 'left-to-right' ? 0 : tearFront;
    const edgeClipWidth = PACK_WIDTH * cutProgress;
    const sealedClipStart = tearDirection === 'left-to-right' ? tearFront : 0;
    const sealedClipWidth = PACK_WIDTH * (1 - cutProgress);
    const sealedPerforationPath = `M ${ PERFORATION_INSET } 43 H ${ PACK_WIDTH - PERFORATION_INSET }`;
    const design = getCardPackDesign(pack?.design_key || 'founders');
    const completeId = `card-pack-${ instanceId }-complete-artwork`;
    const liftedId = `card-pack-${ instanceId }-lifted-artwork`;
    const topClipId = `card-pack-${ instanceId }-lifted-top-clip`;
    const bodyClipId = `card-pack-${ instanceId }-body-clip`;
    const edgeClipId = `card-pack-${ instanceId }-edge-clip`;
    const sealedClipId = `card-pack-${ instanceId }-sealed-clip`;
    const isBusy = phase === 'authorizing' || phase === 'opening' || openingBusy.current;

    const stage = (
        <div className={ `card-pack-stage phase-${ phase }` }>
            <div className="card-pack-stage-heading">
                <strong>{ phase === 'revealed' ? t('VOCÊ ENCONTROU!') : t(pack?.name || 'PACOTE CYBER HEROIC') }</strong>
                <span>{ t(phase === 'revealed' ? (onOpen ? t("Carta adicionada à sua coleção") : t("Carta adicionada apenas nesta demonstração")) : t("Arraste uma ponta do topo para o outro lado")) }</span>
            </div>

            <div className={ `card-pack-reward reward-theme-${ reward?.design_key || 'founders' }` } aria-hidden={ phase !== 'revealed' }>
                <div className="card-pack-reward-rarity">{ t(reward?.rarity || t("LENDÁRIO")) }</div>
                <div className="card-pack-reward-art">
                    <span className="card-pack-reward-halo" aria-hidden="true" />
                    <LayoutAvatarImageView
                        figure={ reward?.figure || userFigure || '' }
                        direction={ 2 }
                        showLoading
                        loadingSize="small"
                        classNames={ [ 'card-pack-reward-avatar' ] } />
                </div>
                <div className="card-pack-reward-name">{ t(reward?.name || 'CYBER HERO') }</div>
                <div className="card-pack-reward-stats">
                    <span><b>{ reward?.power || 98 }</b> { t('PODER') }</span>
                    <span>{ t(reward?.series || 'SÉRIE 01') }</span>
                </div>
                { reward?.design_key === 'arcade' && <DeviceCardControls /> }
            </div>

            <div className="card-pack-shell" style={ design.style } aria-hidden={ phase === 'revealed' }>
                <svg className="card-pack-artwork-surface" viewBox="0 0 205 285" preserveAspectRatio="none" aria-hidden="true">
                    <defs>
                        { renderPackageArtwork(completeId, 0, tearDirection, design) }
                        { tearProgress > 0 && renderPackageArtwork(liftedId, tearProgress, tearDirection, design) }
                        <clipPath id={ topClipId } clipPathUnits="userSpaceOnUse">
                            <path d={ liftedTopClipPath } />
                        </clipPath>
                        <clipPath id={ bodyClipId } clipPathUnits="userSpaceOnUse">
                            <path d={ finishedBodyClipPath } />
                        </clipPath>
                        <clipPath id={ edgeClipId } clipPathUnits="userSpaceOnUse">
                            <rect x={ roundPointValue(edgeClipStart) } y="-60" width={ roundPointValue(edgeClipWidth) } height="180" />
                        </clipPath>
                        <clipPath id={ sealedClipId } clipPathUnits="userSpaceOnUse">
                            <rect x={ roundPointValue(sealedClipStart) } y="0" width={ roundPointValue(sealedClipWidth) } height="72" />
                        </clipPath>
                    </defs>

                    { tearProgress <= 0
                        ? <use href={ `#${ completeId }` } />
                        : <>
                            <use href={ `#${ completeId }` } clipPath={ `url(#${ bodyClipId })` } />
                            <g clipPath={ `url(#${ completeId }-outline)` }>
                                <g clipPath={ `url(#${ edgeClipId })` }>
                                    <path className="card-pack-torn-lower-shadow" d={ tornEdgePath } />
                                    <path className="card-pack-torn-lower-fiber" d={ tornEdgePath } />
                                </g>
                            </g>
                            <g className="card-pack-finished-top">
                                <use href={ `#${ liftedId }` } clipPath={ `url(#${ topClipId })` } />
                                <g clipPath={ `url(#${ liftedId }-outline)` }>
                                    <g clipPath={ `url(#${ edgeClipId })` }>
                                        <path className="card-pack-torn-upper-fiber" d={ tornUpperEdgePath } />
                                        <path className="card-pack-torn-upper-detail" d={ tornUpperEdgePath } />
                                    </g>
                                </g>
                            </g>
                        </> }
                    { cutProgress < 1 &&
                                <path className="card-pack-sealed-perforation" d={ sealedPerforationPath } clipPath={ `url(#${ sealedClipId })` } /> }
                </svg>
                <button
                    type="button"
                    className="card-pack-tear-strip"
                    aria-label={ t("Segure uma ponta do topo e arraste para o lado oposto para rasgar o pacote") }
                    disabled={ isBusy || phase === 'revealed' || (pack && pack.quantity < 1) }
                    onPointerDown={ onTearPointerDown }
                    onPointerMove={ onTearPointerMove }
                    onPointerUp={ onTearPointerUp }
                    onPointerCancel={ onTearPointerCancel }
                    onKeyDown={ onTearKeyDown } />
            </div>

            { (phase === 'opening' || phase === 'authorizing') &&
                        <div className="card-pack-opening-status">
                            <LayoutPixelLoadingView size="large" label={ t("Revelando card") } />
                            <strong>{ phase === 'authorizing' ? t("ABRINDO PACOTE...") : t("REVELANDO...") }</strong>
                        </div> }

            <div className="card-pack-action">
                { error && <div className="card-pack-error" role="alert">{ error }</div> }
                { phase === 'revealed'
                    ? <Button variant="success" disabled={ pack && pack.quantity < 1 } onClick={ resetPack }>{ pack && pack.quantity < 1 ? t("PACOTES ESGOTADOS") : t("ABRIR OUTRO PACOTE") }</Button>
                    : <Button variant="primary" disabled={ isBusy || (pack && pack.quantity < 1) } onClick={ () => startOpening() }>{ pack && pack.quantity < 1 ? t("PACOTES ESGOTADOS") : error ? t("Tentar novamente") : t("ABRIR SEM ARRASTAR") }</Button> }
            </div>
        </div>
    );

    if(embedded) return stage;

    return <NitroCardView uniqueKey="card-pack-opening" className="nitro-card-pack-opening" theme="primary-slim">
        <NitroCardHeaderView headerText="Abrir pacote de cards" onCloseClick={ closeWindow } />
        <NitroCardContentView overflow="hidden">{ stage }</NitroCardContentView>
    </NitroCardView>;
}
