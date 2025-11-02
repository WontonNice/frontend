// src/App.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import AuthSplit from "./components/AuthSplit";
import RequireAuth from "./auth/RequireAuth";
import RequireRole from "./auth/RequireRole";
import HomeGate from "./auth/HomeGate";

import DashboardLayout from "./components/DashboardLayout";
import StudentDashboard from "./components/StudentDashboard";
import TeacherDashboard from "./components/TeacherDashboard";

import SATPage from "./components/SATPage";
import SATMathPage from "./components/SATMathPage";
import SATMathPanel1 from "./components/SATMathPanel1";
import SATMathPanel2 from "./components/SATMathPanel2";

import StudyHallReadingRunner from "./components/StudyHallReadingRunner";
import StudyHallReading from "./components/StudyHallReadingPage";

import Achievements from "./components/Achievements";

import LiveActivitiesPage from "./components/LiveActivitiesPage"; 
import LiveSessionPage from "./components/LiveSessionPage";
import ExamsPage from "./components/Exams/ExamsPage";
import ExamRunnerPage from "./components/Exams/ExamRunnerPage";           // ⬅️ new
import ExamFullscreenLayout from "./components/Exams/ExamFullscreenLayout";

import SetTheoryPractice from "./components/practice/SetTheoryPractice";
import AgePractice from "./components/practice/AgePractice";
import CombinatoricsPractice from "./components/practice/CombinatoricsPractice";
import InequalitiesPractice from "./components/practice/InequalityPractice";
import ConsecutiveIntegers from "./components/practice/ConsecutiveIntegers";
import Arithmetic from "./components/practice/Arithmetic";
import Algebra from "./components/practice/Algebra";

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<HomeGate />} />
      <Route path="/auth" element={<AuthSplit />} />
      <Route path="/login" element={<AuthSplit />} />
      <Route path="/register" element={<AuthSplit />} />

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
        <Route path="/achievements" element={<Achievements />} />

        {/* Study routes */}
        <Route path="/study" element={<SATPage />} />
        <Route path="/study/math" element={<SATMathPage />} />
        <Route path="/study/math/panel-1" element={<SATMathPanel1 />} />
        <Route path="/study/math/panel-2" element={<SATMathPanel2 />} />
        <Route path="/study/math/set-theory" element={<SetTheoryPractice />} />
        <Route path="/study/math/age-practice" element={<AgePractice />} />
        <Route path="/study/math/combinatorics" element={<CombinatoricsPractice />} />
        <Route path="/study/math/inequalities" element={<InequalitiesPractice />} />
        <Route path="/study/math/consecutive-integers" element={<ConsecutiveIntegers />} />
        <Route path="/study/math/arithmetic" element={<Arithmetic />} />
        <Route path="/study/math/algebra" element={<Algebra />} />

        <Route path="/study/reading" element={<StudyHallReading />} />

        {/* ✅ Live Activities route */}
        <Route path="/live-activities" element={<LiveActivitiesPage />} />
        <Route path="/live-activities/session" element={<LiveSessionPage />} />

        {/* ✅ Exams route */}
        <Route path="/exams" element={<ExamsPage />} />
      </Route>

      {/* Authenticated WITHOUT dashboard chrome (fullscreen runner) */}
      <Route
        path="/exam/:slug"
        element={
          <RequireAuth>
            <ExamFullscreenLayout>
              <ExamRunnerPage />
            </ExamFullscreenLayout>
          </RequireAuth>
        }
      />

      <Route
  path="/reading-runner"
  element={
    <RequireAuth>
      <ExamFullscreenLayout>
        <StudyHallReadingRunner />
      </ExamFullscreenLayout>
    </RequireAuth>
  }
/>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/auth" replace />} />
    </Routes>
  );
}
