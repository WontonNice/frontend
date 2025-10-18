// src/types/exams.ts

/** ===== Shared scalars ===== */
export type Scalar = string | number;

/** ===== High-level Exam ===== */
export type Exam = {
  slug: string;                  // "digital-shsat-practice-test-form-4"
  title: string;                 // "Digital SHSAT Practice Test Form 4"
  description?: string;
  sections: Section[];
};

/** ===== Section types ===== */
export type SectionType = "reading" | "ela_a" | "ela_b" | "math";

/** ===== Section (reading / rev-edit A / rev-edit B / math) ===== */
export type Section = {
  id: string;                    // "reading-1"
  title: string;                 // "Reading Passage 1"
  type: SectionType;

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

  /**
   * Inline questions (commonly used for Math, or legacy Reading).
   * For ELA-B we usually reference an external bank via `questionIds` instead.
   */
  questions?: Question[];

  /**
   * ELA-B sections often resolve question content from a separate bank.
   * Runner will call getQuestionsByIds(questionIds).
   */
  questionIds?: string[];
};

/** ===== Skills taxonomy you wanted on questions ===== */
export type SkillType = "global" | "function" | "detail" | "inference";

/** ===== Choice / Option shapes ===== */
export type ChoiceObject = {
  id?: Scalar;
  key?: Scalar;
  optionId?: Scalar;
  choiceId?: Scalar;
  value?: Scalar;
  label?: string;       // display text
  text?: string;        // alt text field
  isCorrect?: boolean;  // enables deriving keys when not explicitly provided
};

/** ===== New unified question model (supports interactive + math types) ===== */
type BaseQ = {
  id: string;

  /** Interaction type drives the renderer. */
  type?:
    | "single_select"
    | "multi_select"
    | "drag_to_bins"
    | "table_match"
    | "cloze_drag"
    | "short_response"    // math (free response)
    | "math_dropdowns";   // math (inline dropdowns)

  skillType?: SkillType;

  /** Markdown stem shown to the user. */
  stemMarkdown?: string;

  /** Optional explanation shown in review. */
  explanationMarkdown?: string;

  /** Optional asset */
  image?: string;

  /** Scoring weight (defaults to 1 if omitted). */
  points?: number;

  /** Optional shuffling flags. */
  shuffleChoices?: boolean;
  shuffleOptions?: boolean;
};

/** ---- Single select (radio / A–D) ----
 * Supports either plain string choices or object choices with ids.
 * Keys can be index-based OR id-based.
 */
export type SingleSelectQ = BaseQ & {
  type?: "single_select";               // default when choices are present
  choices: Array<string | ChoiceObject>;
  // Numeric key form:
  answerIndex?: number;                 // legacy
  correctIndex?: number;
  // Id-based key form:
  correctId?: Scalar;
};

/** ---- Multi select (choose N) ---- */
export type MultiSelectQ = BaseQ & {
  type: "multi_select";
  choices: Array<string | ChoiceObject>;
  /** How many the student must select (UI hint/validation). */
  selectCount?: number;
  /** Numeric keys (order-insensitive). */
  correctIndices?: number[];
  /** Id-based keys (order-insensitive). */
  correctIds?: Scalar[];
};

/** ---- Drag options into labeled bins ---- */
export type DragToBinsQ = BaseQ & {
  type: "drag_to_bins";
  bins: { id: Scalar; label: string }[];
  options: { id: Scalar; label: string }[];
  /** optionId -> binId mapping */
  correctBins: Record<string, Scalar>;
};

/** ---- Table match (drag labels into rows/cells) ---- */
export type TableMatchQ = BaseQ & {
  type: "table_match";
  table: {
    columns: { key: string; header: string }[];   // usually one column for now
    rows: { id: Scalar; header: string }[];
  };
  options: { id: Scalar; label: string }[];
  /** rowId -> optionId mapping */
  correctCells: Record<string, Scalar>;
};

/** ---- Cloze (drag chips into blanks embedded in stem) ---- */
export type ClozeDragQ = BaseQ & {
  type: "cloze_drag";
  options: { id: Scalar; label: string }[];
  blanks: { id: string; correctOptionId: Scalar }[]; // blanks appear in stem via [blank:<id>]
};

/** ---- Math: free-response (typed input) ---- */
export type ShortResponseQ = BaseQ & {
  type: "short_response";
  /** Optional normalized correct value(s); if omitted, item is unscored or rubric-scored elsewhere. */
  correctId?: Scalar | Scalar[];
};

/** ---- Math: inline dropdowns embedded in the stem ---- */
export type MathDropdownsQ = BaseQ & {
  type: "math_dropdowns";
  /**
   * Each dropdown inside the stem. The stem text will have placeholders,
   * and the UI component maps these by id.
   */
  dropdowns: { id: string; options: string[]; correctIndex?: number }[];
};

/** ===== Legacy single-select format (kept so old exams keep working) ===== */
export type LegacyQuestion = {
  id: string;
  stemMarkdown?: string;
  /** @deprecated use stemMarkdown */
  promptMarkdown?: string;
  image?: string;
  choices?: string[];          // old plain-string choices
  answerIndex?: number;        // old numeric answer
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
  | ShortResponseQ
  | MathDropdownsQ
  | LegacyQuestion;

/** ===== (Optional) shape for parsed passage MD if you expose it in code ===== */
export type ParsedPassageDoc = {
  title?: string;
  source?: string;
  questions?: Question[];
  bodyMarkdown: string;          // the passage content after front-matter
};