// Foresight service worker: shows push notifications and opens the app when tapped.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let msg = { title: "Foresight", body: "", url: "/briefing" };
  try { msg = { ...msg, ...event.data.json() }; } catch { if (event.data) msg.body = event.data.text(); }
  event.waitUntil(self.registration.showNotification(msg.title, {
    body: msg.body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: msg.tag || "foresight",
    data: { url: msg.url || "/briefing" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/briefing", self.location.origin).href;
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const w of wins) if ("focus" in w) { await w.navigate(url).catch(() => {}); return w.focus(); }
    return self.clients.openWindow(url);
  })());
});
