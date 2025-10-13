// src/auth/RequireAuth.tsx
import type { PropsWithChildren, ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

export default function RequireAuth({ children }: PropsWithChildren): ReactNode {
  const loc = useLocation();
  const user = safeGetUser();

  if (!user) {
    // Persist the intended destination so HomeGate/Login can restore it
    const intended = loc.pathname + loc.search + loc.hash;
    try {
      sessionStorage.setItem("redirect", intended);
    } catch {
      // ignore storage failures
    }

    // Redirect to login/root (no need to also pass state; we prefer sessionStorage)
    return <Navigate to="/" replace />;
  }

  return children as ReactNode;
}

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

console.debug("[RequireAuth]", { user: !!safeGetUser() });