// src/data/mathQuestionBank.ts
export type MathSource = "tutorverse" | "official" | "tei";

export type MathQuestionSingle = {
  id: string;
  type: "single_select";
  source?: MathSource;
  stemMarkdown: string;          // KaTeX allowed
  image?: string;                // <-- image path (served from /public)
  choices: string[];
  answerIndex: number;
  explanationMarkdown?: string;
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
  stemMarkdown: string;
  image?: string;
  correctAnswer: string;         // canonical numeric string, e.g. "31"
  directionsMarkdown?: string;
  explanationMarkdown?: string;
};

export type MathQuestion =
  | MathQuestionSingle
  | MathQuestionMulti
  | MathQuestionShortResponse;

const Q: Record<string, MathQuestion> = {
  /* ---------- Short Response example ---------- */
  "MATH-0001": {
    id: "MATH-0001",
    type: "short_response",
    source: "official",
    stemMarkdown:
      "If $x=-9$ and $y=4$, what is the value of $-3x - y(2y + x)$?",
    directionsMarkdown:
      "(Enter all answers numerically. Do not include any spaces. For negative answers, use “-”. For whole numbers, do not include a decimal. For nonwhole numbers, round to the nearest tenth.)",
    correctAnswer: "31",
    explanationMarkdown:
      "$-3x=27$ and $y(2y+x)=4(8-9)=-4$. So $27-(-4)=31$."
  },

  /* ---------- Single Select WITH IMAGE ---------- */
  "MATH-0002": {
    id: "MATH-0002",
    type: "single_select",
    source: "tutorverse",
    stemMarkdown:
      "In the figure above, $ABCE$ is a parallelogram. The measure of $\\angle EAD$ is $27^\\circ$, and $\\angle ADE$ is a right angle. What is the measure of $\\angle ABC$?",
    image: "../../public/exams/math/imgsrc/MATH-002.png", // put the file in /public/exams/math/
    choices: ["$63^\\circ$", "$90^\\circ$", "$117^\\circ$", "$180^\\circ$"],
    answerIndex: 2,
    explanationMarkdown:
      "Since $AD\\perp AB$ and $\\angle EAD=27^\\circ$, $\\angle EAB=27^\\circ+90^\\circ=117^\\circ$. Because $AE\\parallel BC$, $\\angle ABC=\\angle EAB=117^\\circ$."
  }
  // …add more questions here
};

export function getMathQuestionsByIds(ids: string[]): MathQuestion[] {
  return ids.map((id) => Q[id]).filter(Boolean);
}
