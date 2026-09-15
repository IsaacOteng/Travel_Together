import { createContext, useContext, useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "tt-theme";

const ThemeContext = createContext({ theme: "light", toggleTheme: () => {} });

/* The pre-paint script in index.html has already stamped data-theme on
   <html>, so read from there rather than re-deriving it and risking a
   mismatch on the first render. */
function initialTheme() {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* private mode / blocked storage — the theme still applies for this visit */
    }
  }, [theme]);

  const toggleTheme = useCallback(
    () => setTheme(t => (t === "dark" ? "light" : "dark")),
    []
  );

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
