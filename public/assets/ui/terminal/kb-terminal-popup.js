(() => {
    const DEFAULTS = {
        imageUrl: "/assets/ui/terminal/pipboy.png",
        triggerKey: "KeyC",
        closeOnEnter: true,
        iframeId: "nitro",
        storageKey: "kb_term_pos_v1",
    };

    const state = {
        open: false,
        buffer: "",
        overlay: null,
        frame: null,
        outputEl: null,
        typedEl: null,
        captureEl: null,
        opts: null,
    };

    function escHtml(s) {
        return s.replace(
            /[&<>"']/g,
            (m) =>
                ({
                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#039;",
                }[m])
        );
    }

    function ensureUI(opts) {
        if (state.overlay) return;

        const overlay = document.createElement("div");
        overlay.className = "kb-term-overlay";
        overlay.innerHTML = `
      <div class="kb-term-frame" role="dialog" aria-modal="false">
        <img class="kb-term-img" src="${opts.imageUrl}" alt="terminal" />
        <div class="kb-term-screen">
          <div class="kb-term-content">
            <div class="kb-term-output"></div>
            <div class="kb-term-inputRow">
              <span class="kb-term-prompt">&gt;</span>
              <span class="kb-term-typed"></span>
              <span class="kb-term-caret"></span>
            </div>
          </div>
        </div>
        <textarea class="kb-term-capture" autocomplete="off" spellcheck="false"></textarea>
      </div>
    `;

        document.body.appendChild(overlay);

        state.overlay = overlay;
        state.frame = overlay.querySelector(".kb-term-frame");
        state.outputEl = overlay.querySelector(".kb-term-output");
        state.typedEl = overlay.querySelector(".kb-term-typed");
        state.captureEl = overlay.querySelector(".kb-term-capture");

        // restaura posição (se já arrastou antes)
        try {
            const raw = localStorage.getItem(opts.storageKey);
            if (raw) {
                const p = JSON.parse(raw);
                if (typeof p.left === "number" && typeof p.top === "number") {
                    state.frame.style.left = p.left + "px";
                    state.frame.style.top = p.top + "px";
                    state.frame.style.transform = "none";
                }
            }
        } catch {}
    }

    function appendLine(text) {
        const div = document.createElement("div");
        div.className = "kb-term-line";
        div.innerHTML = escHtml(text);
        state.outputEl.appendChild(div);
        state.outputEl.scrollTop = state.outputEl.scrollHeight;
    }

    function getNitroChatInput(iframeId) {
        const iframe = document.getElementById(iframeId);
        if (!iframe) return null;

        try {
            const doc = iframe.contentDocument;
            if (!doc) return null;

            const container = doc.querySelector(
                "#toolbar-chat-input-container"
            );
            if (container) container.click(); // ajuda a “ativar” o chat

            return (
                doc.querySelector(
                    "#toolbar-chat-input-container input.chat-input"
                ) ||
                doc.querySelector("#toolbar-chat-input-container input") ||
                doc.querySelector("input.chat-input")
            );
        } catch {
            return null;
        }
    }

    function setNativeValue(input, value) {
        const proto = Object.getPrototypeOf(input);
        const desc = Object.getOwnPropertyDescriptor(proto, "value");
        const setter = desc && desc.set;

        if (setter) setter.call(input, value);
        else input.value = value;
    }

    function fireKey(input, type, key, code) {
        const ev = new KeyboardEvent(type, {
            key,
            code,
            bubbles: true,
            cancelable: true,
            composed: true,
            keyCode: key === "Enter" ? 13 : 0,
            which: key === "Enter" ? 13 : 0,
        });

        input.dispatchEvent(ev);
    }

    function sendToNitroChat(message, iframeId) {
        const iframe = document.getElementById(iframeId);
        if (!iframe) return false;

        try {
            const w = iframe.contentWindow;

            if (w && typeof w.__kbSendChatBridge === "function") {
                return !!w.__kbSendChatBridge(message, false, "");
            }
        } catch {}

        console.warn("[KBTERM] __kbSendChatBridge não disponível");
        return false;
    }

    function open() {
        ensureUI(state.opts);
        state.buffer = "";
        state.typedEl.textContent = "";
        state.overlay.classList.add("kb-open");
        state.open = true;

        // 🔥 isso resolve o “demorou pra digitar”
        setTimeout(() => state.captureEl.focus(), 0);
    }

    function close() {
        if (!state.overlay) return;
        state.overlay.classList.remove("kb-open");
        state.open = false;
    }

    function handleKeydown(e) {
        const opts = state.opts;
        if (!opts) return;

        if (e.ctrlKey || e.altKey || e.metaKey) return;

        // abrir com C
        if (!state.open) {
            if (e.code === opts.triggerKey) {
                e.preventDefault();
                e.stopImmediatePropagation();
                e.stopPropagation();
                open();
            }
            return;
        }

        // fechado com ESC
        if (e.key === "Escape") {
            e.preventDefault();
            e.stopImmediatePropagation();
            e.stopPropagation();
            close();
            return;
        }

        // enviar com Enter
        if (e.key === "Enter") {
            e.preventDefault();
            e.stopImmediatePropagation();
            e.stopPropagation();

            const msg = state.buffer.trim();
            if (msg) {
                appendLine(msg);

                // FECHA primeiro (pra tirar foco do textarea e não cair no anotherInputHasFocus)
                close();

                setTimeout(() => {
                    sendToNitroChat(msg, opts.iframeId);
                }, 0);

                state.buffer = "";
                state.typedEl.textContent = "";
                return;
            }

            close();
            return;
        }

        // backspace
        if (e.key === "Backspace") {
            e.preventDefault();
            e.stopImmediatePropagation();
            e.stopPropagation();
            state.buffer = state.buffer.slice(0, -1);
            state.typedEl.textContent = state.buffer;
            return;
        }

        // caractere
        if (e.key && e.key.length === 1) {
            e.preventDefault();
            e.stopImmediatePropagation();
            e.stopPropagation();
            state.buffer += e.key;
            state.typedEl.textContent = state.buffer;
        }
    }

    function bindIframeForwarding() {
        const iframe = document.getElementById(state.opts.iframeId);
        if (!iframe) return;

        function bind() {
            try {
                const w = iframe.contentWindow;
                if (!w || w.__kbTermForwardBound) return;
                w.__kbTermForwardBound = true;

                // captura teclado dentro do Nitro e usa no terminal (evita conflito/antigo)
                w.addEventListener(
                    "keydown",
                    (e) => {
                        if (e.ctrlKey || e.altKey || e.metaKey) return;

                        // sempre intercepta KeyC pra abrir o terminal novo
                        if (!state.open && e.code === state.opts.triggerKey) {
                            e.preventDefault();
                            e.stopImmediatePropagation();
                            e.stopPropagation();
                            open();
                            return;
                        }

                        // se o terminal estiver aberto, não deixa as teclas irem pro jogo
                        if (state.open) {
                            e.preventDefault();
                            e.stopImmediatePropagation();
                            e.stopPropagation();
                            handleKeydown(e);
                        }
                    },
                    true
                );
            } catch {}
        }

        iframe.addEventListener("load", bind);
        setTimeout(bind, 1500);
    }

    function enableDrag() {
        const frame = state.frame;
        if (!frame || frame.__kbDrag) return;
        frame.__kbDrag = true;

        let dragging = false;
        let startX = 0;
        let startY = 0;
        let startLeft = 0;
        let startTop = 0;

        frame.addEventListener("pointerdown", (e) => {
            // se clicar DENTRO da tela (onde tem texto), não arrasta
            if (e.target.closest(".kb-term-screen")) return;

            dragging = true;
            frame.classList.add("kb-dragging");
            frame.setPointerCapture(e.pointerId);

            const rect = frame.getBoundingClientRect();
            startX = e.clientX;
            startY = e.clientY;
            startLeft = rect.left;
            startTop = rect.top;

            // ao arrastar, tira o translateY
            frame.style.transform = "none";
            frame.style.left = startLeft + "px";
            frame.style.top = startTop + "px";
        });

        frame.addEventListener("pointermove", (e) => {
            if (!dragging) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            const left = Math.max(0, startLeft + dx);
            const top = Math.max(0, startTop + dy);

            frame.style.left = left + "px";
            frame.style.top = top + "px";
        });

        frame.addEventListener("pointerup", () => {
            if (!dragging) return;

            dragging = false;
            frame.classList.remove("kb-dragging");

            // salva posição
            try {
                const rect = frame.getBoundingClientRect();
                localStorage.setItem(
                    state.opts.storageKey,
                    JSON.stringify({ left: rect.left, top: rect.top })
                );
            } catch {}
        });
    }

    window.KBTerminalPopup = {
        init(userOpts = {}) {
            if (window.__kbTermInitOnce) return window.__kbTermApi;
            window.__kbTermInitOnce = true;

            state.opts = { ...DEFAULTS, ...userOpts };
            ensureUI(state.opts);
            enableDrag();
            bindIframeForwarding();

            // teclado no parent (se foco estiver fora do iframe)
            window.addEventListener("keydown", handleKeydown, true);

            // teclado no captureEl (garante digitação instantânea)
            state.captureEl.addEventListener("keydown", handleKeydown, true);

            window.__kbTermApi = {
                open,
                close,
                toggle: () => (state.open ? close() : open()),
                print: appendLine,
            };

            return window.__kbTermApi;
        },
    };
})();
