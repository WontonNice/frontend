// src/data/questionBank.ts
export type QuestionBase = {
  id: string;
  prompt: string;
  type: "mcq" | "short";
};

export type MCQ = QuestionBase & {
  type: "mcq";
  choices: string[];
  answerIndex: number; // 0-based
};

export type Short = QuestionBase & {
  type: "short";
  answerText: string; // normalized expected answer
};

export type Question = MCQ | Short;

export type SatSection = "math" | "english";

export const questionBank: Record<SatSection, Question[]> = {
  math: [
    {
      id: "m1",
      type: "mcq",
      prompt: "What is 7 × 8?",
      choices: ["54", "56", "64", "58"],
      answerIndex: 1,
    },
    {
      id: "m2",
      type: "short",
      prompt: "Solve for x: 2x + 6 = 20",
      answerText: "7", // 2x=14 => x=7
    },
  ],
  english: [
    {
      id: "e1",
      type: "mcq",
      prompt:
        "Which option best completes the sentence? “Neither the teacher nor the students ___ late.”",
      choices: ["was", "were", "is", "be"],
      answerIndex: 2, // “is”
    },
    {
      id: "e2",
      type: "short",
      prompt:
        "Replace the word in ALL CAPS with the best choice: “The directions were AMBIGUOUS.” (write the best synonym)",
      answerText: "unclear",
    },
  ],
};

// utility to normalize user input for short answers
export function normalize(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}