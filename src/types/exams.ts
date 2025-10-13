// src/types/exams.ts
export type Exam = {
  slug: string;            // "shsat-2025-a"
  title: string;           // "SHSAT Practice A"
  description?: string;
  sections: Section[];
};

export type Section = {
  id: string;              // "reading-1"
  title: string;           // "Reading Passage 1"
  type: "reading" | "math";
  passageMarkdown?: string; // for reading
  questions: Question[];
};

export type Question = {
  id: string;              // "q1"
  promptMarkdown?: string; // supports rich text
  image?: string;          // "/exams/shsat-2025-a/q1.png"
  choices?: string[];      // multiple choicea
  answerIndex?: number;    // 0-based (optional if you separate answer keys)
  explanationMarkdown?: string;
};
