(() => {
    const DEFAULTS = {
        triggerKey: "KeyC",
        iframeId: "nitro",
    };

    const state = {
        open: false,
        buffer: "",
        root: null,
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

    function ensureUI() {
        if (state.root) return;

        const root = document.createElement("div");
        root.className = "kb-chat-term";
        root.innerHTML = `
        <div class="kb-chat-term-content">
          <div class="kb-chat-term-output"></div>
          <div class="kb-chat-term-inputRow">
            <span class="kb-chat-term-prompt">&gt;</span>
            <span class="kb-chat-term-typed"></span>
            <span class="kb-chat-term-caret"></span>
          </div>
        </div>
        <textarea class="kb-chat-term-capture" autocomplete="off" spellcheck="false"></textarea>
      `;

        document.body.appendChild(root);

        state.root = root;
        state.outputEl = root.querySelector(".kb-chat-term-output");
        state.typedEl = root.querySelector(".kb-chat-term-typed");
        state.captureEl = root.querySelector(".kb-chat-term-capture");
    }

    function appendLine(text) {
        const div = document.createElement("div");
        div.className = "kb-chat-term-line";
        div.innerHTML = escHtml(text);
        state.outputEl.appendChild(div);
        state.outputEl.scrollTop = state.outputEl.scrollHeight;
    }

    function sendToNitroChat(message) {
        const iframe = document.getElementById(state.opts.iframeId);
        if (!iframe) return false;

        try {
            const w = iframe.contentWindow;
            if (w && typeof w.__kbSendChatBridge === "function") {
                return !!w.__kbSendChatBridge(message, false, "");
            }
        } catch {}

        return false;
    }

    function open() {
        ensureUI();
        state.buffer = "";
        state.typedEl.textContent = "";
        state.root.classList.add("kb-open");
        state.open = true;
        setTimeout(() => state.captureEl.focus(), 0);
    }

    function close() {
        if (!state.root) return;
        state.root.classList.remove("kb-open");
        state.open = false;
    }

    function handleKeydown(e) {
        const opts = state.opts;
        if (!opts) return;

        if (e.ctrlKey || e.altKey || e.metaKey) return;

        if (!state.open) {
            if (e.code === opts.triggerKey) {
                e.preventDefault();
                e.stopImmediatePropagation();
                e.stopPropagation();
                open();
            }
            return;
        }

        if (e.key === "Escape") {
            e.preventDefault();
            e.stopImmediatePropagation();
            e.stopPropagation();
            close();
            return;
        }

        if (e.key === "Enter") {
            e.preventDefault();
            e.stopImmediatePropagation();
            e.stopPropagation();

            const msg = state.buffer.trim();
            if (msg) {
                appendLine(msg);
                sendToNitroChat(msg);
                state.buffer = "";
                state.typedEl.textContent = "";
            }

            close();
            return;
        }

        if (e.key === "Backspace") {
            e.preventDefault();
            e.stopImmediatePropagation();
            e.stopPropagation();
            state.buffer = state.buffer.slice(0, -1);
            state.typedEl.textContent = state.buffer;
            return;
        }

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
                if (!w || w.__kbChatTermForwardBound) return;
                w.__kbChatTermForwardBound = true;

                w.addEventListener(
                    "keydown",
                    (e) => {
                        if (e.ctrlKey || e.altKey || e.metaKey) return;

                        if (!state.open && e.code === state.opts.triggerKey) {
                            e.preventDefault();
                            e.stopImmediatePropagation();
                            e.stopPropagation();
                            open();
                            return;
                        }

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

    window.KBTerminalChat = {
        init(userOpts = {}) {
            if (window.__kbTermChatInitOnce) return window.__kbTermChatApi;
            window.__kbTermChatInitOnce = true;

            state.opts = { ...DEFAULTS, ...userOpts };
            ensureUI();

            window.addEventListener("keydown", handleKeydown, true);
            state.captureEl.addEventListener("keydown", handleKeydown, true);
            bindIframeForwarding();

            window.__kbTermChatApi = {
                open,
                close,
                toggle: () => (state.open ? close() : open()),
                print: appendLine,
            };

            return window.__kbTermChatApi;
        },
    };
})();
