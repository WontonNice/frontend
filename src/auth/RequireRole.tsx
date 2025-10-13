// src/auth/RequireRole.tsx
import type { PropsWithChildren, ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

export default function RequireRole({
  children,
  role,
}: PropsWithChildren<{ role: "teacher" | "student" }>): ReactNode {
  const location = useLocation();
  const user = safeGetUser();

  // Not logged in → persist intended path and go to "/"
  if (!user) {
    try {
      const intended = location.pathname + location.search + location.hash;
      sessionStorage.setItem("redirect", intended);
    } catch {
      // ignore storage errors
    }
    return <Navigate to="/" replace />;
  }

  // Default role fallback (treat missing as "student")
  const userRole: "teacher" | "student" =
    user.role === "teacher" ? "teacher" : "student";

  // If user tries to open the wrong dashboard → redirect them to their own
  if (userRole !== role) {
    return (
      <Navigate
        to={userRole === "teacher" ? "/teacher-dashboard" : "/student-dashboard"}
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  // Correct role → allow access
  return children as ReactNode;
}

function safeGetUser():
  | { id?: string; username?: string; role?: "teacher" | "student"; [k: string]: unknown }
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
