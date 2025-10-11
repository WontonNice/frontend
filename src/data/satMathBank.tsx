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

  {
    id: "linear-3x-24",
    prompt: "If $3x = 24$, what is the value of $2x - 3$?",
    choices: ["$8$", "$10$", "$11$", "$13$"],
    correctIndex: 3, // ✅ 2x = 16 → 2x - 3 = 13
    explanation:
      "From $3x=24$, we get $x=8$. Then $2x-3=16-3=13$.",
    source: "Provided image — simple linear equation",
    topic: "arithmetic",
  },

  {
    id: "geometry-rectangular-prism-volume",
    prompt:
      "A box in the shape of a right rectangular prism has a volume of $60$ cubic inches. If the dimensions of the box are $3$ inches by $5$ inches by $h$ inches, what is the value of $h$?",
    choices: ["$3$", "$4$", "$5$", "$6$"],
    correctIndex: 1, // ✅ 3×5×h = 60 → h = 4
    explanation:
      "The volume of a rectangular prism is $V = lwh$. Substituting: $60 = 3\\times5\\times h \\Rightarrow 60 = 15h \\Rightarrow h = 4$.",
    source: "Provided image — geometry/volume problem",
    topic: "geometry",
  },

];
