// src/auth/RequireRole.tsx
import type { PropsWithChildren, ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

export default function RequireRole({
  children,
  role,
}: PropsWithChildren<{ role: "teacher" | "student" }>): ReactNode {
  const location = useLocation();
  const user = safeGetUser();

  // Not logged in → go to login page
  if (!user) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  // Default role fallback (treat missing as "student")
  const userRole: "teacher" | "student" =
    user.role === "teacher" ? "teacher" : "student";

  // If user tries to open the wrong dashboard → redirect them
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

function safeGetUser(): { id?: string; username?: string; role?: string } | null {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const u = JSON.parse(raw);
    if (u && typeof u.username === "string") return u;
    return null;
  } catch {
    return null;
  }
}
