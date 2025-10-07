// src/App.tsx
import { useState } from "react";
import "./index.css";

type Page = "home" | "second";

export default function App() {
  const [page, setPage] = useState<Page>("home");

  // --- Second page ---
  if (page === "second") {
    return (
      <div className="min-h-screen grid place-items-center p-8">
        <div className="max-w-xl w-full text-center">
          <h1 className="text-2xl font-semibold mb-2">Second Page</h1>
          <p className="text-gray-600 mb-6">
            This is a blank page. You can add content or features later.
          </p>
          <button
            onClick={() => setPage("home")}
            className="px-4 py-2 rounded bg-gray-800 text-white hover:bg-gray-900"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    );
  }

  // --- Home page ---
  return (
    <div className="min-h-screen grid place-items-center p-8">
      <div className="max-w-xl w-full text-center">
        <h1 className="text-3xl font-bold mb-2">My Minimal Website</h1>
        <p className="text-gray-600 mb-6">
          Clean backbone with two pages. Add your sections here later.
        </p>
        <button
          onClick={() => setPage("second")}
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
        >
          Go to Second Page →
        </button>
      </div>
    </div>
  );
}
