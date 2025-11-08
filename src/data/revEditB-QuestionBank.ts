// Re-usable bank for ELA Revising/Editing Part B

export type BankQuestion = {
  id: string;
  // the same interaction types your runner already supports
  type: "single_select" | "multi_select" | "drag_to_bins" | "table_match" | "cloze_drag";
  stemMarkdown: string;         // markdown (ReactMarkdown + rehypeRaw is used)
  choices?: string[];           // for select-type questions
  answerIndex?: number;         // index into choices for single_select
  selectCount?: number;         // for multi_select
  correctIndices?: number[];    // for multi_select
  image?: string;

  // optional TEIs if you ever need them
  bins?: { id: string; label: string }[];
  options?: { id: string; label: string }[];
  correctBins?: Record<string, string>;

  table?: {
    columns: { key: string; header: string }[];
    rows: { id: string; header: string }[];
  };
  correctCells?: Record<string, string>;

  blanks?: { id: string; correctOptionId: string }[];

  /** NEW: per-blank dropdown options for cloze items (each blank has its own list). */
  dropdowns?: Record<string, { id: string; label: string }[]>;

  explanationMarkdown?: string;
};

// --- Example items -----------------------------------------------------------

const REB_001: BankQuestion = {
  id: "REB-001",
  type: "single_select",
  stemMarkdown:
    "Read this sentence:\n\n" +
    "> (1) Although Morgan loves winning as much as his dog loves eating treats, he decided that he would purposely make it so that his cousin, and not he, would win.\n\n" +
    "Which of these is the most precise revision for the words “he decided that he would purposely make it so that his cousin, and not he, would win”?\"",
  choices: [
    "A. he believed his cousin wanted to win.",
    "B. he thought that his cousin might like to win.",
    "C. he decided to intentionally lose to his cousin.",
    "D. he knew that his cousin would want to lose on purpose."
  ],
  answerIndex: 2,
  explanationMarkdown:
    "Sentence 4 needs singular agreement (*it starts*) with *each pancake*, and a comma after *sweet* before *delicious*."
};

const REB_002: BankQuestion = {
  id: "REB-002",
  type: "single_select",
  stemMarkdown:
    "Read this sentence:\n\n" +
    "> (1) The cat zoomed after the ball of yarn with folded, fuzzy ears.\n\n" +
    "Which edit should be made to correct this sentence?",
  choices: [
    "A. move folded after the and before cat",
    "B. move with folded, fuzzy ears before the ball of yarn",
    "C. move with folded, fuzzy ears after cat",
    "D. move with folded, fuzzy ears after zoomed"
  ],
  answerIndex: 2
};

const REB_003: BankQuestion = {
  id: "REB-003",
  type: "single_select",
  stemMarkdown:
    "Read this sentence:\n\n" +
    "> (1) The humidity in Taiwan can be much, much higher than Arizona.\n\n" +
    "Which edit should be made to correct this sentence?",
  choices: [
    "A. The humidity in Taiwan can be much, much higher than all of Arizona.",
    "B. The humidity in Taiwan can be much, much higher than that in Arizona.",
    "C. Taiwan’s humidity can be much, much higher than Arizona.",
    "D. Taiwan humidity can be much, much higher than Arizona."
  ],
  answerIndex: 1
};

const REB_004: BankQuestion = {
  id: "REB-004",
  type: "single_select",
  stemMarkdown:
    "Read this sentence:\n\n" +
    "> The cat zoomed after the ball of yarn with folded, fuzzy ears.\n\n" +
    "Which edit should be made to correct this sentence?",
  choices: [
    "A. move folded after the and before cat",
    "B. move with folded, fuzzy ears before the ball of yarn",
    "C. move with folded, fuzzy ears after cat",
    "D. move with folded, fuzzy ears after zoomed"
  ],
  answerIndex: 0
};

/* ------------------------------------------------------------------ */
/* REB-005: Verb tense, 4 separate drop-downs, each with its own list */
/* ------------------------------------------------------------------ */

const REB_005: BankQuestion = {
  id: "REB-005",
  type: "cloze_drag",
  stemMarkdown:
    "Read the paragraph below. Then, for each **underlined** word, choose the correct verb form to keep the paragraph in consistent past tense. If it contains no error, choose **no error**.\n\n" +
    "> (1) Against a little hill was a white building with pillars, to the right of which was a waterfall that <u>tumbled</u> {{b1}} down among mossy stones to splash into a lake.\n" +
    "> (2) Steps fed from the building’s terrace to the water, and other steps <u>lead</u> {{b2}} to the green lawns beside it.\n" +
    "> (3) Away across the grassy slopes <u>stood</u> {{b3}} a herd of deer, and in the distance where a grove of trees thickened into what looked almost a forest were enormous shapes of grey stone.\n" +
    "> (4) The scene <u>was</u> {{b4}} like nothing that the children had ever seen before.\n\n" +
    "_(Each {{b1}}…{{b4}} marks a drop-down location.)_",
  // Correct answers per blank
  blanks: [
    { id: "b1", correctOptionId: "b1_noerr" }, // "tumbled" is already correct
    { id: "b2", correctOptionId: "b2_led"  }, // lead -> led
    { id: "b3", correctOptionId: "b3_noerr" }, // stood is correct
    { id: "b4", correctOptionId: "b4_noerr" }  // was is correct
  ],
  // Per-blank dropdown choices (each list shows exactly what the menu should contain)
  dropdowns: {
    b1: [
      { id: "b1_tumbles", label: "tumbles" },
      { id: "b1_tumble",  label: "tumble" },
      { id: "b1_tumbling",label: "tumbling" },
      { id: "b1_noerr",   label: "no error" }
    ],
    b2: [
      { id: "b2_leads", label: "leads" },
      { id: "b2_lead",  label: "lead" },
      { id: "b2_led",   label: "led" },
      { id: "b2_leading", label: "leading" },
      { id: "b2_noerr", label: "no error" }
    ],
    b3: [
      { id: "b3_stand",   label: "stand" },
      { id: "b3_stands",  label: "stands" },
      { id: "b3_standing",label: "standing" },
      { id: "b3_noerr",   label: "no error" }
    ],
    b4: [
      { id: "b4_were", label: "were" },
      { id: "b4_is",   label: "is" },
      { id: "b4_are",  label: "are" },
      { id: "b4_noerr",label: "no error" }
    ]
  },
  // (Optional) a flat options list is not required for dropdown mode,
  // but can be provided if your runner falls back to drag mode:
  options: [
    { id: "b1_tumbles", label: "tumbles" },
    { id: "b1_tumble",  label: "tumble" },
    { id: "b1_tumbling",label: "tumbling" },
    { id: "b1_noerr",   label: "no error" },

    { id: "b2_leads", label: "leads" },
    { id: "b2_led",   label: "led" },
    { id: "b2_leading", label: "leading" },
    { id: "b2_noerr", label: "no error" },

    { id: "b3_stand",   label: "stand" },
    { id: "b3_stands",  label: "stands" },
    { id: "b3_standing",label: "standing" },
    { id: "b3_noerr",   label: "no error" },

    { id: "b4_is",   label: "is" },
    { id: "b4_noerr",label: "no error" }
  ],
  explanationMarkdown:
    "**Tense consistency:** the passage narrates in past tense.\n\n" +
    "- (1) *tumbled* — **no error** (past tense).\n" +
    "- (2) *lead* → **led** to maintain past tense.\n" +
    "- (3) *stood* — **no error** (past tense).\n" +
    "- (4) *was* — **no error** (past tense)."
};

// The store (keyed by id)
const BANK: Record<string, BankQuestion> = {
  "REB-001": REB_001,
  "REB-002": REB_002,
  "REB-003": REB_003,
  "REB-004": REB_004,
  "REB-005": REB_005
};

// Helper used by ExamRunnerPage
export function getQuestionsByIds(ids: string[]): BankQuestion[] {
  return ids
    .map((id) => BANK[id])
    .filter((q): q is BankQuestion => !!q)
    // shallow clone to avoid accidental mutation across exams
    .map((q) => ({ ...q }));
}
