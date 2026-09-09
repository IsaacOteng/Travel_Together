import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/**
 * Wraps the admin dashboard route.
 *
 * The real enforcement is server-side every /api/admin-dashboard/ endpoint is
 * IsAdminUser so this guard exists to stop non-staff (and logged-out visitors)
 * from ever loading the admin shell in the first place.
 */
export default function AdminRoute({ children }) {
  const { user, loading } = useAuth();

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

  // Not logged in, or logged in without staff rights → send them to the app.
  if (!user) return <Navigate to="/" replace />;
  if (!user.is_staff) return <Navigate to="/discover" replace />;

  return children;
}
