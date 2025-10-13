// src/data/exams.ts
import type { Exam, Section, Question } from "../types/exams";

// 🔁 include JSON in subfolders too
const modules = import.meta.glob("../exams/**/*.json", { eager: true });

function normalizeExam(rawIn: any): Exam {
  // support both { default: json } and raw json
  const raw = rawIn?.default ?? rawIn;

  return {
    ...raw,
    sections: (raw.sections ?? []).map((s: any): Section => {
      // Spread first to keep any custom fields you add later
      const base: any = {
        ...s,

        // ✅ keep both inline passage and images if present
        passageMarkdown:
          typeof s.passageMarkdown === "string" ? s.passageMarkdown : undefined,
        passageImages: Array.isArray(s.passageImages) ? s.passageImages : undefined,

        // ✅ NEW: pass through passageMd (can be "/path/file.md" or "file.md")
        passageMd: typeof s.passageMd === "string" ? s.passageMd : undefined,

        // questions normalized below
        questions: (s.questions ?? []).map((q: any): Question => ({
          ...q,
          // back-compat: prefer stemMarkdown, then promptMarkdown, else empty
          stemMarkdown: q.stemMarkdown ?? q.promptMarkdown ?? "",
          image: q.image ?? undefined,
          choices: Array.isArray(q.choices) ? q.choices : [],
          answerIndex: typeof q.answerIndex === "number" ? q.answerIndex : undefined,
          explanationMarkdown: q.explanationMarkdown ?? undefined,
        })),
      };

      return base as Section; // keep typing happy even if Section didn't declare passageMd yet
    }),
  };
}

const exams: Exam[] = Object.values(modules).map((m: any) => normalizeExam(m));

export const listExams = () => exams;
export const getExamBySlug = (slug: string) => exams.find((e) => e.slug === slug);
