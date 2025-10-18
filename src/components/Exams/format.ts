// src/domain/exams/lib/format.ts
// Small formatting helpers so pages can remain declarative.

export const percent = (num: number, den: number) => {
  if (!den || den <= 0) return "—";
  return Math.round((num / den) * 100) + "%";
};

export const fixed1 = (n: number) => (Math.round(n * 10) / 10).toFixed(1);

export const choiceLetter = (i: number) => {
  if (i == null || isNaN(i)) return "";
  const base = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return base[i] ?? String(i);
};

export const groupLabel = (t?: string) =>
  t === "math" ? "Math" : t === "reading" ? "Reading" : (t ?? "").replace(/\b\w/g, c => c.toUpperCase());

export type ScoreSummary = {
  correctCount: number;
  totalScored: number;
  pointsEarned: number;
  pointsPossible: number;
};

export const summaryText = (s: ScoreSummary) => {
  const pct = percent(s.pointsEarned, s.pointsPossible);
  return `${s.pointsEarned}/${s.pointsPossible} points · ${pct} · ${s.correctCount}/${s.totalScored} correct`;
};
