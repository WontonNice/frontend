// src/auth/HomeGate.tsx
import { Navigate, useLocation } from "react-router-dom";
import Login from "../components/Login";

export default function HomeGate() {
  const loc = useLocation();
  const user = safeGetUser();

  // Not logged in → show login page
  if (!user) return <Login />;

  // Prefer the route the user originally tried to visit
  const rawFrom = (loc.state as any)?.from as string | undefined;
  const from =
    typeof rawFrom === "string" && rawFrom.startsWith("/") ? rawFrom : undefined;

  // Fallback: role-based default
  const role = user.role === "teacher" ? "teacher" : "student";
  const defaultDest = role === "teacher" ? "/teacher-dashboard" : "/student-dashboard";

  return <Navigate to={from ?? defaultDest} replace />;
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
