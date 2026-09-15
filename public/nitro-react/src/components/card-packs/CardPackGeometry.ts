export const PACK_WIDTH = 205;
export const PACK_HEIGHT = 285;
export const COMPLETE_TEAR_PROGRESS = 1.12;
const PEEL_HEIGHT = 30;
const PEEL_RELEASE_HEIGHT = 8;

export type TearDirection = 'left-to-right' | 'right-to-left';

interface Point
{
    x: number;
    y: number;
}

interface PathPoint extends Point
{
    command: 'M' | 'L' | 'Z';
}

const sampledPaths = new Map<string, PathPoint[]>();

export const getTearFront = (progress: number, direction: TearDirection = 'right-to-left'): number =>
{
    const cutProgress = Math.max(0, Math.min(1, progress));

    return PACK_WIDTH * (direction === 'left-to-right' ? cutProgress : 1 - cutProgress);
}

export const getPeelOffset = (x: number, progress: number, direction: TearDirection = 'right-to-left'): number =>
{
    const cutProgress = Math.max(0, Math.min(1, progress));

    if(cutProgress <= 0) return 0;

    const front = getTearFront(progress, direction);
    const distance = direction === 'left-to-right' ? front - x : x - front;
    const amount = Math.max(0, Math.min(1, distance / (PACK_WIDTH * cutProgress)));
    const releaseProgress = Math.max(0, Math.min(1, (progress - 1) / (COMPLETE_TEAR_PROGRESS - 1)));

    // Extra travel only after the cut reaches the far edge releases the last attached tip.
    const releaseLift = PEEL_RELEASE_HEIGHT * releaseProgress * releaseProgress * (3 - 2 * releaseProgress);

    // Zero slope at the attached end; the same offset bends every layer of the artwork.
    return -PEEL_HEIGHT * cutProgress * amount * amount - releaseLift;
}

// These artwork paths use absolute M/L/H/V/C/Z commands. Sample geometry, never image strips.
const samplePath = (path: string): PathPoint[] =>
{
    const cached = sampledPaths.get(path);

    if(cached) return cached;

    const tokens = path.match(/[MLHVCZ]|-?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi) || [];
    const points: PathPoint[] = [];
    let cursor: Point = { x: 0, y: 0 };
    let start = cursor;
    let index = 0;
    const number = () => Number(tokens[index++]);
    const lineTo = (end: Point) =>
    {
        const from = cursor;
        const count = Math.max(1, Math.ceil(Math.abs(end.x - from.x) / 2));

        for(let step = 1; step <= count; step++)
        {
            const t = step / count;

            points.push({ command: 'L', x: from.x + (end.x - from.x) * t, y: from.y + (end.y - from.y) * t });
        }

        cursor = end;
    };

    while(index < tokens.length)
    {
        const command = tokens[index++];

        switch(command)
        {
            case 'M':
                cursor = { x: number(), y: number() };
                start = cursor;
                points.push({ ...cursor, command: 'M' });
                break;
            case 'L':
                lineTo({ x: number(), y: number() });
                break;
            case 'H':
                lineTo({ x: number(), y: cursor.y });
                break;
            case 'V':
                lineTo({ x: cursor.x, y: number() });
                break;
            case 'C':
            {
                const from = cursor;
                const first = { x: number(), y: number() };
                const second = { x: number(), y: number() };
                const end = { x: number(), y: number() };
                const count = Math.max(12, Math.ceil((Math.abs(first.x - from.x) + Math.abs(second.x - first.x) + Math.abs(end.x - second.x)) / 2));

                for(let step = 1; step <= count; step++)
                {
                    const t = step / count;
                    const u = 1 - t;

                    points.push({
                        command: 'L',
                        x: u ** 3 * from.x + 3 * u * u * t * first.x + 3 * u * t * t * second.x + t ** 3 * end.x,
                        y: u ** 3 * from.y + 3 * u * u * t * first.y + 3 * u * t * t * second.y + t ** 3 * end.y
                    });
                }

                cursor = end;
                break;
            }
            case 'Z':
                lineTo(start);
                points.push({ ...start, command: 'Z' });
                break;
            default:
                throw new Error(`Unsupported package path command: ${ command }`);
        }
    }

    sampledPaths.set(path, points);
    return points;
}

export const bendPackagePath = (path: string, progress: number, direction: TearDirection = 'right-to-left'): string =>
{
    if(progress <= 0) return path;

    return samplePath(path).map(point => point.command === 'Z' ? 'Z' :
        `${ point.command } ${ point.x.toFixed(2) } ${ (point.y + getPeelOffset(point.x, progress, direction)).toFixed(2) }`).join(' ');
}

export const getPackageColorBand = (offset: number): string =>
{
    // Match the original diagonal gradient's hard color stops with deformable vector areas.
    const dx = 178;
    const dy = 285;
    const projection = offset * (dx * dx + dy * dy);
    const yLeft = (projection + 12 * dx) / dy;
    const yRight = (projection - (PACK_WIDTH - 12) * dx) / dy;

    return `M 0 ${ yLeft } L ${ PACK_WIDTH } ${ yRight } V ${ PACK_HEIGHT } H 0 Z`;
}
