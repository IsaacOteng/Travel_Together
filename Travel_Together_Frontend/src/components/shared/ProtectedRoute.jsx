import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/**
 * Wraps any route that requires authentication.
 * - Redirects to "/" when unauthenticated.
 * - Redirects to "/onboarding" when onboarding is incomplete and the user
 *   tries to access a main-app route.
 * - Redirects to "/discover" when onboarding is complete and the user
 *   tries to access an onboarding route.
 */
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#071422",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          border: "3px solid rgba(255,107,53,0.2)",
          borderTopColor: "#FF6B35",
          animation: "spin .7s linear infinite",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) return <Navigate to="/discover" replace />;

  const onOnboarding = pathname.startsWith("/onboarding");

  // Onboarding complete → block onboarding routes
  if (user.onboarding_complete && onOnboarding) {
    return <Navigate to="/discover" replace />;
  }

  // Onboarding incomplete → block all main-app routes
  if (!user.onboarding_complete && !onOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}
