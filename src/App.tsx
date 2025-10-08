// src/App.tsx
import { useState } from "react";
import { api, BASE_URL } from "./lib/api";

type Page = "home" | "second";

export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [health, setHealth] = useState<string>("");
  const [hello, setHello] = useState<string>("");

  const hitHealth = async () => {
    try { setHealth(await api.health()); } catch (e:any) { setHealth(e.message); }
  };
  const hitHello = async () => {
    try { const r = await api.hello(); setHello(r.msg); } catch (e:any) { setHello(e.message); }
  };

  return page === "second" ? (
    <PageWrap>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Second Page</h1>
      </header>
      <main className="text-gray-400 mb-6">
        Backend: <code className="text-white">{BASE_URL}</code>
      </main>
      <div className="flex gap-3 justify-center">
        <Button onClick={hitHealth}>GET /health</Button>
        <Button onClick={hitHello}>GET /api/hello</Button>
      </div>
      <div className="mt-4 text-left">
        <p><strong>/health:</strong> {health || "—"}</p>
        <p><strong>/api/hello:</strong> {hello || "—"}</p>
      </div>
      <Button className="mt-8" onClick={() => setPage("home")}>← Back to Home</Button>
    </PageWrap>
  ) : (
    <PageWrap>
      <header className="mb-2">
        <h1 className="text-3xl font-bold">My Minimal Website</h1>
      </header>
      <p className="text-gray-400 mb-6">
        Clean backbone with two pages. Add sections later.
      </p>
      <div className="flex gap-3 justify-center">
        <Button onClick={() => setPage("second")}>Go to Second Page →</Button>
        <Button onClick={hitHealth}>GET /health</Button>
        <Button onClick={hitHello}>GET /api/hello</Button>
      </div>
      <div className="mt-4 text-left">
        <p><strong>/health:</strong> {health || "—"}</p>
        <p><strong>/api/hello:</strong> {hello || "—"}</p>
      </div>
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
