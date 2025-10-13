// src/data/exams.ts
import type { Exam, Section, Question } from "../types/exams";

const modules = import.meta.glob("../exams/*.json", { eager: true });

function normalizeExam(rawIn: any): Exam {
  // support both { default: json } and raw json
  const raw = rawIn?.default ?? rawIn;

  return {
    ...raw,
    sections: (raw.sections ?? []).map((s: any): Section => ({
      ...s,
      passageMarkdown: typeof s.passageMarkdown === "string" ? s.passageMarkdown : undefined,
      passageImages: Array.isArray(s.passageImages) ? s.passageImages : undefined,
      questions: (s.questions ?? []).map((q: any): Question => ({
        ...q,
        stemMarkdown: q.stemMarkdown ?? q.promptMarkdown ?? "", // back-compat
        image: q.image ?? undefined,
        choices: q.choices ?? [],
        answerIndex: typeof q.answerIndex === "number" ? q.answerIndex : undefined,
        explanationMarkdown: q.explanationMarkdown ?? undefined,
      })),
    })),
  };
}

const exams: Exam[] = Object.values(modules).map((m: any) => normalizeExam(m));

export const listExams = () => exams;
export const getExamBySlug = (slug: string) => exams.find((e) => e.slug === slug);
