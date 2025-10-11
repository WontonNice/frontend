// src/data/satMathBank.ts
export type SatMathQuestion = {
  id: string;
  prompt: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
  source: string; // ✅ new parameter
};

export const satMathBank: SatMathQuestion[] = [
  {
    id: "lin-5x",
    prompt: "If 5x + 3 = 2x + 18, what is the value of x?",
    choices: ["5", "-5", "7", "15"],
    correctIndex: 0,
    explanation: "5x + 3 = 2x + 18 ⇒ 3x = 15 ⇒ x = 5.",
    source: "SAT Practice Test #1 — Section 3, Q4"
  },
  {
    id: "ratio-3-5",
    prompt: "In a bag, the ratio of red to blue marbles is 3:5. If there are 40 marbles total, how many are red?",
    choices: ["15", "25", "20", "12"],
    correctIndex: 0,
    explanation: "Total parts = 3 + 5 = 8. Red = (3/8) × 40 = 15.",
    source: "Custom Question Bank — Ratios Set 1"
  }
];
