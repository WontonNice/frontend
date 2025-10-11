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
    prompt: "If $\\,(x-2)^2 - 6(x-2) + 9 = 0\\,$, what is the value of $x$?",
    choices: ["$2$", "$3$", "$5$", "$7$"],
    correctIndex: 1,
    explanation:
      "Ask Nathan Teacher",
    source: "May 2017 QAS Question #5",
    topic: "algebra",
  },

  // Probability (not apple)
  {
    id: "prob-not-apple-5-3-6",
    prompt:
      "A cooler contains 5 apple, 3 grape, and 6 orange juices. What is the probability a random bottle is \\emph{not} apple?",
    choices: ["$\\tfrac{1}{9}$", "$\\tfrac{5}{14}$", "$\\tfrac{9}{14}$", "$\\tfrac{2}{3}$"],
    correctIndex: 2,
    explanation:
      "Total $=14$, not-apple $=9\\Rightarrow\\;\\dfrac{9}{14}$.",
    source: "SHSAT-style probability example (provided screenshot)",
    topic: "data-analysis",
  },
  // ...your other questions
];