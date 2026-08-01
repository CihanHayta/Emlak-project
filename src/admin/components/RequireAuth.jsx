import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { isAuthInitialized, isLoggedIn, subscribeToAuthState } from "../lib/auth";

/**
 * Route guard for everything under /admin (except /admin/login itself).
 * Backed by real Firebase Auth + the backend's session cookie now — but
 * Firebase's own "am I logged in" check is asynchronous (it has to restore
 * the persisted session first), so this can't just read a synchronous flag
 * on first render like the old localStorage mock did. Shows a brief loading
 * state until that first check resolves, THEN decides whether to redirect.
 *
 * Remembers where they were trying to go via `state.from`, so Login.jsx can
 * send them back after signing in.
 */
export default function RequireAuth() {
  const location = useLocation();
  const [ready, setReady] = useState(isAuthInitialized());
  const [loggedIn, setLoggedIn] = useState(isLoggedIn());

  useEffect(() => subscribeToAuthState((session) => {
    setReady(true);
    setLoggedIn(session !== null);
  }), []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-navy">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-gold border-t-transparent" />
      </div>
    );
  }

  if (!loggedIn) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
