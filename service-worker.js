// VRMちゃんと！ Service Worker
// アプリ本体(index.html)・manifest・アイコンのみをキャッシュし、オフラインでも起動できるようにする。
// Three.js/MediaPipe等の外部CDNやVRM/モーション/BGMファイルはキャッシュ対象外(素通し)。

const CACHE_VERSION = 'v1';
const CACHE_NAME = `vrmchanto-shell-${CACHE_VERSION}`;

const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-72.png',
  './icons/icon-96.png',
  './icons/icon-128.png',
  './icons/icon-144.png',
  './icons/icon-152.png',
  './icons/icon-192.png',
  './icons/icon-384.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './icons/apple-touch-icon.png',
];

// インストール時にアプリシェルをキャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

// 古いバージョンのキャッシュを削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('vrmchanto-shell-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// 同一オリジンのシェルファイルのみキャッシュ制御(network-first, オフライン時cache-fallback)
// それ以外(CDN、VRM/モーション/BGMファイル、外部API等)は一切介入せずそのまま通す
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 外部リソースは素通し

  const isShellFile =
    SHELL_FILES.some((f) => url.pathname.endsWith(f.replace('./', '/'))) ||
    url.pathname === self.registration.scope.replace(self.location.origin, '') ||
    req.mode === 'navigate';

  if (!isShellFile) return; // 対象外のローカルファイル(VRM/モーション等)も素通し

  event.respondWith(
    fetch(req)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
  );
});
