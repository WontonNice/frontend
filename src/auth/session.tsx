// src/auth/session.ts
export type User = {
  id: string;
  username: string;
  role: "teacher" | "student";
  created_at: string;
};

export function getUser(): User | null {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const u = JSON.parse(raw);
    return u && u.id ? u : null;
  } catch {
    return null;
  }
}

export function setUser(u: User) {
  localStorage.setItem("user", JSON.stringify(u));
}

export function clearUser() {
  localStorage.removeItem("user");
}
