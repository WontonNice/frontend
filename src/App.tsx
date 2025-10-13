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
import SATMathPage from "./components/SATMathPage";
import SATMathPanel1 from "./components/SATMathPanel1";
import LiveActivitiesPage from "./components/LiveActivitiesPage"; 
import LiveSessionPage from "./components/LiveSessionPage";
import ExamsPage from "./components/ExamsPage";

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<HomeGate />} />
      <Route path="/register" element={<Register />} />

      {/* Authenticated layout (keeps Sidebar/TopBar/Hero) */}
      <Route
        element={
          <RequireAuth>
            <DashboardLayout />
          </RequireAuth>
        }
      >
        {/* Student and teacher dashboards */}
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

        {/* SAT routes */}
        <Route path="/sat" element={<SATPage />} />
        <Route path="/sat/math" element={<SATMathPage />} />
        <Route path="/sat/math/panel-1" element={<SATMathPanel1 />} />

        {/* ✅ Live Activities route */}
        <Route path="/live-activities" element={<LiveActivitiesPage />} />
        <Route path="/live-activities/session" element={<LiveSessionPage />} />

        {/* ✅ Exams route */}
        <Route path="/exams" element={<ExamsPage />} />
        <Route path="/exam/:slug" element={<ExamsPage />} />

      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
