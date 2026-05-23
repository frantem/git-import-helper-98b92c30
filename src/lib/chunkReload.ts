// Detect and auto-recover from stale dynamic import / chunk load errors
// that happen after a new deploy invalidates previously loaded chunk hashes.

const RELOAD_KEY = "locus-chunk-reload-at";
const RELOAD_COOLDOWN_MS = 10_000;

const CHUNK_ERROR_PATTERNS = [
  /ChunkLoadError/i,
  /Loading chunk [\w-]+ failed/i,
  /Failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /Importing a module script failed/i,
  /Unable to preload CSS/i,
];

export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const msg =
    (error as { message?: string })?.message ??
    (typeof error === "string" ? error : "");
  const name = (error as { name?: string })?.name ?? "";
  return CHUNK_ERROR_PATTERNS.some((re) => re.test(msg) || re.test(name));
}

/**
 * Triggers a one-shot reload if we haven't reloaded recently.
 * Returns true if a reload was scheduled, false if guard blocked it
 * (caller should then show a manual fallback).
 */
export function tryReloadForChunkError(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || "0");
    if (Number.isFinite(last) && Date.now() - last < RELOAD_COOLDOWN_MS) {
      return false;
    }
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    // sessionStorage unavailable — still attempt reload once
  }
  // Defer slightly so React/console can finish flushing.
  setTimeout(() => {
    window.location.reload();
  }, 50);
  return true;
}

export function installGlobalChunkErrorHandlers() {
  if (typeof window === "undefined") return;

  window.addEventListener("error", (event) => {
    const err = event.error ?? { message: event.message, name: "" };
    const filename = (event as ErrorEvent).filename || "";
    if (isChunkLoadError(err) || (/\.(js|mjs|css)(\?|$)/.test(filename) && /failed|error/i.test(event.message || ""))) {
      tryReloadForChunkError();
    }
  });

  window.addEventListener("unhandledrejection", (event) => {
    if (isChunkLoadError(event.reason)) {
      tryReloadForChunkError();
    }
  });
}
