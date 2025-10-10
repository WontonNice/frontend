import React from "react";
import { Navigate } from "react-router-dom";

type Props = {
  children: React.ReactNode; // ✅ Fix here
  role: "teacher" | "student";
};

export default function RequireRole({ children, role }: Props) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  if (!user?.role) return <Navigate to="/" replace />;

  if (user.role !== role) {
    return (
      <Navigate
        to={user.role === "teacher" ? "/teacher-dashboard" : "/student-dashboard"}
        replace
      />
    );
  }

  return <>{children}</>;
}
