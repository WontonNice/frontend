// src/components/ExamSharedTypes.ts
import type { ReadingAnswerValue } from "../../types/ReadingTypes";
import type { MathAnswerValue } from "../../types/MathTypes";

/** Global answer value = reading OR math shape */
export type GlobalAnswerValue = ReadingAnswerValue | MathAnswerValue;

/** One map used by Runner/Results keyed by globalId */
export type AnswerMap = Record<string, GlobalAnswerValue>;

/** For tagging questions by origin */
export type SourceType = "tutorverse" | "official" | "tei" | string;
