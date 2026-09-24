// Browser-only: Chrome's `beforeinstallprompt` event, kept so the Install app
// page can open the native prompt later. Chrome fires it once per full page
// load, usually before a client-side navigation reaches `/install`, so the
// app listens from the root layout and this module holds on to the event.

/** Chromium's install prompt event (not yet in the DOM typings). */
export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function setDeferred(event: BeforeInstallPromptEvent | null) {
  deferred = event;
  listeners.forEach((listener) => listener());
}

/** Starts capturing the install prompt; returns a cleanup function. */
export function captureInstallPrompt(): () => void {
  const onPrompt = (event: Event) => {
    // Keep Chrome's own mini-infobar away; the Install app page offers it.
    event.preventDefault();
    setDeferred(event as BeforeInstallPromptEvent);
  };
  const onInstalled = () => setDeferred(null);
  window.addEventListener("beforeinstallprompt", onPrompt);
  window.addEventListener("appinstalled", onInstalled);
  return () => {
    window.removeEventListener("beforeinstallprompt", onPrompt);
    window.removeEventListener("appinstalled", onInstalled);
  };
}

/** For `useSyncExternalStore`: calls `listener` when the prompt changes. */
export function subscribeInstallPrompt(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The captured prompt, or null when the browser hasn't offered one. */
export function getInstallPrompt(): BeforeInstallPromptEvent | null {
  return deferred;
}

/** Opens the native prompt; the event is single-use either way. */
export async function promptInstall(): Promise<void> {
  const event = deferred;
  if (!event) return;
  setDeferred(null);
  await event.prompt();
}
