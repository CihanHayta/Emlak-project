import { Navigate, Outlet, useLocation } from "react-router-dom";
import { isLoggedIn } from "../lib/auth";

/**
 * Route guard for everything under /admin (except /admin/login itself).
 * Not real security (there's no backend to enforce this server-side) — it
 * just keeps someone from landing on the dashboard without going through
 * the login screen first. Remembers where they were trying to go via
 * `state.from`, so Login.jsx can send them back after signing in.
 */
export default function RequireAuth() {
  const location = useLocation();

  if (!isLoggedIn()) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
