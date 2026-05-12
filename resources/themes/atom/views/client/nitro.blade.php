<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <title>{{ setting('hotel_name') }} - Nitro</title>

    <link href="https://fonts.googleapis.com/css2?family=Ubuntu+Condensed&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="{{ asset('assets/ui/terminal/kb-terminal-popup.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/ui/terminal/kb-terminal-chat.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/cursors/polar-blue/cursors.css') }}">

    @vite(['resources/themes/atom/css/app.css', 'resources/themes/atom/js/app.js'])

    @php
        $pickLatest = function ($files) {
            if (!is_array($files) || empty($files)) return null;

            $files = array_values(array_filter($files, function ($file) {
                return is_string($file) && $file !== '' && file_exists($file);
            }));

            if (empty($files)) return null;

            usort($files, function ($a, $b) {
                $timeA = @filemtime($a) ?: 0;
                $timeB = @filemtime($b) ?: 0;
                return $timeB <=> $timeA;
            });

            return basename($files[0]);
        };

        $ytCss = $pickLatest(glob(public_path('assets/yt-overlay/css/app*.css')) ?: []);

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

        $nitroSrc = config('habbo.client.nitro_path') . '/index.html';

        if (request()->filled('sso')) {
            $nitroSrc .= '?sso=' . urlencode(request('sso'));
        }
    @endphp

    @if($ytCss)
        <link rel="stylesheet" href="{{ asset('assets/yt-overlay/css/' . $ytCss) }}">
    @endif
</head>

<body class="overflow-hidden" id="nitro-client">
<div class="absolute top-4 left-4 flex gap-x-2 z-30">
    <a data-turbolinks="false" href="{{ auth()->check() ? route('me.show') : route('welcome') }}">
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
    src="{{ $nitroSrc }}"
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
                    const onlineCountElement = document.getElementById('online-count');

                    if (onlineCountElement) {
                        onlineCountElement.innerHTML = r.data.onlineCount;
                    }

                    clearInterval(onlineCount);
                })
                .catch(() => {});
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
                    w: 'se',
                    d: 'ne',
                    s: 'nw',
                    a: 'sw'
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

<script src="{{ asset('assets/js/atom.js') }}"></script>
<script src="{{ asset('assets/ui/terminal/kb-terminal-popup.js') }}"></script>
<script src="{{ asset('assets/ui/terminal/kb-terminal-chat.js') }}"></script>
<script>
    window.addEventListener('DOMContentLoaded', () => {
        const ENABLE_PING_TERMINAL = false;

        if (ENABLE_PING_TERMINAL) {
            KBTerminalPopup.init({
                triggerKey: 'KeyC',
                iframeId: 'nitro',
                imageUrl: "{{ asset('assets/ui/terminal/ping.png') }}",
                screen: {
                    left: null,
                    top: null,
                    width: null,
                    height: null,
                    rotate: null
                }
            });
        } else {
            KBTerminalChat.init({
                triggerKey: 'KeyC',
                iframeId: 'nitro'
            });
        }
    });
</script>
<script src="{{ asset('assets/ui/terminal/kb-chat-bridge.js') }}"></script>
<script src="{{ asset('assets/cursors/polar-blue/kb-cursor-inject.js') }}"></script>
</body>
</html>