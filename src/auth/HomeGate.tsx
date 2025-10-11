// src/auth/HomeGate.tsx
import { Navigate } from "react-router-dom";
import Login from "../components/Login";

export default function HomeGate() {
  const user = safeGetUser();

  // If not logged in → show login page
  if (!user) return <Login />;

  // Fallback: if role missing, treat as student
  const role = user.role === "teacher" ? "teacher" : "student";

  // Redirect based on role
  return (
    <Navigate
      to={role === "teacher" ? "/teacher-dashboard" : "/student-dashboard"}
      replace
    />
  );
}

// Helper function: avoids crashes from bad JSON
function safeGetUser() {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const u = JSON.parse(raw);
    if (!u || !u.id || !u.username) return null;
    return u;
  } catch {
    return null;
  }
}
