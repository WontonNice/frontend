import React from "react";
import { Navigate, useLocation } from "react-router-dom";

type Props = {
  children: React.ReactNode;
  role: "teacher" | "student";
};

export default function RequireRole({ children, role }: Props) {
  const location = useLocation();
  let user: any = null;
  try { user = JSON.parse(localStorage.getItem("user") || "null"); } catch {}

  if (!user?.id) return <Navigate to="/" replace state={{ from: location.pathname }} />;

  // ✅ Treat missing/invalid role as 'student'
  const userRole: "teacher" | "student" = user.role === "teacher" ? "teacher" : "student";

  // If the user doesn't match this route's role, send them to THEIR dashboard.
  if (userRole !== role) {
    return (
      <Navigate
        to={userRole === "teacher" ? "/teacher-dashboard" : "/student-dashboard"}
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return <>{children}</>;
}
