// src/data/mathQuestionBank.ts
export type MathSource = "tutorverse" | "official" | "tei";

export type MathQuestionSingle = {
  id: string;
  type: "single_select";
  source?: MathSource;
  stemMarkdown: string;          // KaTeX allowed, rendered with <MathText/>
  image?: string;
  choices: string[];             // KaTeX allowed per choice
  answerIndex: number;
  explanationMarkdown?: string;  // optional
};

export type MathQuestionMulti = {
  id: string;
  type: "multi_select";
  source?: MathSource;
  stemMarkdown: string;
  image?: string;
  choices: string[];
  correctIndices: number[];
  selectCount?: number;
  explanationMarkdown?: string;
};

export type MathQuestionShortResponse = {
  id: string;
  type: "short_response";
  source?: MathSource;
  stemMarkdown: string;          // KaTeX allowed
  image?: string;
  /** Store the canonical correct answer as a string. */
  correctAnswer: string;         // e.g. "31", "-2.5"
  /** Optional display-only guidance */
  directionsMarkdown?: string;
  explanationMarkdown?: string;
};

export type MathQuestion =
  | MathQuestionSingle
  | MathQuestionMulti
  | MathQuestionShortResponse;

const Q: Record<string, MathQuestion> = {
  /* ===========================================================
     SHORT RESPONSE — “If x = -9 and y = 4 …”
     =========================================================== */
  "MATH-SR-001": {
    id: "MATH-SR-001",
    type: "short_response",
    source: "official",
    stemMarkdown:
      "If $x=-9$ and $y=4$, what is the value of $-3x - y(2y + x)$?",
    directionsMarkdown:
      "(Enter all answers numerically. Do not include any spaces. For negative answers, please use the “-” key. For whole numbers, do not include a decimal. For nonwhole numbers, please enter your answer in decimal form and round to the nearest tenth.)",
    correctAnswer: "31",
    explanationMarkdown:
      "Compute $-3x=27$ and $y(2y+x)=4\\cdot(8-9)=-4$. Then $-3x-y(2y+x)=27-(-4)=31$.",
  },

  // --- (other questions you already have or will add later) ---
};

export function getMathQuestionsByIds(ids: string[]): MathQuestion[] {
  return ids.map((id) => Q[id]).filter(Boolean);
}
