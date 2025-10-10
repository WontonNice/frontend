import { BrowserRouter, Routes, Route } from "react-router-dom";
import Register from "./components/Register";
import StudentDashboard from "./components/StudentDashboard";
import TeacherDashboard from "./components/TeacherDashboard";
import RequireAuth from "./auth/RequireAuth";
import RequireRole from "./auth/RequireRole";
import HomeGate from "./auth/HomeGate";

export default function App() {
  return (
    <BrowserRouter>
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
      </Routes>
    </BrowserRouter>
  );
}
