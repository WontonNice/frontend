// src/data/satMathBank.ts
export type SatMathTopic =
  | "algebra"
  | "arithmetic"
  | "ratios"
  | "geometry"
  | "data-analysis";

export type SatMathQuestion = {
  id: string;
  prompt: string;
  choices: string[];     // keep for now (used by current runner)
  correctIndex: number;  // keep for now
  explanation: string;
  source: string;
  topic: SatMathTopic;   // ✅ replaced questionType with topic
};

export const satMathBank: SatMathQuestion[] = [
  {
    id: "algebra-square-shift",
    prompt: "If (x − 2)^2 − 6(x − 2) + 9 = 0, what is the value of x?",
    choices: ["2", "3", "5", "7"],
    correctIndex: 2, // 5
    explanation:
      "Let y = x − 2. Then y^2 − 6y + 9 = (y − 3)^2 = 0 ⇒ y = 3 ⇒ x = 5.",
    source: "Provided image (Algebra completing the square)",
    topic: "algebra",
  },
  {
    id: "ratio-3-5",
    prompt:
      "In a bag, the ratio of red to blue marbles is 3:5. If there are 40 marbles total, how many are red?",
    choices: ["15", "25", "20", "12"],
    correctIndex: 0,
    explanation: "Total parts = 3 + 5 = 8. Red = (3/8) × 40 = 15.",
    source: "Custom Question Bank — Ratios Set 1",
    topic: "ratios",
  },
];
