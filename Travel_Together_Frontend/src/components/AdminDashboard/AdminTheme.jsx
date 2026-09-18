import { useState, useEffect, useCallback } from "react";
import { Sun, Moon } from "lucide-react";
import { AdminThemeContext, useAdminTheme, initialAdminTheme, STORAGE_KEY } from "./adminThemeStore.js";

/* The admin keeps its own theme, separate from the one end users pick.

   theme.css declares the dark palette as a plain [data-theme="dark"] attribute
   selector — not :root[data-theme] — and the `dark:` variant matches
   [data-theme="dark"] *. That means any element can redeclare the whole token
   set for its subtree, so the admin paints itself by stamping the attribute on
   its own container rather than on <html>.

   Two things fall out of that, both deliberate:
     · Admin defaults to dark while the public site defaults to light, so it's
       obvious at a glance which one you're looking at.
     · Opening the admin doesn't disturb the visitor's own light/dark choice,
       because nothing here touches the site's "tt-theme" key. */

export function AdminThemeProvider({ children, className = "" }) {
  const [theme, setTheme] = useState(initialAdminTheme);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* the theme still applies for this visit */
    }
  }, [theme]);

  const toggleTheme = useCallback(
    () => setTheme(t => (t === "dark" ? "light" : "dark")),
    []
  );

  return (
    <AdminThemeContext.Provider value={{ theme, toggleTheme }}>
      <div data-theme={theme} className={className}>
        {children}
      </div>
    </AdminThemeContext.Provider>
  );
}

export function AdminThemeToggle({ className = "" }) {
  const { theme, toggleTheme } = useAdminTheme();
  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      title={dark ? "Light theme" : "Dark theme"}
      className={`flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-ink-mute transition-colors hover:border-accent hover:text-accent ${className}`}
    >
      {dark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}
