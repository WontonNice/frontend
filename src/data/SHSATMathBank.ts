// src/data/mathQuestionBank.ts

/** Keep sources concise; put long labels in `version` */
export type MathSource = "tutorverse" | "official" | "tei" | "custom";

export type MathCategory =
  | "algebra"
  | "geometry"
  | "arithmetic"
  | "statistics"
  | "set_theory"
  | "number_theory"
  | "probability"
  | "ratios"
  | "units"
  | "data"
  | "misc"
  | (string & {}); // allows adding new categories without changing this type

/** Base question fields shared by all types */
type BaseQuestion = {
  id: string;
  /** "tutorverse" | "official" | "tei" | "custom" */
  source?: MathSource;
  /** Free-form version label, e.g. "2017-2018 Form A" */
  version?: string;
  category?: MathCategory;

  /** KaTeX allowed */
  stemMarkdown: string;
  /** Path under /public (optional) */
  image?: string;

  /** Optional solution text */
  explanationMarkdown?: string;
};

export type MathQuestionSingle = BaseQuestion & {
  type: "single_select";
  choices: string[];
  answerIndex: number;
};

export type MathQuestionMulti = BaseQuestion & {
  type: "multi_select";
  choices: string[];
  correctIndices: number[];
  /** If present, enforce exactly this many selections */
  selectCount?: number;
};

export type MathQuestionShortResponse = BaseQuestion & {
  type: "short_response";
  /** canonical numeric string, e.g. "31" */
  correctAnswer: string;
  directionsMarkdown?: string;
};

export type MathQuestion =
  | MathQuestionSingle
  | MathQuestionMulti
  | MathQuestionShortResponse;

/* ------------------------------------------------------------------ */
/*                                BANK                                */
/* ------------------------------------------------------------------ */

const Q: Record<string, MathQuestion> = {
  /* ---------- Short Response example ---------- */
  "MATH-0001": {
    id: "MATH-0001",
    type: "short_response",
    source: "tutorverse",
    category: "algebra",
    stemMarkdown:
      "If $x=-9$ and $y=4$, what is the value of $-3x - y(2y + x)$?",
    directionsMarkdown:
      "(Enter all answers numerically. Do not include any spaces. For negative answers, use “-”. For whole numbers, do not include a decimal. For nonwhole numbers, round to the nearest tenth.)",
    correctAnswer: "31",
    explanationMarkdown:
      "$-3x=27$ and $y(2y+x)=4(8-9)=-4$. So $27-(-4)=31$."
  },

  /* ---------- Single Select WITH IMAGE ---------- */
  "MATH-0002": {
    id: "MATH-0002",
    type: "single_select",
    source: "tutorverse",
    stemMarkdown:
      "In the figure above, $ABCE$ is a parallelogram. The measure of $\\angle EAD$ is $27^\\circ$, and $\\angle ADE$ is a right angle. What is the measure of $\\angle ABC$?",
    image: "/exams/math/imgsrc/MATH-002.png", // put the file in /public/exams/math/
    choices: ["$63^\\circ$", "$90^\\circ$", "$117^\\circ$", "$180^\\circ$"],
    answerIndex: 2,
    explanationMarkdown: ""
  },

  "MATH-0004": {
    id: "MATH-0004",
    type: "single_select",
    source: "tutorverse",
    stemMarkdown:
      "A builder uses tiles at a rate of 3 boxes for every 69 square feet of floor covered. At this rate, how many boxes of tiles will the builder need in order to cover a floor that is 322 square feet?",
    image: "/exams/math/imgsrc/MATH-002.png",
    choices: ["$63^\\circ$", "$90^\\circ$", "$117^\\circ$", "$180^\\circ$"],
    answerIndex: 2,
    explanationMarkdown: ""
  },

  /* ---------- Example migrated to (source + version) ---------- */
  "OFFICIAL-0001": {
    id: "OFFICIAL-0001",
    type: "short_response",
    source: "official",
    version: "2017-2018 Form A", 
    category: "geometry",
    stemMarkdown:
      "In the figure above, $PQRS$ is a parallelogram. What is the value of $x$?",
    image: "/exams/math/imgsrc/OFFICIAL-0001.png",
    directionsMarkdown: "Enter your answer in the space",
    correctAnswer: "162",
    explanationMarkdown: ""
  },

  "OFFICIAL-0002": {
    id: "OFFICIAL-0002",
    type: "short_response",
    source: "official",
    version: "2017-2018 Form A", 
    category: "ratios",
    stemMarkdown:
      "The owner of a tree farm plants pine trees and oak trees in a ratio of 8:3. How many oak trees are planted if 264 pine trees are planted?",
    directionsMarkdown: "Enter your answer in the space",
    correctAnswer: "99",
    explanationMarkdown: ""
  },

  "OFFICIAL-0003": {
    id: "OFFICIAL-0003",
    type: "short_response",
    source: "official",
    version: "2017-2018 Form A", 
    category: "algebra",
    stemMarkdown:
      "For what value of $w$ is $4w = 2w - 8$?",
    directionsMarkdown: "Enter your answer in the space",
    correctAnswer: "-4",
    explanationMarkdown: ""
  },

  "OFFICIAL-0004": {
    id: "OFFICIAL-0004",
    type: "short_response",
    source: "official",
    version: "2017-2018 Form A", 
    category: "set_theory",
    stemMarkdown:
      "A survey asked students what pets they have. The results are:\n\n• 20 students have cats.\n• 23 students have dogs.\n• 3 students have both dogs and cats.\n• 5 students have no dogs or cats.\n\nHow many students were surveyed?",
    directionsMarkdown: "Enter your answer in the space",
    correctAnswer: "45",
    explanationMarkdown: ""
  },

  "OFFICIAL-0005": {
    id: "OFFICIAL-0005",
    type: "single_select",
    source: "official",
    version: "2017-2018 Form A", 
    category: "algebra",
    stemMarkdown:
      "The set of possible values of $m$ is $\\{5,7,9\\}$. What is the set of possible values of $k$ if $2k=m+3$?",
    choices: ["$\\{3,4,5\\}$", "$\\{4,5,6\\}$", "$\\{8,10,12\\}$", "$\\{10,14,18\\}$"],
    answerIndex: 1,
    explanationMarkdown: ""
  },

  "OFFICIAL-0006": {
    id: "OFFICIAL-0006",
    type: "single_select",
    source: "official",
    version: "2017-2018 Form A", 
    category: "units",
    stemMarkdown:
      "One bottle contains $500$ milliliters of juice. How many **liters** of juice are there in $24$ of these bottles?",
    choices: ["$12\\text{ L}$", "$120\\text{ L}$", "$1{,}200\\text{ L}$", "$12{,}000\\text{ L}$"],
    answerIndex: 0,
    explanationMarkdown: ""
  },

  "OFFICIAL-0007": {
    id: "OFFICIAL-0007",
    type: "single_select",
    source: "official",
    version: "2017-2018 Form A", 
    category: "arithmetic",
    stemMarkdown:
      "In a certain school, course grades range from 0 to 100. Adrianna took 4 courses and her average was $90$. Roberto took 5 courses. If both students have the same **sum** of course grades, what was Roberto’s average?",
    choices: ["$72$", "$80$", "$90$", "$92$"],
    answerIndex: 0,
    explanationMarkdown: ""
  },

  "OFFICIAL-0008": {
    id: "OFFICIAL-0008",
    type: "single_select",
    source: "official",
    version: "2017-2018 Form A", 
    category: "arithmetic",
    stemMarkdown:
      "In a certain school, course grades range from 0 to 100. Adrianna took 4 courses and her average was $90$. Roberto took 5 courses. If both students have the same $$sum$$ of course grades, what was Roberto’s average?",
    choices: ["$72$", "$80$", "$90$", "$92$"],
    answerIndex: 0,
    explanationMarkdown: ""
},


  "OFFICIAL-0009": {
    id: "OFFICIAL-0009",
    type: "single_select",
    source: "official",
    version: "2017-2018 Form A", 
    category: "arithmetic",
    stemMarkdown:
      "Jenny starts a game with twice as many marbles as Keiko. Jenny gives Keiko 5 marbles, but she still has 10 more than Keiko. How many marbles did Jenny have to start with?",
    choices: ["$25$", "$30$", "$35$", "$40$"],
    answerIndex: 0,
    explanationMarkdown: ""
},

  "OFFICIAL-0010": {
    id: "OFFICIAL-0010",
    type: "single_select",
    source: "official",
    version: "2017-2018 Form A", 
    category: "arithmetic",
    stemMarkdown:
      "Jenny starts a game with twice as many marbles as Keiko. Jenny gives Keiko 5 marbles, but she still has 10 more than Keiko. How many marbles did Jenny have to start with?",
    choices: ["$25$", "$30$", "$35$", "$40$"],
    answerIndex: 0,
    explanationMarkdown: ""
  },
};

/* ------------------------------------------------------------------ */
/*                             UTILITIES                              */
/* ------------------------------------------------------------------ */

export function getMathQuestionsByIds(ids: string[]): MathQuestion[] {
  return ids.map((id) => Q[id]).filter(Boolean);
}

/** Optional helpers you might want */
export function filterBySource(source: MathSource): MathQuestion[] {
  return Object.values(Q).filter((q) => q.source === source);
}

export function filterByVersion(version: string): MathQuestion[] {
  return Object.values(Q).filter((q) => q.version === version);
}
