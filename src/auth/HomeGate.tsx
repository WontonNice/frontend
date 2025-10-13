// src/auth/HomeGate.tsx
import { Navigate, useLocation } from "react-router-dom";
import Login from "../components/Login";

export default function HomeGate() {
  const loc = useLocation();
  const user = safeGetUser();

  // Not logged in → show login page
  if (!user) return <Login />;

  // 1) Prefer redirect saved by RequireAuth
  let stored = undefined as string | undefined;
  try {
    stored = sessionStorage.getItem("redirect") || undefined;
    if (stored) sessionStorage.removeItem("redirect");
  } catch {
    // ignore storage errors
  }
  const safeStored =
    typeof stored === "string" && stored.startsWith("/") ? stored : undefined;

  // 2) Then prefer state.from (if present and safe)
  const rawFrom = (loc.state as any)?.from as string | undefined;
  const safeFrom =
    typeof rawFrom === "string" && rawFrom.startsWith("/") ? rawFrom : undefined;

  // 3) Fallback: role-based default
  const role = user.role === "teacher" ? "teacher" : "student";
  const defaultDest = role === "teacher" ? "/teacher-dashboard" : "/student-dashboard";

  return <Navigate to={safeStored ?? safeFrom ?? defaultDest} replace />;
}

// Helper: be permissive; treat any parsed object as "logged in"
function safeGetUser():
  | { id?: string; username?: string; role?: "student" | "teacher"; [k: string]: unknown }
  | null {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const u = JSON.parse(raw);
    return u && typeof u === "object" ? u : null;
  } catch {
    return null;
  }
}
