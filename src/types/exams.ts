// src/types/exams.ts

/** ===== High-level Exam ===== */
export type Exam = {
  slug: string;                  // "digital-shsat-practice-test-form-4"
  title: string;                 // "Digital SHSAT Practice Test Form 4"
  description?: string;
  sections: Section[];
};

/** ===== Section (reading/math) ===== */
export type Section = {
  id: string;                    // "reading-1"
  title: string;                 // "Reading Passage 1"
  type: "reading" | "math";

  /**
   * For legacy JSON that inlined the passage text.
   * Prefer loading from `passageMd` (markdown file with YAML front-matter).
   */
  passageMarkdown?: string;

  /** Optional figures/images that belong to the passage (omit or empty to skip). */
  passageImages?: string[];

  /**
   * Path/URL to the passage .md file that includes YAML front-matter:
   * ---
   * title: ...
   * source: ...
   * questions: [...]
   * ---
   * <passage body>
   */
  passageMd?: string;

  /** Inline questions (used for math, or legacy reading). */
  questions?: Question[];
};

/** ===== Skills taxonomy you wanted on questions ===== */
export type SkillType = "global" | "function" | "detail" | "inference";

/** ===== New unified question model (supports interactive types) ===== */
type BaseQ = {
  id: string;
  /** Interaction type drives the renderer. When omitted, treat as "single_select" if choices/answerIndex exist. */
  type?:
    | "single_select"
    | "multi_select"
    | "drag_to_bins"
    | "table_match"
    | "cloze_drag";
  skillType?: SkillType;

  /** Markdown stem shown to the user. */
  stemMarkdown?: string;

  /** Optional explanation shown in review. */
  explanationMarkdown?: string;

  /** Optional shuffling flags. */
  shuffleChoices?: boolean;
  shuffleOptions?: boolean;
};

/** ---- Single select (radio / A–D) ---- */
export type SingleSelectQ = BaseQ & {
  type?: "single_select";        // default when choices+answerIndex are present
  choices: string[];
  answerIndex: number;           // 0-based
};

/** ---- Multi select (choose N) ---- */
export type MultiSelectQ = BaseQ & {
  type: "multi_select";
  choices: string[];
  /** How many the student must select (UI hint/validation). */
  selectCount: number;
  /** The correct set of indices (order-insensitive). */
  correctIndices: number[];
};

/** ---- Drag options into labeled bins ---- */
export type DragToBinsQ = BaseQ & {
  type: "drag_to_bins";
  bins: { id: string; label: string }[];
  options: { id: string; label: string }[];
  /** optionId -> binId mapping */
  correctBins: Record<string, string>;
};

/** ---- Table match (drag labels into rows/cells) ---- */
export type TableMatchQ = BaseQ & {
  type: "table_match";
  table: {
    columns: { key: string; header: string }[];   // usually one column for now
    rows: { id: string; header: string }[];
  };
  options: { id: string; label: string }[];
  /** rowId -> optionId mapping */
  correctCells: Record<string, string>;
};

/** ---- Cloze (drag chips into blanks embedded in stem) ---- */
export type ClozeDragQ = BaseQ & {
  type: "cloze_drag";
  options: { id: string; label: string }[];
  blanks: { id: string; correctOptionId: string }[]; // blanks appear in stem via [blank:<id>]
};

/** ===== Legacy single-select format (kept so old exams keep working) ===== */
export type LegacyQuestion = {
  id: string;
  stemMarkdown?: string;
  /** @deprecated use stemMarkdown */
  promptMarkdown?: string;
  image?: string;
  choices?: string[];
  answerIndex?: number;
  explanationMarkdown?: string;
};

/**
 * Union that your app can consume everywhere. New YAML questions will conform
 * to the specific interactive types; old JSON questions still match LegacyQuestion.
 */
export type Question =
  | SingleSelectQ
  | MultiSelectQ
  | DragToBinsQ
  | TableMatchQ
  | ClozeDragQ
  | LegacyQuestion;

/** ===== (Optional) shape for parsed passage MD if you expose it in code ===== */
export type ParsedPassageDoc = {
  title?: string;
  source?: string;
  questions?: Question[];
  bodyMarkdown: string;          // the passage content after front-matter
};
