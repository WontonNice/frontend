// src/components/types/MathTypes.ts

/** Math-only interactions (kept separate from reading) */
export type MathInteractionType =
  | "single_select"
  | "multi_select"
  | "short_response";

/** Answer value shapes allowed in math items */
export type MathAnswerValue =
  | string        // short_response (often numeric-as-text)
  | number        // single_select
  | number[]      // multi_select (if used)
  | undefined;
