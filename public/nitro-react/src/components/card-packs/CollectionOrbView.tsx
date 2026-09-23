import { FC, useEffect, useRef } from 'react';

export const CollectionOrbView: FC = () =>
{
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() =>
    {
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if(!context) return;
        // Supersample the fine wireframe so subpixel movement stays smooth at game UI scale.
        const scale = Math.max(3, Math.min(window.devicePixelRatio || 1, 4));
        canvas.width = 48 * scale;
        canvas.height = 40 * scale;
        context.scale(scale, scale);
        context.lineCap = 'round';
        context.lineWidth = .8;
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        let frame = 0;
        let lastFrame: number = null;
        let angle = .5;
        const turn = Math.PI * 2;
        const radius = 16;
        const tilt = .3;

        const point = (latitude: number, longitude: number) =>
        {
            const x = Math.cos(latitude) * Math.sin(longitude + angle);
            const y = Math.sin(latitude);
            const z = Math.cos(latitude) * Math.cos(longitude + angle);
            return { x: 24 + x * radius, y: 20 + (y * Math.cos(tilt) - z * Math.sin(tilt)) * radius, z: z * Math.cos(tilt) + y * Math.sin(tilt) };
        };

        const draw = () =>
        {
            context.clearRect(0, 0, 48, 40);
            context.strokeStyle = 'rgba(145, 203, 179, .4)';
            context.beginPath();
            context.arc(24, 20, radius, 0, turn);
            context.stroke();
            for(let band = 1; band < 6; band++)
            {
                const latitude = -Math.PI / 2 + band * Math.PI / 6;
                const ringRadius = radius * Math.cos(latitude);
                context.beginPath();
                context.ellipse(24, 20 + radius * Math.sin(latitude) * Math.cos(tilt), ringRadius, ringRadius * Math.sin(tilt), 0, 0, turn);
                context.stroke();
            }
            // Stroke each meridian once; overlapping segment caps caused dotted, flickering lines.
            for(let meridian = 0; meridian < 10; meridian++)
            {
                const longitude = meridian * turn / 10;
                const depth = (Math.cos(longitude + angle) + 1) / 2;
                const opacity = .15 + .7 * depth * depth * (3 - 2 * depth);
                context.strokeStyle = meridian === 0 ? `rgba(224, 181, 122, ${ opacity })` : `rgba(145, 203, 179, ${ opacity })`;
                context.beginPath();
                for(let step = 0; step <= 48; step++)
                {
                    const vertex = point(-Math.PI / 2 + step * Math.PI / 48, longitude);
                    if(step === 0) context.moveTo(vertex.x, vertex.y);
                    else context.lineTo(vertex.x, vertex.y);
                }
                context.stroke();
            }

            // One highlighted meridian and marker make each complete turn easy to follow.
            const marker = point(0, 0);
            context.fillStyle = `rgba(246, 205, 147, ${ .18 + .82 * (marker.z + 1) / 2 })`;
            context.beginPath();
            context.arc(marker.x, marker.y, 1.25, 0, turn);
            context.fill();
        };
        const tick = (time: number) =>
        {
            if(lastFrame !== null) angle = (angle + (time - lastFrame) * turn / 6000) % turn;
            lastFrame = time;
            draw();
            frame = requestAnimationFrame(tick);
        };
        const sync = () =>
        {
            cancelAnimationFrame(frame);
            lastFrame = null;
            draw();
            if(!reducedMotion.matches && !document.hidden) frame = requestAnimationFrame(tick);
        };
        sync();
        reducedMotion.addEventListener('change', sync);
        document.addEventListener('visibilitychange', sync);
        return () =>
        {
            cancelAnimationFrame(frame);
            reducedMotion.removeEventListener('change', sync);
            document.removeEventListener('visibilitychange', sync);
        };
    }, []);

    return <canvas ref={ canvasRef } className="collection-orb" aria-hidden="true" />;
};
