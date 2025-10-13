// src/data/exams.ts
import type { Exam } from "../types/exams";

const modules = import.meta.glob("../exams/*.json", { eager: true });

const exams: Exam[] = Object.values(modules).map((m: any) => m.default);

// quick helpers
export const listExams = () => exams;
export const getExamBySlug = (slug: string) =>
  exams.find((e) => e.slug === slug);
