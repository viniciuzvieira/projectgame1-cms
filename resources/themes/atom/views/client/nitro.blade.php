<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <title>{{ setting('hotel_name') }} - Nitro</title>

    <link href="https://fonts.googleapis.com/css2?family=Ubuntu+Condensed&display=swap" rel="stylesheet">

    @vite(['resources/themes/atom/css/app.css', 'resources/themes/atom/js/app.js'])

    @php
        $pickLatest = function ($files) {
            if (!$files || count($files) === 0) return null;
            usort($files, fn($a, $b) => filemtime($b) <=> filemtime($a));
            return basename($files[0]);
        };

        $ytCss = $pickLatest(glob(public_path('assets/yt-overlay/css/app*.css')));

        $ytVendors = $pickLatest(array_values(array_filter(
            glob(public_path('assets/yt-overlay/js/chunk-vendors*.js')) ?: [],
            fn($p) => stripos($p, 'legacy') === false
        )));

        $ytApp = $pickLatest(array_values(array_filter(
            glob(public_path('assets/yt-overlay/js/app*.js')) ?: [],
            fn($p) => stripos($p, 'legacy') === false
        )));

        $ytVendorsLegacy = $pickLatest(glob(public_path('assets/yt-overlay/js/chunk-vendors-legacy*.js')) ?: []);
        $ytAppLegacy = $pickLatest(glob(public_path('assets/yt-overlay/js/app-legacy*.js')) ?: []);
    @endphp

    @if($ytCss)
        <link rel="stylesheet" href="{{ asset('assets/yt-overlay/css/' . $ytCss) }}">
    @endif
</head>

<body class="overflow-hidden" id="nitro-client">
<div class="absolute top-4 left-4 flex gap-x-2 z-30">
    <a data-turbolinks="false" href="{{ route('me.show') }}">
        <x-client.client-button>
            <x-icons.home/>
        </x-client.client-button>
    </a>

    <div onclick="reloadClient()">
        <x-client.client-button>
            <x-icons.reload/>
        </x-client.client-button>
    </div>

    <div onclick="toggleFullscreen()">
        <x-client.client-button>
            <x-icons.fullscreen/>
        </x-client.client-button>
    </div>

    <x-client.client-button classes="flex items-center justify-center gap-x-1">
        <x-icons.user/>
        <span id="online-count"></span>
    </x-client.client-button>
</div>

<iframe
    id="nitro"
    src="{{ sprintf('%s/index.html?sso=%s', config('habbo.client.nitro_path'), $sso) }}"
    class="border-none overflow-hidden h-full w-full m-0 p-0 absolute top-0 left-0"></iframe>

<div id="app" class="absolute top-0 left-0 w-full h-full z-20"></div>

<div id="disconnected" class="w-full h-screen absolute top-0 left-0 z-40">
    <div class="absolute bg-black bg-opacity-50 w-full h-full"></div>

    <div class="relative flex flex-col items-center justify-center gap-4 h-full w-full">
        <h2 class="text-2xl text-white">
            {{ __('Whoops! It seems like you have been disconnected...') }}
        </h2>

        <button class="py-2 px-4 text-white rounded bg-[#eeb425] hover:bg-[#e3aa1e] border-2 border-[#cf9d15] transition ease-in-out"
                onclick="reloadClient()">
            {{ __('Reload client') }}
        </button>
    </div>
</div>

<script>
    function toggleFullscreen() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
            return;
        }
        document.documentElement.requestFullscreen();
    }

    function reloadClient() {
        window.location.href = window.location;
    }

    window.addEventListener('DOMContentLoaded', () => {
        const onlineCount = setInterval(() => getOnlineUserCount(), 15000);

        function getOnlineUserCount() {
            fetch('{{ route('api.online-count') }}')
                .then(r => r.json())
                .then(r => {
                    document.getElementById('online-count').innerHTML = r.data.onlineCount;
                    clearInterval(onlineCount);
                });
        }

        const fetchInitOnlineCount = setTimeout(() => {
            getOnlineUserCount();
            clearTimeout(fetchInitOnlineCount);
        }, 1500);
    });
</script>

@if($ytVendors)
    <script src="{{ asset('assets/yt-overlay/js/' . $ytVendors) }}"></script>
@endif
@if($ytApp)
    <script src="{{ asset('assets/yt-overlay/js/' . $ytApp) }}"></script>
@endif
@if($ytVendorsLegacy)
    <script nomodule src="{{ asset('assets/yt-overlay/js/' . $ytVendorsLegacy) }}"></script>
@endif
@if($ytAppLegacy)
    <script nomodule src="{{ asset('assets/yt-overlay/js/' . $ytAppLegacy) }}"></script>
@endif

<script src="{{ asset('js/keyboardwalk-controls.js') }}"></script>

<script>
    window.addEventListener('DOMContentLoaded', () => {
        const sso = @json($sso);

        const configuredWsUrl = @json(
            config('habbo.client.nitro_ws_url')
            ?? config('habbo.client.ws_url')
            ?? config('habbo.client.websocket_url')
            ?? config('habbo.client.websocket')
            ?? null
        );

        const configuredWsPort = @json(
            config('habbo.client.nitro_ws_port')
            ?? config('habbo.client.ws_port')
            ?? config('habbo.client.websocket_port')
            ?? null
        );

        let wsUrl = configuredWsUrl;

        if (!wsUrl && configuredWsPort) {
            wsUrl = `ws://${window.location.hostname}:${configuredWsPort}`;
        }

        if (!wsUrl) {
            wsUrl = `ws://${window.location.hostname}:2096`;
        }

        const kbWsUrl = `ws://${window.location.hostname}:2097`;

        window.__kbUsername = window.__kbUsername || @json(
            optional(auth()->user())->username
            ?? optional(auth()->user())->name
            ?? null
        );

        if (typeof window.KeyboardWalkControls?.init === 'function') {
            window.KeyboardWalkControls.init({
                iframeId: 'nitro',
                wsUrl: kbWsUrl,
                username: window.__kbUsername,
                debug: true,
                repeatMs: 140,
                keyMap: { 
                    w: 'se',  // pra cima na tela
                    d: 'ne',  // direita na tela
                    s: 'nw',  // pra baixo na tela
                    a: 'sw'   // esquerda na tela
                }
            });

        } else {
            console.warn('[KB] keyboardwalk-controls.js not loaded');
        }

        if (typeof window.startYTOverlay === 'function') {
            window.startYTOverlay(sso, wsUrl);
        }
    });
</script>

<script>
  window.__kbUsername = window.__kbUsername || @json(optional(auth()->user())->username ?? null);
</script>
<script>
(() => {
  const iframe = document.getElementById('nitro');
  if (!iframe) return;

  const STATE = { open: false };

  function safeGetIframeCtx() {
    try {
      const win = iframe.contentWindow;
      const doc = iframe.contentDocument;
      if (!win || !doc) return null;
      return { win, doc };
    } catch (e) {
      console.warn('[chat-toggle] Não consegui acessar o iframe (cross-origin?)', e);
      return null;
    }
  }

  function ensureStyle(doc) {
    if (doc.getElementById('kb-chat-toggle-style')) return;

    const style = doc.createElement('style');
    style.id = 'kb-chat-toggle-style';
    style.textContent = `
      body.kb-chat-closed #toolbar-chat-input-container { display: none !important; }
      body.kb-chat-open   #toolbar-chat-input-container { display: flex !important; }
    `;
    doc.head.appendChild(style);
  }

  function getChatContainer(doc) {
    return doc.querySelector('#toolbar-chat-input-container');
  }

  function getChatInput(doc) {
    return (
      doc.querySelector('#toolbar-chat-input-container input.chat-input') ||
      doc.querySelector('#toolbar-chat-input-container input') ||
      doc.querySelector('input.chat-input')
    );
  }

  function setOpen(doc, open) {
    ensureStyle(doc);

    doc.body.classList.toggle('kb-chat-open', open);
    doc.body.classList.toggle('kb-chat-closed', !open);

    if (open) {
      const input = getChatInput(doc);
      if (input) {
        input.focus();
        if (typeof input.select === 'function') input.select();
      }
      STATE.open = true;
    } else {
      const input = getChatInput(doc);
      if (input) input.blur();
      STATE.open = false;
    }
  }

  function isTypingTarget(el) {
    if (!el) return false;
    const tag = (el.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || el.isContentEditable === true;
  }

  function isInsideChat(el, doc) {
    const container = getChatContainer(doc);
    return !!(container && el && container.contains(el));
  }

  function setup() {
    const ctx = safeGetIframeCtx();
    if (!ctx) return;

    const { win, doc } = ctx;

    // default: fechado
    ensureStyle(doc);
    setOpen(doc, false);

    // Se o Nitro re-renderizar e perder classe/DOM, reaplica o estado
    const mo = new MutationObserver(() => {
      if (STATE.open) {
        doc.body.classList.add('kb-chat-open');
        doc.body.classList.remove('kb-chat-closed');
      } else {
        doc.body.classList.add('kb-chat-closed');
        doc.body.classList.remove('kb-chat-open');
      }
    });
    mo.observe(doc.documentElement, { childList: true, subtree: true });

    // Abre no "C"
    win.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      // Se estiver digitando em outro input, não intercepta
      if (isTypingTarget(e.target) && !isInsideChat(e.target, doc)) return;

      if (e.code === 'KeyC') {
        e.preventDefault();
        e.stopPropagation();
        if (!STATE.open) setOpen(doc, true);
      }
    }, true);

    // Fecha no Enter (somente se o foco estiver no chat)
    win.addEventListener('keydown', (e) => {
      if (!STATE.open) return;
      if (e.key !== 'Enter') return;

      const active = doc.activeElement;
      if (!isInsideChat(active, doc)) return;

      // deixa o Nitro enviar/processar o Enter e fecha logo depois
      setTimeout(() => setOpen(doc, false), 120);
    }, true);
  }

  iframe.addEventListener('load', setup);

  // fallback (caso o iframe já esteja carregado quando esse script rodar)
  setTimeout(setup, 1500);
})();
</script>

<script src="{{ asset('assets/js/atom.js') }}"></script>
<script src="{{ asset('js/keyboardwalk-controls.js') }}"></script>
</body>
</html>
