// src/auth/HomeGate.tsx
import { Navigate } from "react-router-dom";
import Login from "../components/Login";
import { getUser } from "./session";

export default function HomeGate() {
  const user = getUser();
  if (!user) return <Login />;

  return (
    <Navigate
      to={user.role === "teacher" ? "/teacher-dashboard" : "/student-dashboard"}
      replace
    />
  );
}
