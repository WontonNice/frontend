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

  explanationMarkdown?: string;
};

// --- Example items -----------------------------------------------------------

// REB-001 matches your screenshot formatting, including underlines.
const REB_001: BankQuestion = {
  id: "REB-001",
  type: "single_select",
  stemMarkdown:
    "Read this sentence:\n\n" +
    // Use a blockquote for the numbered paragraph and <u> for underlines
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

// Add more items as you build your bank:
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

/* ------------------------- NEW: REB-005 ------------------------- */
/* Verb tense check across a short paragraph; only “lead” should be “led.” */
const REB_005: BankQuestion = {
  id: "REB-005",
  type: "table_match",
  stemMarkdown:
    "Read the paragraph below. Then, for each **underlined** word, determine whether it contains an error in verb tense. " +
    "If it contains an error, choose the option that **corrects** the error. If there is no error, select **“no error.”**\n\n" +
    "> (1) Against a little hill **was** a white building with pillars, to the right of which was a waterfall that **<u>tumbled</u>** down among mossy stones to splash into a lake.  \n" +
    "> (2) Steps fed from the building’s terrace to the water, and other steps **<u>lead</u>** to the green lawns beside it.  \n" +
    "> (3) Away across the grassy slopes **<u>stood</u>** a herd of deer, and in the distance where a grove of trees thickened into what looked almost a forest were enormous shapes of grey stone.  \n" +
    "> (4) The scene **<u>was</u>** like nothing that the children had ever seen before.",
  // all row dropdowns draw from this common list
  choices: ["no error", "led", "leads", "was", "were", "had led", "has led", "tumbles", "tumbled"],
  table: {
    columns: [{ key: "ans", header: "Answer" }],
    rows: [
      { id: "r1", header: "tumbled" },
      { id: "r2", header: "lead" },
      { id: "r3", header: "stood" },
      { id: "r4", header: "was (sentence 4)" }
    ]
  },
  // map is `${rowId}|${columnKey}` → choice string
  correctCells: {
    "r1|ans": "no error",
    "r2|ans": "led",
    "r3|ans": "no error",
    "r4|ans": "no error"
  },
  explanationMarkdown:
    "The paragraph narrates a past scene, so past-tense verbs are appropriate. **tumbled**, **stood**, and **was** are already in the correct past tense (**no error**). " +
    "Only **lead** must be changed to the past tense **led** to keep tense consistent."
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
