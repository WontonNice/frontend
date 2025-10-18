// src/components/types/ReadingTypes.ts
import type {
  DragAnswer as DragMap,
  TableAnswer,
  ClozeAnswer,
} from "../components/Exams/techenhanced/types";

/** Reading (incl. ELA A/B) interactions */
export type ReadingInteractionType =
  | "single_select"
  | "multi_select"
  | "drag_to_bins"
  | "table_match"
  | "cloze_drag"
  | "short_response";

/** Answer value shapes allowed in reading/ELA items */
export type ReadingAnswerValue =
  | string        // short_response text
  | number        // single_select
  | number[]      // multi_select
  | DragMap       // drag_to_bins
  | TableAnswer   // table_match
  | ClozeAnswer   // cloze_drag
  | undefined;
