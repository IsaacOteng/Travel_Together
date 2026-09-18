import { createContext, useContext } from "react";

/* Split from AdminTheme.jsx so that file exports only components. */
export const STORAGE_KEY = "tt-admin-theme";

export const AdminThemeContext = createContext({ theme: "dark", toggleTheme: () => {} });

export function useAdminTheme() {
  return useContext(AdminThemeContext);
}

export function initialAdminTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* private mode or blocked storage — fall through to the default */
  }
  return "dark";
}
