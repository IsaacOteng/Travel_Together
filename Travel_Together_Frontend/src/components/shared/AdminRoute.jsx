import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import RouteLoader from "./RouteLoader.jsx";

/**
 * Wraps the admin dashboard route.
 *
 * The real enforcement is server-side every /api/admin-dashboard/ endpoint is
 * IsAdminUser so this guard exists to stop non-staff (and logged-out visitors)
 * from ever loading the admin shell in the first place.
 */
export default function AdminRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <RouteLoader />;

  // Not logged in, or logged in without staff rights → send them to the app.
  if (!user) return <Navigate to="/" replace />;
  if (!user.is_staff) return <Navigate to="/discover" replace />;

  return children;
}
