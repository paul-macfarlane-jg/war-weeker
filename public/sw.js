// Minimal service worker: it exists so browsers treat War Weeker as an
// installable app. It caches nothing; every request goes to the network.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
