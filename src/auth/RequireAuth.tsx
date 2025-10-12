// src/auth/RequireAuth.tsx
import type { PropsWithChildren, ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

export default function RequireAuth({ children }: PropsWithChildren): ReactNode {
  const loc = useLocation();
  const user = safeGetUser();

  if (!user) {
    // Not logged in → go to "/" (your Login) and remember where they tried to go
    return <Navigate to="/" replace state={{ from: loc.pathname }} />;
  }
  return children as ReactNode;
}

function safeGetUser() {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const u = JSON.parse(raw);
    return u && typeof u === "object" ? u : null;
  } catch {
    return null;
  }
}

