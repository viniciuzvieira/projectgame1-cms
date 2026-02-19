(function () {
  const LOG = (...a) => console.log("[KB]", ...a);

  // ===== Runtime config (pode vir do Blade via init() ou via window.__kb*) =====
  const CFG = {
    iframeId: "nitro",
    debug: true,
    repeatMs: 140,
    keyMap: { w: "se", d: "ne", s: "nw", a: "sw" },
  };

  function log(...a) {
    if (CFG.debug) LOG(...a);
  }

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
        log("WS connected:", url);

        if (queue.length) {
          const copy = queue.slice(0);
          queue = [];
          copy.forEach((p) => {
            try {
              ws.send(JSON.stringify(p));
              log("SENT(queued):", p);
            } catch (e) {
              log("send queued error:", e);
            }
          });
        }
      };

      ws.onmessage = (e) => log("SERVER:", e.data);

      ws.onerror = (e) => {
        connecting = false;
        log("WS error:", e);
      };

      ws.onclose = (e) => {
        connecting = false;
        log("WS closed:", e.code, e.reason);
        ws = null;
      };
    } catch (err) {
      connecting = false;
      log("ensureWs error:", err);
    }
  }

  // função pública (compat com o que você já usa)
  window.__kbSendMove = function (direction) {
    const username = getUsername();
    if (!username) {
      log("missing username. set window.__kbUsername = 'teste123'");
      return;
    }

    const payload = { type: "move", username, direction };

    ensureWs();

    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(payload));
        log("SENT:", payload);
      } catch (e) {
        log("send error:", e);
      }
      return;
    }

    queue.push(payload);
    log("queued (ws not open yet):", payload);
  };

  // ===== Key mapping =====
  const mapKeyToDir = (k) => {
    const key = (k || "").toLowerCase();
    return CFG.keyMap[key] || null;
  };

  function isTypingTarget(target) {
    if (!target) return false;
    const tag = (target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return true;
    if (target.isContentEditable) return true;
    return false;
  }

  function isChatOpen(doc) {
    try {
      return !!(doc && doc.body && doc.body.classList && doc.body.classList.contains("kb-chat-open"));
    } catch (_) {
      return false;
    }
  }

  function isTypingByActiveElement(doc) {
    if (!doc) return false;
    const el = doc.activeElement;
    if (!el) return false;
    const tag = (el.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return true;
    if (el.isContentEditable) return true;
    return false;
  }

  // ===== Hold-to-repeat state =====
  let pressed = new Set();
  let lastKey = null;
  let repeatTimer = null;
  let currentCtx = null;

  function pickKey() {
    if (lastKey && pressed.has(lastKey)) return lastKey;
    const it = pressed.values().next();
    return it.done ? null : it.value;
  }

  function fireOnce() {
    const k = pickKey();
    if (!k) return;
    const dir = mapKeyToDir(k);
    if (!dir) return;
    if (typeof window.__kbSendMove === "function") window.__kbSendMove(dir);
  }

  function startRepeat() {
    if (repeatTimer) return;
    repeatTimer = setInterval(() => {
      if (!currentCtx || !currentCtx.doc) return;
      if (isChatOpen(currentCtx.doc) || isTypingByActiveElement(currentCtx.doc)) return;
      fireOnce();
    }, CFG.repeatMs);
  }

  function stopRepeat() {
    if (!repeatTimer) return;
    clearInterval(repeatTimer);
    repeatTimer = null;
  }

  function clearPressed() {
    pressed.clear();
    lastKey = null;
    stopRepeat();
  }

  function shouldIgnoreEvent(e, doc) {
    if (!e) return true;
    if (e.ctrlKey || e.altKey || e.metaKey) return true;

    const dir = mapKeyToDir(e.key);
    if (!dir) return true;

    if (isTypingTarget(e.target)) return true;
    if (isChatOpen(doc)) return true;

    return false;
  }

  function onKeyDown(e) {
    const doc = currentCtx && currentCtx.doc;

    if (shouldIgnoreEvent(e, doc)) return;

    // sempre bloqueia o Nitro
    e.preventDefault();
    e.stopPropagation();

    const k = (e.key || "").toLowerCase();

    // auto-repeat do browser: ignora (nosso repeat é via setInterval), mas bloqueia do mesmo jeito
    if (e.repeat) return;

    pressed.add(k);
    lastKey = k;

    log("keydown:", e.key, "->", mapKeyToDir(k));
    fireOnce();
    startRepeat();
  }

  function onKeyUp(e) {
    const doc = currentCtx && currentCtx.doc;

    const dir = mapKeyToDir(e.key);
    if (!dir) return;

    // bloqueia o Nitro também no keyup
    if (!shouldIgnoreEvent(e, doc)) {
      e.preventDefault();
      e.stopPropagation();
    }

    const k = (e.key || "").toLowerCase();
    pressed.delete(k);

    if (pressed.size === 0) stopRepeat();
  }

  function onBlur() {
    clearPressed();
  }

  // ===== Attach inside iframe (parte crítica) =====
  let attachedWin = null;
  let attachedDoc = null;

  function detach() {
    try {
      if (attachedWin) {
        attachedWin.removeEventListener("keydown", onKeyDown, true);
        attachedWin.removeEventListener("keyup", onKeyUp, true);
        attachedWin.removeEventListener("blur", onBlur, true);
      }
    } catch (_) {}

    try {
      if (attachedDoc) {
        attachedDoc.removeEventListener("keydown", onKeyDown, true);
        attachedDoc.removeEventListener("keyup", onKeyUp, true);
        attachedDoc.removeEventListener("visibilitychange", onVisChange, true);
      }
    } catch (_) {}

    attachedWin = null;
    attachedDoc = null;
  }

  function onVisChange() {
    try {
      if (attachedDoc && attachedDoc.hidden) clearPressed();
    } catch (_) {}
  }

  function attachToNitroIframe() {
    const iframe = document.getElementById(CFG.iframeId || "nitro");
    if (!iframe) {
      log("iframe not found yet:", CFG.iframeId);
      return;
    }

    const doAttach = () => {
      try {
        const win = iframe.contentWindow;
        const doc = iframe.contentDocument || (win ? win.document : null);

        if (!win || !doc) {
          log("iframe contentWindow/contentDocument not ready");
          return;
        }

        // atualiza ctx
        currentCtx = { win, doc };

        // remove antes pra não duplicar
        detach();

        // captura em CAPTURE=true pra pegar antes do Nitro
        win.addEventListener("keydown", onKeyDown, true);
        win.addEventListener("keyup", onKeyUp, true);
        win.addEventListener("blur", onBlur, true);

        doc.addEventListener("keydown", onKeyDown, true);
        doc.addEventListener("keyup", onKeyUp, true);
        doc.addEventListener("visibilitychange", onVisChange, true);

        attachedWin = win;
        attachedDoc = doc;

        log("key listeners attached inside iframe (capture=true)", {
          repeatMs: CFG.repeatMs,
          wsUrl: getWsUrl(),
          username: getUsername(),
        });
      } catch (err) {
        log("cannot access iframe document (cross-origin?)", err);
      }
    };

    iframe.addEventListener("load", () => {
      log("iframe loaded");
      doAttach();
      setTimeout(doAttach, 500);
      setTimeout(doAttach, 1500);
    });

    // se já estiver carregado
    setTimeout(doAttach, 500);
    setTimeout(doAttach, 1500);

    iframe.setAttribute("tabindex", "0");
    iframe.addEventListener("pointerdown", () => {
      try {
        iframe.focus();
      } catch (_) {}
    });
  }

  // ===== Public API (compat com seu Blade: KeyboardWalkControls.init({...})) =====
  const API = {
    init(opts) {
      const o = opts || {};

      if (typeof o.iframeId === "string" && o.iframeId) CFG.iframeId = o.iframeId;
      if (typeof o.debug !== "undefined") CFG.debug = !!o.debug;
      if (typeof o.repeatMs === "number" && o.repeatMs > 0) CFG.repeatMs = o.repeatMs;
      if (o.keyMap && typeof o.keyMap === "object") CFG.keyMap = o.keyMap;

      if (typeof o.wsUrl === "string" && o.wsUrl) window.__kbWsUrl = o.wsUrl;
      if (typeof o.username !== "undefined") window.__kbUsername = o.username;

      log("init", {
        iframeId: CFG.iframeId,
        repeatMs: CFG.repeatMs,
        keyMap: CFG.keyMap,
        wsUrl: getWsUrl(),
        username: getUsername(),
      });

      attachToNitroIframe();
      ensureWs();
    },

    destroy() {
      clearPressed();
      detach();
      currentCtx = null;
    },
  };

  window.KeyboardWalkControls = API;

  // ===== Boot (fallback se você não chamar init) =====
  function boot() {
    log("boot", { wsUrl: getWsUrl(), username: getUsername() });
    attachToNitroIframe();
    ensureWs();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
