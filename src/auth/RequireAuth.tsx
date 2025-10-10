import React from "react";
import { Navigate, useLocation } from "react-router-dom";

type Props = { children: React.ReactNode }; // ✅ Fix here

export default function RequireAuth({ children }: Props) {
  const location = useLocation();
  const userStr = localStorage.getItem("user");

  if (!userStr) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
