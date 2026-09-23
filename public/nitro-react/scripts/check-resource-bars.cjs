// Run with node scripts/check-resource-bars.cjs. Outputs stay outside the public web root.
const fs = require('fs');
const path = require('path');
const Module = require('module');
const { spawn } = require('child_process');
const assert = require('assert');
const { pathToFileURL } = require('url');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const babel = require('@babel/core');
const sass = require('sass');
const WebSocket = require('ws');
const root = path.resolve(__dirname, '..');
const output = path.resolve(root, '../../storage/app/resource-bar-check');
const profile = path.join(output, `chrome-${process.pid}`);
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const png = fs.readFileSync(path.join(root, 'src/assets/images/retro/resource-capacity-bar.png'));
const sprite = 'data:image/png;base64,' + png.toString('base64');
Module._extensions['.png'] = module => { module.exports = sprite; };
Module._extensions['.tsx'] = (module, filename) => module._compile(babel.transformSync(fs.readFileSync(filename, 'utf8'), {
    filename, babelrc: false, configFile: false,
    presets: [[require.resolve('@babel/preset-env'), { targets: { node: 'current' } }], [require.resolve('@babel/preset-react'), { runtime: 'automatic' }], require.resolve('@babel/preset-typescript')]
}).code, filename);
const { ResourceBarArtwork, resourceBarLayout } = require(path.join(root, 'src/components/game-shell/ResourceCapacityBar.tsx'));
const { GameIcon } = require(path.join(root, 'src/components/game-shell/GameIcon.tsx'));
const css = [
    sass.renderSync({ file: path.join(root, 'src/components/card-packs/CardDecksView.scss') }).css.toString(),
    sass.renderSync({ file: path.join(root, 'src/assets/styles/retro/_desktop.scss') }).css.toString()
].join('\n')
    .replace(/url\(['"]?\.\.\/\.\.\/images\/retro\/resource-capacity-bar\.png['"]?\)/g, `url("${sprite}")`);
const widths = [69.33, 105.67, 147.875, 202.8, 216];
const content = widths.map(width => `<section><strong>${width}px available</strong>${[32, 100].map(quantity => `<div class="sample" data-quantity="${quantity}" style="width:${width}px">${renderToStaticMarkup(React.createElement(ResourceBarArtwork, { width, quantity, capacity: 100 }))}</div>`).join('')}</section>`).join('');
const loading = renderToStaticMarkup(React.createElement(ResourceBarArtwork, { width: 216, quantity: 0, capacity: 0, loading: true }));
const icons = ['folder', 'trash', 'shop'].map(name => `<figure><div class="icon-${name}">${renderToStaticMarkup(React.createElement(GameIcon, { name }))}</div><figcaption>${name}</figcaption></figure>`).join('');
const folderIcon = renderToStaticMarkup(React.createElement(GameIcon, { name: 'folder' }));
const trashIcon = renderToStaticMarkup(React.createElement(GameIcon, { name: 'trash' }));
const folderTile = name => `<button class="collection-deck-tile"><div class="collection-deck-cover collection-folder">${folderIcon}</div><strong>${name}</strong></button>`;
const trashTile = `<button class="collection-deck-tile collection-deck-trash-tile"><div class="collection-deck-cover collection-trash">${trashIcon}</div><strong>Lixeira</strong></button>`;
fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(path.join(output, 'bars.html'), `<!doctype html><html data-game-theme="dark"><meta charset="utf-8"><style>${css}*{box-sizing:border-box}body{background:#303030;color:#eee;padding:16px;font:14px 'Lucida Console',monospace}main{display:flex;gap:24px;flex-wrap:wrap}.sample{position:relative;height:32px}section{width:225px;padding:12px;background:#414141}strong{display:block;margin-bottom:12px;font-size:12px}h1{font-size:16px}.loading-sample{width:216px}.icon-check{display:flex;gap:28px;align-items:end}.icon-check figure{margin:0;text-align:center}.icon-check .game-pixel-icon{display:block;width:96px;height:96px;margin-bottom:6px}.icon-check .icon-shop .game-pixel-icon{width:64px;height:64px;margin:0 16px 6px}.deck-layout-check{display:flex;width:760px;height:520px;border:1px solid #777;background:#222}.deck-layout-check section{width:auto;background:transparent}.deck-layout-check .collection-deck-list{width:100%}</style><body class="cyber-retro-ui"><h1>Original PNG</h1><img src="${sprite}" width="216" height="32"><h1>Same source cell, integer widths and gaps (32% / 100%)</h1><main>${content}</main><h1>Three-cell loading sweep</h1><div class="sample loading-sample">${loading}</div><h1>Collection pixel icons</h1><div class="icon-check">${icons}</div><h1>Deck desktop positioning</h1><div class="nitro-card-collection"><div class="deck-layout-check collection-decks-layout"><section class="collection-deck-library"><div class="collection-deck-list">${folderTile('Deck 1')}${folderTile('Deck 2')}</div>${trashTile}</section></div></div></body></html>`);

(async () => {
    assert(!fs.existsSync(profile), 'Use a fresh, owned browser profile');
    const chrome = spawn(process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
    let ws;
    let send;
    try {
        const portFile = path.join(profile, 'DevToolsActivePort');
        for(let i = 0; i < 150 && !fs.existsSync(portFile); i++) await pause(200);
        const port = fs.readFileSync(portFile, 'utf8').split('\n')[0];
        const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
        ws = new WebSocket(target.webSocketDebuggerUrl);
        await new Promise((resolve, reject) => { ws.on('open', resolve); ws.on('error', reject); });
        let id = 0;
        const pending = new Map();
        ws.on('message', raw => { const message = JSON.parse(raw); const task = pending.get(message.id); if(task) { pending.delete(message.id); message.error ? task.reject(message.error) : task.resolve(message.result); } });
        send = (method, params = {}) => new Promise((resolve, reject) => { const key = ++id; pending.set(key, { resolve, reject }); ws.send(JSON.stringify({ id: key, method, params })); });
        const evaluate = async expression => { const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if(result.exceptionDetails) throw Error(result.exceptionDetails.text); return result.result.value; };
        await send('Page.enable');
        await send('Emulation.setDeviceMetricsOverride', { width: 810, height: 1260, deviceScaleFactor: 1, mobile: false });
        await send('Page.navigate', { url: pathToFileURL(path.join(output, 'bars.html')).href });
        for(let i = 0; i < 100; i++) { if(await evaluate('document.querySelectorAll(".sample").length === 10')) break; await pause(100); }
        await evaluate('Promise.all([...document.images].map(image => image.decode().catch(() => {})))');
        const deckLayout = await evaluate(`(() => {
            const libraryElement = document.querySelector('.deck-layout-check .collection-deck-library');
            const library = libraryElement.getBoundingClientRect();
            const libraryStyle = getComputedStyle(libraryElement);
            const first = document.querySelector('.deck-layout-check .collection-deck-tile:not(.collection-deck-trash-tile)').getBoundingClientRect();
            const trash = document.querySelector('.deck-layout-check .collection-deck-trash-tile').getBoundingClientRect();
            const firstElement = document.querySelector('.deck-layout-check .collection-deck-tile:not(.collection-deck-trash-tile)');
            const icon = firstElement.querySelector('.game-pixel-icon').getBoundingClientRect();
            return { right: Math.abs(library.right - parseFloat(libraryStyle.paddingRight) - trash.right), bottom: Math.abs(library.bottom - parseFloat(libraryStyle.paddingBottom) - trash.bottom), below: trash.top > first.bottom, widths: [first.width, trash.width], icon: [icon.width, icon.height], padding: parseFloat(getComputedStyle(firstElement).paddingLeft) };
        })()`);
        assert(deckLayout.right < 1, JSON.stringify(deckLayout)); assert(deckLayout.bottom < 1, JSON.stringify(deckLayout)); assert(deckLayout.below, JSON.stringify(deckLayout)); assert.deepEqual(deckLayout.widths, [116, 116]); assert.deepEqual(deckLayout.icon, [72, 72]); assert.equal(deckLayout.padding, 6);
        for(const theme of ['dark', 'purple', 'light']) {
            await evaluate(`document.documentElement.dataset.gameTheme = '${theme}'`);
            const checks = await evaluate(`Array.from(document.querySelectorAll('.sample')).map(sample => {
                const art = sample.querySelector('.resource-capacity-art');
                const cells = [...sample.querySelectorAll('.resource-capacity-fill > span')];
                return { width: art.getBoundingClientRect().width, start: cells.length ? cells[0].getBoundingClientRect().left - art.getBoundingClientRect().left : null, cells: cells.map((cell, index) => {
                    const rect = cell.getBoundingClientRect(); const previous = cells[index - 1]?.getBoundingClientRect();
                    return { width: rect.width, height: rect.height, left: rect.left, gap: previous ? rect.left - previous.right : 3, mask: getComputedStyle(cell).maskImage, maskMode: getComputedStyle(cell).maskMode };
                }) };
            })`);
            for(const bar of checks) {
                if(bar.cells.length) assert.equal(bar.start, resourceBarLayout(bar.width, 32, 100).left);
                for(const cell of bar.cells) {
                    assert.equal(cell.width, 7); assert.equal(cell.height, 12); assert.equal(cell.gap, 3);
                    assert(Number.isInteger(cell.left)); assert(cell.mask.startsWith('url(')); assert.equal(cell.maskMode, 'luminance');
                }
            }
            const loader = await evaluate(`(() => {
                const element = document.querySelector('.resource-capacity-loader');
                return { animation: getComputedStyle(element).animationName, cells: [...element.children].map(cell => {
                    const style = getComputedStyle(cell); return { width: parseFloat(style.width), height: parseFloat(style.height) };
                }) };
            })()`);
            assert.equal(loader.animation, 'resource-capacity-loading');
            assert.equal(loader.cells.length, 3);
            for(const cell of loader.cells) { assert.equal(cell.width, 7); assert.equal(cell.height, 12); }
            const frame = await evaluate(`(() => { const element = document.querySelector('.resource-capacity-frame'); const track = document.querySelector('.resource-capacity-empty'); const image = track.querySelector('image'); const style = getComputedStyle(track); const overlay = getComputedStyle(document.querySelector('.resource-capacity-art'), '::after'); return { filter: getComputedStyle(element).filter, imageOpacity: getComputedStyle(image).opacity, backgroundImage: style.backgroundImage, backgroundColor: style.backgroundColor, overlayColor: overlay.backgroundColor, overlayTop: overlay.top, overlayHeight: overlay.height }; })()`);
            assert.equal(frame.imageOpacity, theme === 'dark' ? '0' : '1');
            assert.equal(frame.filter === 'none', theme !== 'dark');
            if(theme === 'dark') { assert.equal(frame.backgroundImage, 'none'); assert.equal(frame.backgroundColor, 'rgb(16, 43, 75)'); assert.equal(frame.overlayColor, frame.backgroundColor); assert.equal(frame.overlayTop, '8px'); assert.equal(frame.overlayHeight, '14px'); }
            await pause(350);
            const shot = await send('Page.captureScreenshot', { format: 'png' });
            fs.writeFileSync(path.join(output, `${theme}.png`), Buffer.from(shot.data, 'base64'));
            console.log(`${theme}: all ${checks.length} bars keep 7x12px cells and the loading sweep has exactly three cells.`);
        }
    } finally {
        if(ws?.readyState === WebSocket.OPEN && send) await Promise.race([send('Browser.close').catch(() => {}), pause(2000)]);
        ws?.close();
        await pause(1000);
        if(chrome.exitCode === null) chrome.kill();
        // Delete only this run's generated profile; keep the screenshots as test evidence.
        if(path.dirname(profile) === output && path.basename(profile) === `chrome-${process.pid}`) {
            try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); }
            catch { console.warn('Chrome profile is still locked; screenshots and measurements are saved.'); }
        }
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
