// src/App.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import Register from "./components/Register";
import StudentDashboard from "./components/StudentDashboard";
import TeacherDashboard from "./components/TeacherDashboard";
import RequireAuth from "./auth/RequireAuth";
import RequireRole from "./auth/RequireRole";
import HomeGate from "./auth/HomeGate";
import SATPage from "./components/SATPage";

export default function App() {
  return (
    <Routes>
      {/* Home decides: show Login or redirect to dashboard */}
      <Route path="/" element={<HomeGate />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/student-dashboard"
        element={
          <RequireAuth>
            <RequireRole role="student">
              <StudentDashboard />
            </RequireRole>
          </RequireAuth>
        }
      />

      <Route
        path="/teacher-dashboard"
        element={
          <RequireAuth>
            <RequireRole role="teacher">
              <TeacherDashboard />
            </RequireRole>
          </RequireAuth>
        }
      />

      {/* ✅ SAT placeholder page (auth required) */}
      <Route
        path="/sat"
        element={
          <RequireAuth>
            <SATPage />
          </RequireAuth>
        }
      />

      {/* catch-all to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
