(function () {
  const LOG = (...a) => console.log("[KB]", ...a);

  // ===== Config (o Blade deve setar window.__kbWsUrl e window.__kbUsername) =====
  function getWsUrl() {
    return window.__kbWsUrl || `ws://${window.location.hostname}:2097`;
  }

  function getUsername() {
    return window.__kbUsername || null;
  }

  // ===== WS (lazy connect + queue) =====
  let ws = null;
  let connecting = false;
  let queue = [];

  function ensureWs() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
    if (connecting) return;

    connecting = true;
    const url = getWsUrl();

    try {
      ws = new WebSocket(url);

      ws.onopen = () => {
        connecting = false;
        LOG("WS connected:", url);

        if (queue.length) {
          const copy = queue.slice(0);
          queue = [];
          copy.forEach((p) => {
            try {
              ws.send(JSON.stringify(p));
              LOG("SENT(queued):", p);
            } catch (e) {
              LOG("send queued error:", e);
            }
          });
        }
      };

      ws.onmessage = (e) => LOG("SERVER:", e.data);

      ws.onerror = (e) => {
        connecting = false;
        LOG("WS error:", e);
      };

      ws.onclose = (e) => {
        connecting = false;
        LOG("WS closed:", e.code, e.reason);
        ws = null;
      };
    } catch (err) {
      connecting = false;
      LOG("ensureWs error:", err);
    }
  }

  // função pública que você testou manualmente
  window.__kbSendMove = function (direction) {
    const username = getUsername();
    if (!username) {
      LOG("missing username. set window.__kbUsername = 'teste123'");
      return;
    }

    const payload = { type: "move", username, direction };

    ensureWs();

    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(payload));
        LOG("SENT:", payload);
      } catch (e) {
        LOG("send error:", e);
      }
      return;
    }

    queue.push(payload);
    LOG("queued (ws not open yet):", payload);
  };

  // ===== Key mapping =====
  const mapKeyToDir = (e) => {
    const k = (e.key || "").toLowerCase();
    if (k === "w") return "se"; // W desce
    if (k === "d") return "ne";
    if (k === "s") return "nw"; // S sobe
    if (k === "a") return "sw";
    return null;
  };
  

  function isTypingTarget(target) {
    if (!target) return false;
    const tag = (target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return true;
    if (target.isContentEditable) return true;
    return false;
  }

  function onKeyDown(e) {
    const dir = mapKeyToDir(e);
    if (!dir) return;

    // se estiver digitando em algum input, não sequestra WASD
    if (isTypingTarget(e.target)) return;

    // evita repetição segurando a tecla
    if (e.repeat) return;

    // IMPORTANTÍSSIMO: captura e bloqueia default do Nitro
    e.preventDefault();
    e.stopPropagation();

    LOG("keydown:", e.key, "->", dir);
    if (typeof window.__kbSendMove === "function") window.__kbSendMove(dir);
  }

  // ===== Attach inside iframe (parte crítica) =====
  function attachToNitroIframe() {
    const iframe = document.getElementById("nitro");
    if (!iframe) {
      LOG("iframe #nitro not found yet");
      return;
    }

    const doAttach = () => {
      try {
        const win = iframe.contentWindow;
        const doc = iframe.contentDocument || (win ? win.document : null);

        if (!win || !doc) {
          LOG("iframe contentWindow/contentDocument not ready");
          return;
        }

        // remove antes pra não duplicar
        win.removeEventListener("keydown", onKeyDown, true);
        doc.removeEventListener("keydown", onKeyDown, true);

        // captura em CAPTURE=true pra pegar antes do Nitro
        win.addEventListener("keydown", onKeyDown, true);
        doc.addEventListener("keydown", onKeyDown, true);

        LOG("key listeners attached inside iframe (capture=true)");
      } catch (err) {
        LOG("cannot access iframe document (cross-origin?)", err);
      }
    };

    // quando carregar
    iframe.addEventListener("load", () => {
      LOG("iframe loaded");
      doAttach();
      // reattach após um tempinho (alguns clientes trocam doc internamente)
      setTimeout(doAttach, 500);
      setTimeout(doAttach, 1500);
    });

    // se já estiver carregado
    setTimeout(doAttach, 500);
    setTimeout(doAttach, 1500);

    // garantir foco ao clicar no iframe (ajuda MUITO)
    iframe.setAttribute("tabindex", "0");
    iframe.addEventListener("pointerdown", () => {
      try { iframe.focus(); } catch (_) {}
    });
  }

  // ===== Boot =====
  function boot() {
    LOG("boot", { wsUrl: getWsUrl(), username: getUsername() });
    attachToNitroIframe();

    // opcional: já tenta conectar WS
    ensureWs();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
