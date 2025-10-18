const API = import.meta.env.VITE_BACKEND_URL || ""; // e.g. http://localhost:3000

export async function fetchExamLock(slug: string): Promise<boolean> {
  const r = await fetch(`${API}/api/exams/${encodeURIComponent(slug)}/lock`);
  if (!r.ok) throw new Error("Failed to load lock");
  const j = await r.json();
  return !!j.locked;
}

export async function setExamLock(slug: string, locked: boolean): Promise<boolean> {
  const r = await fetch(`${API}/api/exams/${encodeURIComponent(slug)}/lock`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      // If you have real auth, send your auth header here instead:
      "x-user-role": "teacher",
    },
    body: JSON.stringify({ locked }),
  });
  if (!r.ok) throw new Error("Failed to update lock");
  const j = await r.json();
  return !!j.locked;
}
