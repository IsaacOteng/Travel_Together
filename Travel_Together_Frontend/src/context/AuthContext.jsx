import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { tokenStore } from "../services/api";
import { usersApi } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true); // true while restoring session on mount
  const navigate = useNavigate();

  // ── Restore session on mount ──────────────────────────────────────────────
  useEffect(() => {
    const restore = async () => {
      const access = tokenStore.getAccess();
      if (!access) { setLoading(false); return; }

      try {
        const { data } = await usersApi.getMe();
        setUser(data);
      } catch {
        // Token expired or invalid — clear and show landing
        tokenStore.clear();
      } finally {
        setLoading(false);
      }
    };

    restore();
  }, []);

  // ── Listen for session-expired event from Axios interceptor ───────────────
  useEffect(() => {
    const handler = () => {
      setUser(null);
      tokenStore.clear();
      navigate("/discover", { replace: true });
    };

    window.addEventListener("tt:session-expired", handler);
    return () => window.removeEventListener("tt:session-expired", handler);
  }, [navigate]);

  // ── login — called after verifyOtp / googleAuth / appleAuth ──────────────
  const login = useCallback(async ({ access, refresh, is_new_user }) => {
    tokenStore.set(access, refresh);

    let userData = null;
    try {
      const { data } = await usersApi.getMe();
      userData = data;
      setUser(data);
    } catch {
      // Profile fetch failed — tokens stored, user will retry on next load
    }

    // Only go to onboarding if explicitly a new user OR if we have profile data
    // confirming onboarding is incomplete. A null userData (fetch failed) must not
    // redirect an existing user to onboarding.
    if (is_new_user || (userData != null && !userData.onboarding_complete)) {
      navigate("/onboarding", { replace: true });
    } else {
      navigate("/discover",   { replace: true });
    }
  }, [navigate]);

  // ── logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    navigate("/", { replace: true });
  }, [navigate]);

  // ── updateUser — for local optimistic updates after profile edits ─────────
  const updateUser = useCallback((patch) => {
    setUser((prev) => prev ? { ...prev, ...patch } : prev);
  }, []);

  // ── refreshUser — re-fetches full user from backend ──────────────────────
  const refreshUser = useCallback(async () => {
    try {
      const { data } = await usersApi.getMe();
      setUser(data);
    } catch { /* ignore — user stays as-is */ }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
