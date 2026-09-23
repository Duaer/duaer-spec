/**
 * Desk color theme: light | dark (persisted).
 * Apply `data-theme` on <html> before paint via the head boot script.
 */

const STORAGE_KEY = "duaer.live.theme";

/** @returns {"light"|"dark"} */
export function getTheme() {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "light" || attr === "dark") return attr;
  return "dark";
}

/**
 * @param {"light"|"dark"} theme
 */
export function setTheme(theme) {
  const next = theme === "light" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* ignore */
  }
  document.dispatchEvent(
    new CustomEvent("duaer-theme", { detail: { theme: next } }),
  );
}

export function toggleTheme() {
  setTheme(getTheme() === "light" ? "dark" : "light");
}

/**
 * Resolve initial theme: stored → system preference → dark.
 * @returns {"light"|"dark"}
 */
export function resolveInitialTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* ignore */
  }
  try {
    if (window.matchMedia("(prefers-color-scheme: light)").matches) {
      return "light";
    }
  } catch {
    /* ignore */
  }
  return "dark";
}

/** Ensure html[data-theme] is set (safe if head boot already ran). */
export function initTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  if (current !== "light" && current !== "dark") {
    setTheme(resolveInitialTheme());
  }
  return getTheme();
}
