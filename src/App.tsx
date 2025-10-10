import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import StudentDashboard from "./components/StudentDashboard";
import TeacherDashboard from "./components/TeacherDashboard";
import RequireAuth from "./auth/RequireAuth";
import RequireRole from "./auth/RequireRole";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected: Student only */}
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

        {/* Protected: Teacher only */}
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
