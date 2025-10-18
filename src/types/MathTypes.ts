// src/components/types/MathTypes.ts

/** Math-only interactions (kept separate from reading) */
export type MathInteractionType =
  | "single_select"
  | "multi_select"
  | "short_response"
  | "math_dropdowns";

/** Dropdown answers: id -> selected option index (or undefined) */
export type MathDropAnswer = Record<string, number | undefined>;

/** Answer value shapes allowed in math items */
export type MathAnswerValue =
  | string           // short_response (numeric-as-text OK)
  | number           // single_select
  | number[]         // multi_select
  | MathDropAnswer   // math inline dropdowns
  | undefined;
