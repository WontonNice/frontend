import { useState } from "react";

export default function App() {
  const [page, setPage] = useState("home");
  return (
    <div className="min-h-screen grid place-items-center p-8 bg-gray-900 text-white">
      {page === "home" ? (
        <button
          onClick={() => setPage("second")}
          className="px-4 py-2 rounded bg-blue-600"
        >
          Go to Second Page →
        </button>
      ) : (
        <button
          onClick={() => setPage("home")}
          className="px-4 py-2 rounded bg-blue-600"
        >
          ← Back to Home
        </button>
      )}
    </div>
  );
}
