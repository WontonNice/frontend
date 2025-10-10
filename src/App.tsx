// src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default route → Login page */}
        <Route path="/" element={<Login />} />

        {/* Create Account route */}
        <Route path="/register" element={<Register />} />
      </Routes>
    </BrowserRouter>
  );
}
