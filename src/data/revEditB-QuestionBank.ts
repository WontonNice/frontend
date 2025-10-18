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
  answerIndex: 3,
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
  answerIndex: 0
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
  answerIndex: 0
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

// The store (keyed by id)
const BANK: Record<string, BankQuestion> = {
  "REB-001": REB_001,
  "REB-002": REB_002,
  "REB-003": REB_003,
  "REB-004": REB_004
};

// Helper used by ExamRunnerPage
export function getQuestionsByIds(ids: string[]): BankQuestion[] {
  return ids
    .map((id) => BANK[id])
    .filter((q): q is BankQuestion => !!q)
    // shallow clone to avoid accidental mutation across exams
    .map((q) => ({ ...q }));
}
