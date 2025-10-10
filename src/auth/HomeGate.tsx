import { Navigate } from "react-router-dom";
import Login from "../components/Login";

export default function HomeGate() {
  const raw = localStorage.getItem("user");
  if (!raw) return <Login />;

  let user: any = null;
  try { user = JSON.parse(raw); } catch {}
  if (!user || !user.id) return <Login />;

  // ✅ Fallback to 'student' if role is missing
  const role = user.role === "teacher" ? "teacher" : "student";
  return <Navigate to={role === "teacher" ? "/teacher-dashboard" : "/student-dashboard"} replace />;
}
