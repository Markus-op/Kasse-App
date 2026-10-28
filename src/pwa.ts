export type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
export async function registerPwa(onUpdate: (registration: ServiceWorkerRegistration) => void, onReady: () => void) {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  const registration = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
  const check = () => { if (registration.waiting && navigator.serviceWorker.controller) onUpdate(registration); };
  check();
  registration.addEventListener('updatefound', () => {
    const worker = registration.installing;
    worker?.addEventListener('statechange', () => {
      if (worker.state === 'installed') { check(); onReady(); }
    });
  });
  await navigator.serviceWorker.ready; onReady();
  const update = () => { if (document.visibilityState === 'visible') void registration.update().catch(() => {}); };
  document.addEventListener('visibilitychange', update);
  window.setInterval(update, 60 * 60 * 1000);
}
