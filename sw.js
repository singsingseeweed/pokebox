/* 명예의 전당 박스 — 오프라인 지원
   앱 껍데기는 설치할 때 저장하고, 도트 이미지는 한 번 본 것을 모아둡니다. */

const SHELL = 'pokebox-shell-v1';
const MEDIA = 'pokebox-media-v1';

const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-192-maskable.png',
  './icon-512-maskable.png',
  './apple-touch-icon.png',
  './favicon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(SHELL)
      .then(c => c.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())   // 일부 파일이 없어도 설치는 진행
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== SHELL && k !== MEDIA).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isMedia = /\.(png|gif|jpg|jpeg|webp|svg)$/i.test(url.pathname);
  const isData  = /\.csv$/i.test(url.pathname) || url.hostname === 'pokeapi.co';

  // 도트와 이름표: 저장해둔 게 있으면 바로 쓰고, 없으면 받아서 저장
  if (isMedia || isData) {
    e.respondWith(
      caches.match(req).then(hit => {
        if (hit) return hit;
        return fetch(req).then(res => {
          if (res && (res.ok || res.type === 'opaque')) {
            const copy = res.clone();
            caches.open(MEDIA).then(c => c.put(req, copy)).catch(() => {});
          }
          return res;
        }).catch(() => hit || Response.error());
      })
    );
    return;
  }

  // 앱 화면: 네트워크를 먼저 보고, 안 되면 저장해둔 것으로
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.ok && url.origin === location.origin) {
          const copy = res.clone();
          caches.open(SHELL).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
  );
});
