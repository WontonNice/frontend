// src/auth/HomeGate.tsx
import { Navigate, useLocation } from "react-router-dom";

export default function HomeGate() {
  const loc = useLocation();
  const user = safeGetUser();

  // Not logged in → go to the new split auth page
  // Preserve "from" so the page can redirect after login if you want.
  if (!user) return <Navigate to="/auth" state={{ from: loc.pathname }} replace />;

  // 1) Prefer redirect saved by RequireAuth
  let stored: string | undefined;
  try {
    stored = sessionStorage.getItem("redirect") || undefined;
    if (stored) sessionStorage.removeItem("redirect");
  } catch {}

  const safeStored = isSafePath(stored) ? stored : undefined;

  // 2) Then prefer state.from (if present and safe)
  const rawFrom = (loc.state as { from?: string } | undefined)?.from;
  const safeFrom = isSafePath(rawFrom) ? rawFrom : undefined;

  // 3) Fallback: role-based default
  const role = user.role === "teacher" ? "teacher" : "student";
  const defaultDest = role === "teacher" ? "/teacher-dashboard" : "/student-dashboard";

  return <Navigate to={safeStored ?? safeFrom ?? defaultDest} replace />;
}

function isSafePath(p?: string): p is string {
  return typeof p === "string" && p.startsWith("/");
}

type SafeUser =
  | ({ id?: string; username?: string; role?: "student" | "teacher" } & Record<string, unknown>)
  | null;

function safeGetUser(): SafeUser {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const u = JSON.parse(raw);
    return u && typeof u === "object" ? (u as SafeUser) : null;
  } catch {
    return null;
  }
}
