export type ExamSummary = {
  id: string; title: string; subject: string;
  status: "draft" | "open" | "closed";
  open_at?: string | null; close_at?: string | null;
  version: number;
};

export type ExamQuestion = {
  id: string; // qid like "ELA-1"
  type: "mcq";
  prompt: string;
  choices: string[];
  // server omits answer/explanation for students
};
export type ExamSection = { title: string; idx: number; questions: ExamQuestion[] };

export type ExamDetail = {
  id: string; title: string; subject: string; version: number;
  sections: ExamSection[];
};

export type Attempt = { id: string; exam_id: string; status: "active" | "submitted"; score?: number };
