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
    "> (1) <u>Yalina</u>, Michael, and Malcolm love making pancakes with <u>their</u> granddad on Saturday mornings.\n\n" +
    "Which of these is the most precise revision for the words “he decided that he would purposely make it so that his cousin, and not he, would win”?\"",
  choices: [
    "A. he believed his cousin wanted to win.",
    "B. Sentence 2: Change *is* to *are*, AND delete the comma after *bowl*.",
    "C. Sentence 3: Change *it is* to *they are*, AND delete the comma after *smooth*.",
    "D. Sentence 4: Change *they start* to *it starts*, AND insert a comma after *sweet*."
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
    "Which revision best corrects the pronoun error in the sentence?\n\n" +
    "> When the class finished <u>their</u> poster, it was hung in the hallway.",
  choices: [
    "A. When the class finished *its* poster, it was hung in the hallway.",
    "B. When the class finished *their* poster, they hung it in the hallway.",
    "C. When the class finished *her* poster, it was hung in the hallway.",
    "D. When the class finished *its* poster, they hung it in the hallway."
  ],
  answerIndex: 0
};

// The store (keyed by id)
const BANK: Record<string, BankQuestion> = {
  "REB-001": REB_001,
  "REB-002": REB_002
};

// Helper used by ExamRunnerPage
export function getQuestionsByIds(ids: string[]): BankQuestion[] {
  return ids
    .map((id) => BANK[id])
    .filter((q): q is BankQuestion => !!q)
    // shallow clone to avoid accidental mutation across exams
    .map((q) => ({ ...q }));
}
