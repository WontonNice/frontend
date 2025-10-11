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
    correctIndex: 2, // ✅ corrected to match x = 5
    explanation:
      "Let $y=x-2$. Then $y^2-6y+9=(y-3)^2=0\\Rightarrow y=3\\Rightarrow x=5$.",
    source: "May 2017 QAS Question #5",
    topic: "algebra",
  },

  // ✅ NEW: 1.2(h+2) = 2h - 1.2
  {
    id: "solve-h-1p2-linear",
    prompt: "Solve for $h$ in the equation $1.2(h+2)=2h-1.2$.",
    choices: ["$1.2$", "$2.4$", "$4.5$", "$6$"],
    correctIndex: 2, // corresponds to $4.5$
    explanation:
      "Distribute: $1.2h+2.4=2h-1.2$. Subtract $1.2h$: $2.4=0.8h-1.2$. Add $1.2$: $3.6=0.8h$. Thus $h=\\dfrac{3.6}{0.8}=4.5$.",
    source: "Provided image — linear equation with decimals",
    topic: "algebra",
  },
];
