// C:\Users\minio\OneDrive\Documents\frontend\src\data\exams.ts
import type { Exam, Section, Question } from "../types/exams";

// Read JSON exams from either src/exams or server/exams
const srcModules    = import.meta.glob("../exams/*.json",           { eager: true });
const serverModules = import.meta.glob("../../server/exams/*.json",  { eager: true });

// Merge both module maps
const modules = { ...srcModules, ...serverModules };

function normalizeExam(mod: any): Exam {
  const raw = mod?.default ?? mod; // support m.default or m

  return {
    ...raw,
    sections: (raw.sections ?? []).map((s: any): Section => ({
      ...s,
      // allow "passageMarkdown" (preferred) or legacy "passage"
      passageMarkdown:
        typeof s.passageMarkdown === "string"
          ? s.passageMarkdown
          : typeof s.passage === "string"
          ? s.passage
          : undefined,
      passageImages: Array.isArray(s.passageImages) ? s.passageImages : undefined,
      questions: (s.questions ?? []).map((q: any): Question => ({
        ...q,
        stemMarkdown: q.stemMarkdown ?? q.promptMarkdown ?? "",
        image: q.image ?? undefined,
        choices: q.choices ?? [],
        answerIndex: typeof q.answerIndex === "number" ? q.answerIndex : undefined,
        explanationMarkdown: q.explanationMarkdown ?? undefined,
      })),
    })),
  };
}

const exams: Exam[] = Object.values(modules).map((m: any) => normalizeExam(m));

// (Optional) quick visibility while debugging:
// console.log("Loaded exams:", exams.map(e => e.slug));

export const listExams     = () => exams;
export const getExamBySlug = (slug: string) => exams.find((e) => e.slug === slug);
