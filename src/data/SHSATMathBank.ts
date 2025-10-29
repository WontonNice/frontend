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
      "Jenny starts a game with twice as many marbles as Keiko. Jenny gives Keiko 5 marbles, but she still has 10 more than Keiko. How many marbles did Jenny have to start with?",
    choices: ["$25$", "$30$", "$35$", "$40$"],
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
      "In a scale diagram, 0.125 inch represents 125 feet. How many inches represent 1 foot?",
    choices: ["$0.001\\text{ in}$", "$0.01\\text{ in}$", "$0.1\\text{ in}$", "$0.12\\text{ in}$"],
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
      "A researcher recorded the number of people in each vehicle that passed through a checkpoint. The table above shows the percent distribution for the 420 vehicles that passed through the checkpoint yesterday morning. How many of the 420 vehicles contained **at least** 3 people?",
    image: "/exams/math/imgsrc/OFFICIAL-0010.png",
    choices: ["$0.001\\text{ in}$", "$0.01\\text{ in}$", "$0.1\\text{ in}$", "$0.12\\text{ in}$"],
    answerIndex: 0,
    explanationMarkdown: ""
  },

  "OFFICIAL-0011": {
    id: "OFFICIAL-0011",
    type: "single_select",
    source: "official",
    version: "2017-2018 Form A", 
    category: "arithmetic",
    stemMarkdown:
      "In the pyramid above, each triangular face has the same area, and the base MNPQ is a square that measures 8 centimeters on each side. If the length of RS = 6 centimeters, what is the surface area of the pyramid **excluding** the base?",
    image: "/exams/math/imgsrc/OFFICIAL-0011.png",
    choices: ["$48\\text{ sq cm}$", "$96\\text{ sq cm}$", "$128\\text{ sq cm}$", "$160\\text{ sq cm}$"],
    answerIndex: 0,
    explanationMarkdown: ""
  },

  "OFFICIAL-0012": {
    id: "OFFICIAL-0012",
    type: "single_select",
    source: "official",
    version: "2017-2018 Form A", 
    category: "arithmetic",
    stemMarkdown:
      "The perimeter of a rectangle is 510 centimeters. The ratio of the length to the width is 3:2. What are the dimensions of this rectangle?",
    choices: ["$150\\text{ cm by}$", "$96\\text{ sq cm}$", "$128\\text{ sq cm}$", "$160\\text{ sq cm}$"],
    answerIndex: 0,
    explanationMarkdown: ""
  },

  "OFFICIAL-0013": {
    id: "OFFICIAL-0013",
    type: "single_select",
    source: "official",
    version: "2017-2018 Form A", 
    category: "arithmetic",
    stemMarkdown:
      "Which number line below shows the solution to the inequality $-4 < \\dfrac{x}{2} < 2$?",
    image: "/exams/math/imgsrc/OFFICIAL-0013.png",
    choices: ["A", "B", "C", "D"],
    answerIndex: 0,
    explanationMarkdown: ""
  },

  "OFFICIAL-0014": {
  id: "OFFICIAL-0014",
  type: "single_select",
  source: "official",
  version: "2017-2018 Form A",
  category: "units", // currency/unit conversion
  stemMarkdown:
    "1 dollar = 7 lorgs\n1 dollar = 0.5 dalt\n\nKevin has 140 lorgs and 16 dalts. If he exchanges the lorgs and dalts for dollars according to the rates above, how many dollars will he receive?",
  choices: ["$\\$28$", "$\\$52$", "$\\$182$", "$\\$282$"],
  answerIndex: 1,
  explanationMarkdown:
    "From $1\\text{ dollar}=7\\text{ lorgs}$, $$140\\text{ lorgs}=\\frac{140}{7}=20\\text{ dollars}.$$ From $1\\text{ dollar}=0.5\\text{ dalt}$, we have $1\\text{ dalt}=2\\text{ dollars}$, so $$16\\text{ dalts}=16\\cdot 2=32\\text{ dollars}.$$ Total dollars $=20+32=\\boxed{52}.$"
},

  "OFFICIAL-0015": {
  id: "OFFICIAL-0015",
  type: "single_select",
  source: "official",
  version: "2017-2018 Form A",
  category: "probability", 
  stemMarkdown:
    "A box of colored pencils contains exactly 6 red pencils. The probability of choosing a red pencil from the box is $\\tfrac{2}{7}$. How many of the pencils in the box are **not** red?",
  choices: ["$5$", "$15$", "$21$", "$30$"],
  answerIndex: 1,
  explanationMarkdown:
    ""
},

  "OFFICIAL-0016": {
  id: "OFFICIAL-0016",
  type: "single_select",
  source: "official",
  version: "2017-2018 Form A",
  category: "ratios", 
  stemMarkdown:
    "The sum of the numbers $x$, $y$, and $z$ is $50$. The ratio of $x$ to $y$ is $1:4$, and the ratio of $y$ to $z$ is $4:5$. What is the value of $y$?",
  choices: ["$4$", "$8$", "$10$", "$20$"],
  answerIndex: 1,
  explanationMarkdown:
    ""
},

  "OFFICIAL-0017": {
  id: "OFFICIAL-0017",
  type: "single_select",
  source: "official",
  version: "2017-2018 Form A",
  category: "ratios", 
  stemMarkdown:
    "What is the area of the shaded region in the graph above?",
  image: "/exams/math/imgsrc/OFFICIAL-0017.png",
  choices: ["$4$", "$8$", "$10$", "$20$"],
  answerIndex: 1,
  explanationMarkdown:
    ""
},

  "OFFICIAL-0018": {
  id: "OFFICIAL-0018",
  type: "single_select",
  source: "official",
  version: "2017-2018 Form A",
  category: "ratios", 
  stemMarkdown:
    "In Centerville, 45% of the population is female, and 60% of the population commutes to work daily. Of the total Centerville population, 21% are females who commute to work daily. What percentage of the total Centerville population are males who do not commute to work daily?",
  choices: ["$15$", "$16$", "$24$", "$39$"],
  answerIndex: 1,
  explanationMarkdown:
    ""
},

  "OFFICIAL-0019": {
  id: "OFFICIAL-0019",
  type: "single_select",
  source: "official",
  version: "2017-2018 Form A",
  category: "ratios", 
  stemMarkdown:
    "In a sample of 10 cards, 4 are red and 6 are blue. If 2 cards are selected at random from the sample, one at a time without replacement, what is the probability that both cards are **not** blue?",
  choices: ["$\\dfrac{2}{15}$", "$\\dfrac{4}{25}$", "$\\dfrac{3}{10}$", "$\\dfrac{1}{3}$"],
  answerIndex: 1,
  explanationMarkdown:
    ""
},

  "OFFICIAL-0020": {
  id: "OFFICIAL-0020",
  type: "single_select",
  source: "official",
  version: "2017-2018 Form A",
  category: "ratios", 
  stemMarkdown:
    "1 sind = 4 lorgs\n2 plunks = 5 dalts\n5 sinds = 2 harps\n1 plunk = 3 harps\n\nA nation has five types of coins: sinds, dalts, lorgs, harps, and plunks. The relationship between the coins is shown above. Which coin is most valuable?",
  choices: ["sind", "dalt", "harp", "plunk"],
  answerIndex: 1,
  explanationMarkdown:
    ""
},

  "OFFICIAL-0021": {
  id: "OFFICIAL-0021",
  type: "single_select",
  source: "official",
  version: "2017-2018 Form A",
  category: "ratios", 
  stemMarkdown:
    "1 sind = 4 lorgs\n2 plunks = 5 dalts\n5 sinds = 2 harps\n1 plunk = 3 harps\n\nA nation has five types of coins: sinds, dalts, lorgs, harps, and plunks. The relationship between the coins is shown above. Which coin is most valuable?",
  choices: ["sind", "dalt", "harp", "plunk"],
  answerIndex: 1,
  explanationMarkdown:
    ""
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
