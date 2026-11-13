const CACHE_NAME = 'mihakk-shell-v2'
const scopeUrl = self.registration.scope
const url = path => new URL(path, scopeUrl).href

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME)
    const appUrl = url('index.html')
    const response = await fetch(appUrl, { cache: 'reload' })
    if (!response.ok) throw new Error('Could not cache the MIHAKK app shell')
    await cache.put(appUrl, response.clone())

    const html = await response.text()
    const assets = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)]
      .map(match => new URL(match[1], scopeUrl).href)
    const essentials = [
      url('manifest.webmanifest'),
      url('logo.jpg'),
      url('icons/icon-192.png'),
      url('icons/icon-512.png'),
    ]
    await Promise.all([...essentials, ...assets].map(async assetUrl => {
      try {
        const asset = await fetch(assetUrl, { cache: 'reload' })
        if (asset.ok) await cache.put(assetUrl, asset)
      } catch { /* Keep the app shell available even if an optional asset is offline. */ }
    }))
    await self.skipWaiting()
  })())
})

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys.filter(key => key.startsWith('mihakk-') && key !== CACHE_NAME).map(key => caches.delete(key)))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', event => {
  const request = event.request
  const requestUrl = new URL(request.url)
  if (request.method !== 'GET' || requestUrl.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request)
        const cache = await caches.open(CACHE_NAME)
        await cache.put(url('index.html'), response.clone())
        return response
      } catch {
        return (await caches.match(url('index.html'))) || Response.error()
      }
    })())
    return
  }

  event.respondWith((async () => {
    const cached = await caches.match(request)
    if (cached) return cached
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      await cache.put(request, response.clone())
    }
    return response
  })())
})
