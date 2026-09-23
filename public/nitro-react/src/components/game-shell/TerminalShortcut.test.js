const fs = require('fs');
const path = require('path');

test('CMS terminal respects the selected key, text fields and keybinding capture', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '../../../../assets/ui/terminal/kb-terminal-chat.js'), 'utf8');
    localStorage.setItem('cyber-game-preferences', JSON.stringify({ terminal_key: 'KeyT' }));
    window.eval(source);
    window.KBTerminalChat.init({ iframeId: 'isolated-nonexistent-game' });
    const terminal = document.querySelector('.kb-chat-term');
    const press = (target, key, code) => target.dispatchEvent(new KeyboardEvent('keydown', { key, code, bubbles: true, cancelable: true }));
    press(document.body, 'c', 'KeyC');
    expect(terminal.classList.contains('kb-open')).toBe(false);
    const input = document.createElement('input');
    document.body.appendChild(input);
    press(input, 't', 'KeyT');
    expect(terminal.classList.contains('kb-open')).toBe(false);
    document.documentElement.dataset.keybindingCapture = 'true';
    press(document.body, 't', 'KeyT');
    expect(terminal.classList.contains('kb-open')).toBe(false);
    delete document.documentElement.dataset.keybindingCapture;
    press(document.body, 't', 'KeyT');
    expect(terminal.classList.contains('kb-open')).toBe(true);
    press(document.body, 'Escape', 'Escape');
    expect(terminal.classList.contains('kb-open')).toBe(false);
    localStorage.setItem('cyber-game-preferences', JSON.stringify({ terminal_key: 'KeyW' }));
    press(document.body, 'w', 'KeyW');
    expect(terminal.classList.contains('kb-open')).toBe(false);
});
