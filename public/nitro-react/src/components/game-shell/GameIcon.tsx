import { FC } from 'react';

export const GameIcon: FC<{ name: string; className?: string }> = ({ name, className = '' }) =>
{
    const folder = ['folder', 'collection', 'decks', 'add', 'manage', 'create'].includes(name);
    const trash = name === 'trash';
    return <svg className={ `game-pixel-icon ${ folder ? 'game-folder-icon ' : trash ? 'game-trash-icon ' : '' }${ className }` } viewBox={ folder || trash ? '0 0 48 48' : '0 0 32 32' } aria-hidden="true" focusable="false" shapeRendering="crispEdges">
        { folder ? <g stroke="#25251f" strokeWidth="1" strokeLinejoin="miter">
            {/* Redrawn on the pixel grid: a shallower front face, without skewing the SVG. */}
            <path d="M5 12V4l10-1 6 4 12-2 7 6v25l-26 5-9-7Z" fill="#b87732" />
            <path d="M7 13V6l8-1 6 4 12-2 5 5v22l-24 4-7-5Z" fill="#e8b756" stroke="none" />
            <path d="m15 13 16-3 5 4v22l-16 3-5-4Z" fill="#b6c6a3" />
            <path d="m15 13 5 4 16-3M20 17v22" fill="none" stroke="#e9efd0" />
            <path d="m9 15 16-3 5 4v22l-16 3-5-4Z" fill="#53a59a" />
            <path d="m9 15 5 4 16-3M14 19v22" fill="none" stroke="#b0ded0" />
            <path d="M17 21h2v-4l4-1v4h2v6l-8 1Z" fill="#285a58" stroke="none" />
            <path d="m22 20 12-2 5 4v17l-12 2-5-4Z" fill="#f6e9bd" />
            <path d="m22 20 5 4 12-2M27 24v17" fill="none" stroke="#fff9e1" />
            <path d="m29 26 7-2v6l-7 2Z" fill="#b85660" stroke="none" />
            <path d="m4 19 6 5 32-6-4 21-28 5-6-5Z" fill="#b97b32" />
            <path d="m10 24 32-6-4 21-28 5Z" fill="#efbd53" />
            <path d="m11 25 29-6-1 3-27 5Z" fill="#ffe999" stroke="none" />
            <path d="m12 39 25-5-1 4-24 4Z" fill="#d99639" stroke="none" />
            <path d="m6 24 2 1v13l-2-1Z" fill="#dfaa49" stroke="none" />
            <path d="m23 30 10-2v5l-10 2Z" fill="#fff0c2" stroke="#9b642e" />
            <path d="m25 31 6-1m-6 3 4-1" fill="none" stroke="#b58b53" />
        </g> : trash ? <g stroke="#25251f" strokeWidth="1" strokeLinejoin="miter">
            <path d="m10 18 28-5 4 4-5 24-22 4-6-6Z" fill="#3b4b54" />
            <path d="m12 20 24-4 3 3-4 20-19 3-4-4Z" fill="#83939a" stroke="none" />
            <path d="m16 22 19-3-3 17-15 3Z" fill="#afbbbd" />
            <path d="m18 23 4-1-2 15-3 1Zm7-2 4-1-2 16-4 1Zm7-1 3-1-3 15-3 1Z" fill="#e0e6e3" stroke="none" />
            <path d="m12 20 5 3 19-3m-20 3-1 19m21-22 3 2" fill="none" stroke="#dce4e0" />
            <path d="m10 14 25-5 6 4-1 5-25 5-6-4Z" fill="#53666e" />
            <path d="m12 15 22-4 5 3-1 2-23 5-5-3Z" fill="#b0bbbd" />
            <path d="m15 18 22-4 2 1-23 5Z" fill="#e6ebe7" stroke="none" />
            <path d="m18 9 12-2 4 3-1 3-13 2-5-3Z" fill="#687a82" />
            <path d="m20 10 9-1 2 2-10 2-3-1Z" fill="#ccd5d2" stroke="none" />
            <path d="m10 29 5 4m-5 2 5 4m21-11 3-1" fill="none" stroke="#53656d" />
        </g> : name === 'cards' ? <g stroke="#34283e" strokeWidth="1.5"><path d="M4 8h18v22H4Z" fill="#59bcae" /><path d="M10 2h18v24H10Z" fill="#fff0ce" /><path d="M13 6h12v12H13Z" fill="#e87899" /><path d="M14 21h9" /></g>
            : name === 'packs' ? <g stroke="#34283e" strokeWidth="1.5"><path d="m7 3 3 2 3-2 3 2 3-2 3 2 3-2v26l-3-2-3 2-3-2-3 2-3-2-3 2Z" fill="#ed8c56" /><path d="M8 8h16M8 24h16" stroke="#ffdb88" /><path d="m16 11 5 6-5 5-5-5Z" fill="#f7d583" /></g>
                : name === 'shop' || name === 'market' ? <g stroke="#292825" strokeWidth="1.5" strokeLinejoin="miter">
                    <path d="M2 4h6l2 5h19l-3 12-14 3-4-17H2Z" fill="#d9a448" />
                    <path d="m10 10 17 0-2 8-13 3Z" fill="#57a99f" />
                    <path d="m12 12 3 8m3-8 1 7m5-7-2 6M11 21h14" fill="none" stroke="#bce3cd" />
                    <path d="M12 24h14v3H12Z" fill="#f0c760" />
                    <path d="M11 27h5v4h-5Zm12 0h5v4h-5Z" fill="#435862" />
                    <path d="M12 28h3m9 0h3" stroke="#dce7df" />
                </g>
                    : name === 'open' ? <g stroke="#34283e" strokeWidth="1.5"><path d="M4 12h24v17H4Z" fill="#e0aa52" /><path d="m4 12 7-8h15l2 8M16 5v16m-5-5 5 5 5-5" fill="none" /><path d="M8 24h16" /></g>
                        : name === 'sell' ? <g stroke="#393124" strokeWidth="1.5" strokeLinejoin="miter"><path d="M5 20h22v7l-5 3H10l-5-3Z" fill="#bc843b" /><path d="M5 23h22M10 24v4m6-4v5m6-5v4" fill="none" /><path d="M10 3h12l6 6v10l-6 6H10l-6-6V9Z" fill="#efc45f" /><path d="M11 6h10l4 4v8l-4 4H11l-4-4v-8Z" fill="#ffe398" /><path d="M20 10h-7v4h6v4h-7m4-10v12" fill="none" strokeWidth="2" /></g>
                            : name === 'share' ? <g stroke="#303640" strokeWidth="1.5" strokeLinejoin="miter"><path d="M5 11h13v16H5Z" fill="#e6b856" /><path d="M12 7h8V3l8 7-8 7v-4h-8Z" fill="#66b2a8" /><path d="M8 15h7m-7 4h7m-7 4h7" stroke="#fff0b8" /></g>
                            : name === 'restore' ? <g stroke="#303640" strokeWidth="1.5" strokeLinejoin="miter"><path d="M6 13h20v15H6Z" fill="#d8aa4e" /><path d="M9 18h14" stroke="#fff0b8" /><path d="M16 16V8h-5l7-6 7 6h-5v8Z" fill="#64b2a4" /></g>
                            : name === 'about' ? <g stroke="#303640" strokeWidth="2"><circle cx="16" cy="16" r="13" fill="#8cc6d5" /><path d="M14 8h4v4h-4Zm0 7h4v9h-4Zm-2 9h8v2h-8Z" fill="#303640" stroke="none" /></g>
                                : name === 'new-tab' ? <g stroke="#34283e" strokeWidth="2"><path d="M5 5h22v22H5Z" fill="#9db3ce" /><path d="M16 9v14M9 16h14" /></g>
                : name === 'data' || name === 'skills' ? <g stroke="#322c46" strokeWidth="2"><path d="M8 8h16v16H8Z" fill="#89ded8" /><path d="M12 12h8v8h-8Z" fill="#334b66" /><path d="M11 3v5m5-5v5m5-5v5M11 24v5m5-5v5m5-5v5M3 11h5m-5 5h5m-5 5h5m16-10h5m-5 5h5m-5 5h5" stroke="#89ded8" /></g>
                    : name === 'gas' ? <g stroke="#352c46" strokeWidth="2"><path d="M12 3h8v4h-8Z" fill="#f0cc70" /><path d="M8 11l4-4h8l4 4v17H8Z" fill="#d28deb" /><path d="M9 14h14v8H9Z" fill="#835791" /><path d="M12 11v14" stroke="#f5c4f6" /></g>
                        : name === 'iron' || name === 'gold' ? <g stroke="#352c46" strokeWidth="1.5"><path d="m8 11 15-3 6 12-15 5-11-3Z" fill={ name === 'gold' ? '#e7af42' : '#88a6b7' } /><path d="m8 11 12-2 4 8-12 3Z" fill={ name === 'gold' ? '#ffe391' : '#d4e9e8' } /><path d="m12 20 2 5m10-8 5 3" /></g>
                            : name === 'audio' ? <g fill="#88d4cc" stroke="#34283e" strokeWidth="2"><path d="M4 12h6l8-7v22l-8-7H4Z" /><path d="M22 10q8 6 0 12m2-16q13 10 0 20" fill="none" stroke="#ed9bb7" /></g>
                                : name === 'controls' ? <g stroke="#34283e" strokeWidth="1.5"><path d="M2 8h28v17H2Z" fill="#b7bcc8" /><path d="M6 12h3m3 0h3m3 0h3m3 0h3M6 16h3m3 0h3m3 0h3m3 0h3M9 21h15" stroke="#4d4961" strokeWidth="2" /></g>
                                    : name === 'appearance' ? <g stroke="#34283e" strokeWidth="1.5"><path d="M3 4h26v20H3Z" fill="#9db3ce" /><path d="M6 7h20v14H6Z" fill="#e891b3" /><path d="M16 7h10v14H16Z" fill="#45526a" /><path d="M13 24v4h-4 14-4v-4" fill="#9db3ce" /></g>
                                        : name === 'remove' || name === 'delete' ? <g stroke="#34283e" strokeWidth="2" fill="#d58e9c"><path d="M8 9h16l-2 19H10Z" /><path d="M6 8h20M12 5h8M13 12v12m6-12v12" /></g>
                                            : <g stroke="#34283e" strokeWidth="2" fill="#a2c2ca"><path d="m12 3 8 0 1 5 5 1 3 7-4 4v6l-8 3-4-4H7l-4-8 4-4V7Z" /><path d="M12 12h8v8h-8Z" fill="#e597b0" /></g> }
    </svg>;
};
