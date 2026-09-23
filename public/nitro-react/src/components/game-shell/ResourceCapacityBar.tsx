import { CSSProperties, FC, useEffect, useRef, useState } from 'react';
import capacityBar from '../../assets/images/retro/resource-capacity-bar.png';

// The reference sprite is sampled at its native size, never stretched per cell.
export const RESOURCE_CELL = { width: 7, height: 12, gap: 3, inset: 8, start: 7 };

export const resourceBarLayout = (availableWidth: number, quantity: number, capacity: number) =>
{
    const width = Math.max(0, Math.floor(availableWidth));
    const innerWidth = Math.max(0, width - RESOURCE_CELL.inset * 2);
    const count = Math.max(0, Math.floor((innerWidth + RESOURCE_CELL.gap) / (RESOURCE_CELL.width + RESOURCE_CELL.gap)));
    const usedWidth = count ? count * (RESOURCE_CELL.width + RESOURCE_CELL.gap) - RESOURCE_CELL.gap : 0;
    const quantityUnits = Math.round(quantity * 1000);
    const capacityUnits = Math.round(capacity * 1000);
    const filled = capacityUnits > 0 ? Math.max(0, Math.min(count, Math.floor(quantityUnits * count / capacityUnits))) : 0;
    return { width, count, filled, usedWidth, left: RESOURCE_CELL.start };
};

export const ResourceBarArtwork: FC<{ width: number; quantity: number; capacity: number; loading?: boolean }> = ({ width, quantity, capacity, loading = false }) =>
{
    const layout = resourceBarLayout(width, quantity, capacity);
    const loaderCount = Math.min(3, layout.count);
    const loaderWidth = loaderCount ? loaderCount * (RESOURCE_CELL.width + RESOURCE_CELL.gap) - RESOURCE_CELL.gap : 0;
    const loaderStyle = {
        left: layout.left,
        width: layout.usedWidth,
        '--resource-loader-start': `-${ loaderWidth }px`,
        '--resource-loader-end': `${ layout.usedWidth }px`
    } as CSSProperties;

    return <span className={ `resource-capacity-art${ loading ? ' is-loading' : '' }` } style={ { width: layout.width, visibility: layout.width ? 'visible' : 'hidden' } } aria-hidden="true">
        <svg className="resource-capacity-empty" viewBox="0 0 1 13" preserveAspectRatio="none" focusable="false">
            <image href={ capacityBar } x="-130" y="-9" width="216" height="32" />
        </svg>
        <span className="resource-capacity-frame" style={ { borderImageSource: `url("${ capacityBar }")` } } />
        <span className="resource-capacity-fill" style={ { left: layout.left, gap: RESOURCE_CELL.gap } }>
            { Array.from({ length: layout.count }, (_, index) => <span key={ index } className={ !loading && index < layout.filled ? 'is-filled' : undefined } style={ { width: RESOURCE_CELL.width, height: RESOURCE_CELL.height } } />) }
        </span>
        { loading && (loaderCount > 0) && <span className="resource-capacity-loader-track" style={ loaderStyle }>
            <span className="resource-capacity-loader" style={ { gap: RESOURCE_CELL.gap } }>
                { Array.from({ length: loaderCount }, (_, index) => <span key={ index } style={ { width: RESOURCE_CELL.width, height: RESOURCE_CELL.height } } />) }
            </span>
        </span> }
    </span>;
};

export const ResourceCapacityBar: FC<{ label: string; quantity: number; capacity: number; loading?: boolean }> = ({ label, quantity, capacity, loading = false }) =>
{
    const element = useRef<HTMLDivElement>(null);
    const [ width, setWidth ] = useState(0);
    useEffect(() =>
    {
        const update = () => setWidth(Math.floor(element.current?.getBoundingClientRect().width || 0));
        update();
        const observer = new ResizeObserver(update);
        observer.observe(element.current);
        return () => observer.disconnect();
    }, []);
    return <div ref={ element } className="resource-capacity-bar" role="meter" aria-label={ label } aria-busy={ loading } aria-valuemin={ 0 } aria-valuemax={ capacity || 100 } aria-valuenow={ loading ? undefined : quantity }>
        <ResourceBarArtwork width={ width } quantity={ quantity } capacity={ capacity } loading={ loading } />
    </div>;
};
