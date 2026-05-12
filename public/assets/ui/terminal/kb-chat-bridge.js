(() => {
    function init() {
      const iframe = document.getElementById('nitro');
      if (!iframe) return;
  
      function installBridge() {
        try {
          const w = iframe.contentWindow;
          const d = iframe.contentDocument;
          if (!w) return;
  
          if (w.__kbSendChat) return;
  
          const pickInput = (doc) => {
            if (!doc) return null;
  
            return (
              doc.querySelector('#toolbar-chat-input-container input.chat-input') ||
              doc.querySelector('#toolbar-chat-input-container input') ||
              doc.querySelector('input.chat-input') ||
              doc.querySelector('input[placeholder*="chat" i]') ||
              doc.querySelector('input[placeholder*="convers" i]')
            );
          };
  
          const setNativeValue = (input, value) => {
            const proto = Object.getPrototypeOf(input);
            const desc = Object.getOwnPropertyDescriptor(proto, 'value');
            const setter = desc && desc.set;
            if (setter) setter.call(input, value);
            else input.value = value;
          };
  
          const fireEnterOnBody = (doc, shout) => {
            const win = doc.defaultView || window;
  
            doc.body.dispatchEvent(new win.KeyboardEvent('keydown', {
              key: 'Enter',
              code: 'Enter',
              bubbles: true,
              cancelable: true,
              shiftKey: !!shout
            }));
  
            doc.body.dispatchEvent(new win.KeyboardEvent('keyup', {
              key: 'Enter',
              code: 'Enter',
              bubbles: true,
              cancelable: true,
              shiftKey: !!shout
            }));
          };
  
          w.__kbSendChat = (message, shout = false) => {
            const text = (message ?? '').toString();
            if (!text.trim()) return false;
  
            const candidates = [
              { doc: d, name: 'iframe' },
              { doc: document, name: 'top' }
            ];
  
            for (const c of candidates) {
              const doc = c.doc;
              if (!doc || !doc.body) continue;
  
              const input = pickInput(doc);
              if (!input) continue;
  
              const ae = doc.activeElement;
              if (ae && ae !== input && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA')) {
                try { ae.blur(); } catch {}
              }
  
              try {
                const container = doc.querySelector('#toolbar-chat-input-container');
                if (container) container.click();
              } catch {}
  
              input.focus();
              setNativeValue(input, text);
  
              const win = doc.defaultView || window;
              input.dispatchEvent(new win.Event('input', { bubbles: true }));
              input.dispatchEvent(new win.Event('change', { bubbles: true }));
  
              fireEnterOnBody(doc, shout);
  
              console.log('[KBTERM] enviado via', c.name);
              return true;
            }
  
            console.warn('[KBTERM] input do chat não encontrado (iframe/top)');
            return false;
          };
  
          console.log('[KBTERM] Bridge __kbSendChat instalado');
        } catch (e) {
          console.warn('[KBTERM] Falha ao instalar bridge', e);
        }
      }
  
      iframe.addEventListener('load', installBridge);
      setTimeout(installBridge, 2000);
    }
  
    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  })();