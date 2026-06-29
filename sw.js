// Service Worker do VeloDoc — bem simples de propósito.
// Estratégia "network first": sempre busca a versão mais nova na internet primeiro.
// Só usa o cache se estiver realmente sem conexão (evita ficar "preso" numa versão antiga
// depois que o sistema for atualizado no GitHub).

const CACHE_NAME = 'velodoc-v1';
const ARQUIVOS_BASICOS = [
  './sistema_despachante.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ARQUIVOS_BASICOS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(nomes) {
      return Promise.all(
        nomes.filter(function(n) { return n !== CACHE_NAME; })
             .map(function(n) { return caches.delete(n); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event) {
  // Só intercepta requisições GET de navegação/arquivos estáticos do próprio site.
  // Chamadas para o Apps Script (dados) sempre vão direto pra internet, nunca cacheadas.
  if (event.request.method !== 'GET') return;
  if (event.request.url.indexOf('script.google.com') !== -1) return;

  event.respondWith(
    fetch(event.request)
      .then(function(resposta) {
        // Atualiza o cache com a versão fresca, em paralelo
        var copia = resposta.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, copia);
        });
        return resposta;
      })
      .catch(function() {
        // Sem internet: usa o que tiver no cache como último recurso
        return caches.match(event.request);
      })
  );
});
