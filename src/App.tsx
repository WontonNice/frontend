// src/App.tsx
import { useState } from "react";

type Page = "home" | "second";

export default function App() {
  const [page, setPage] = useState<Page>("home");
  return page === "second" ? (
    <PageWrap>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Second Page</h1>
      </header>
      <main className="text-gray-400 mb-6">
        Blank placeholder for future content.
      </main>
      <Button onClick={() => setPage("home")}>← Back to Home</Button>
    </PageWrap>
  ) : (
    <PageWrap>
      <header className="mb-2">
        <h1 className="text-3xl font-bold">My Minimal Website</h1>
      </header>
      <p className="text-gray-400 mb-6">
        Clean backbone with two pages. Add sections later.
      </p>
      <Button onClick={() => setPage("second")}>Go to Second Page →</Button>
    </PageWrap>
  );
}

function PageWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid place-items-center p-8 bg-gray-900 text-white">
      <div className="max-w-xl w-full text-center">{children}</div>
    </div>
  );
}

function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = "", ...rest } = props;
  return (
    <button
      {...rest}
      className={`px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 ${className}`}
    />
  );
}
