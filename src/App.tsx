// src/App.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import Register from "./components/Register";
import StudentDashboard from "./components/StudentDashboard";
import TeacherDashboard from "./components/TeacherDashboard";
import RequireAuth from "./auth/RequireAuth";
import RequireRole from "./auth/RequireRole";
import HomeGate from "./auth/HomeGate";
import SATPage from "./components/SATPage";
import DashboardLayout from "./components/DashboardLayout";

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<HomeGate />} />
      <Route path="/register" element={<Register />} />

      {/* Authenticated layout (keeps Sidebar/TopBar/Hero) */}
      <Route element={
        <RequireAuth>
          <DashboardLayout />
        </RequireAuth>
      }>
        <Route
          path="/student-dashboard"
          element={
            <RequireRole role="student">
              <StudentDashboard />
            </RequireRole>
          }
        />
        <Route
          path="/teacher-dashboard"
          element={
            <RequireRole role="teacher">
              <TeacherDashboard />
            </RequireRole>
          }
        />
        <Route path="/sat" element={<SATPage />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
