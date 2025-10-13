// src/data/exams.ts
import type { Exam, Question } from "../types/exams";

// import all JSONs from src/exams
const modules = import.meta.glob("../exams/*.json", { eager: true });

function normalize(exam: any): Exam {
  return {
    ...exam,
    sections: (exam.sections ?? []).map((sec: any) => ({
      ...sec,
      // ensure passage fields survive and are strings/arrays
      passageMarkdown: typeof sec.passageMarkdown === "string" ? sec.passageMarkdown : undefined,
      passageImages: Array.isArray(sec.passageImages) ? sec.passageImages : undefined,
      questions: (sec.questions ?? []).map((q: Question) => ({
        ...q,
        // back-compat so old promptMarkdown still works
        stemMarkdown: (q as any).stemMarkdown ?? (q as any).promptMarkdown,
      })),
    })),
  };
}

const exams: Exam[] = Object.values(modules).map((m: any) => normalize(m.default));

export const listExams = () => exams;
export const getExamBySlug = (slug: string) => exams.find((e) => e.slug === slug);
