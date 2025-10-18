// public/exams/readingpassages/revising/revEditB-QuestionBank.ts

// Keep this union in sync with your app's InteractionType
type InteractionType =
  | "single_select"
  | "multi_select"
  | "drag_to_bins"
  | "table_match"
  | "cloze_drag";

export type BankQuestion = {
  id: string;

  type?: InteractionType;
  skillType?: "global" | "function" | "detail" | "inference";

  stemMarkdown?: string;
  image?: string;

  // single/multi-select
  choices?: string[];
  answerIndex?: number;        // for single_select
  selectCount?: number;        // for multi_select
  correctIndices?: number[];   // for multi_select

  // drag_to_bins
  bins?: { id: string; label: string }[];
  options?: { id: string; label: string }[]; // also reused by cloze_drag / table_match
  correctBins?: Record<string, string>;

  // table_match
  table?: {
    columns: { key: string; header: string }[];
    rows: { id: string; header: string }[];
  };
  correctCells?: Record<string, string>;

  // cloze_drag
  blanks?: { id: string; correctOptionId: string }[];

  explanationMarkdown?: string;
};

// You can split this by subject later (e.g., export several banks).
// For now, one bank keyed by question id:
export const questionBank: Record<string, BankQuestion> = {
  // ---------------- ELA REV/EDIT B (examples) ----------------
  "ELA-B-001": {
    id: "ELA-B-001",
    type: "single_select",
    stemMarkdown:
      "Read this sentence:\n\n" +
      "> The team _have_ completed its project ahead of schedule.",
    choices: [
      "move folded after the and before cat",
      "move with folded, fuzzy ears before the ball of yarn",
      "move ***with folded, fuzzy ears*** after ***cat***",
      "move with folded, fuzzy ears after zoomed"
    ],
    answerIndex: 1,
    explanationMarkdown:
      "“Team” is a collective noun and takes singular agreement here → **has**."
  },
  "ELA-B-002": {
    id: "ELA-B-002",
    type: "single_select",
    stemMarkdown:
      "Which choice most effectively combines the sentences?\n\n" +
      "> The museum expanded in 2018. It added two new galleries.",
    choices: [
      "The museum expanded in 2018, and it added two new galleries.",
      "The museum expanded in 2018; adding two new galleries.",
      "Expanding in 2018, the museum added two new galleries.",
      "The museum expanded, in 2018, adding two new galleries."
    ],
    answerIndex: 2,
    explanationMarkdown:
      "Choice C is concise and grammatically sound; D has disruptive commas; B is a fragment; A is fine but less concise."
  },
  "ELA-B-003": {
    id: "ELA-B-003",
    type: "single_select",
    stemMarkdown:
      "Which choice best maintains the style and tone?\n\n" +
      "> The scientist’s **cool** analysis revealed several flaws.",
    choices: [
      "cool",
      "detached",
      "epic",
      "awesome"
    ],
    answerIndex: 1,
    explanationMarkdown:
      "“Detached” maintains a formal, academic tone consistent with the sentence."
  },
  // Example table_match or cloze_drag (optional)
  "ELA-B-004": {
    id: "ELA-B-004",
    type: "cloze_drag",
    stemMarkdown: "Complete the sentence with the best transition:",
    blanks: [{ id: "t1", correctOptionId: "opt_however" }],
    options: [
      { id: "opt_however", label: "However," },
      { id: "opt_furthermore", label: "Furthermore," },
      { id: "opt_consequently", label: "Consequently," }
    ],
    explanationMarkdown:
      "Use the transition that properly contrasts the prior idea (context provided in the passage)."
  }
};

// Helper to fetch a list of questions by id (silently skips unknown ids)
export function getQuestionsByIds(ids: string[]) {
  return ids
    .map((id) => questionBank[id])
    .filter((q): q is BankQuestion => !!q);
}
