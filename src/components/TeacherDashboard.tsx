//import React from "react";
import LogoutButton from "./LogoutButton";

function TeacherDashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
      <h1 className="text-3xl font-semibold mb-2">👩‍🏫 Teacher Dashboard</h1>
      <p className="text-gray-300">Welcome, {user.username}!</p>
      <LogoutButton />
    </div>
  );
}

export default TeacherDashboard; // ✅ Add this line
