// src/types/exams.ts
export type Exam = {
  slug: string;             // "shsat-2025-a"
  title: string;            // "SHSAT Practice A"
  description?: string;
  sections: Section[];
};

export type Section = {
  id: string;               // "reading-1"
  title: string;            // "Reading Passage 1"
  type: "reading" | "math";
  /** Shared passage displayed in the left column for all questions in this section */
  passageMarkdown?: string;
  /** Optional figures/images that belong to the passage */
  passageImages?: string[];
  questions: Question[];
};

export type Question = {
  id: string;               // "q1"
  /** Question stem shown on the RIGHT column */
  stemMarkdown?: string;

  /** @deprecated (use stemMarkdown) – kept for old JSONs */
  promptMarkdown?: string;

  /** Per-question image (e.g., math diagram) */
  image?: string;

  /** Multiple-choice options (A–D) */
  choices?: string[];

  /** 0-based index of the correct answer (optional if stored elsewhere) */
  answerIndex?: number;

  /** Optional explanation for review */
  explanationMarkdown?: string;
};
