// src/components/SAT.tsx
import { useMemo, useState } from "react";
import DashboardLayout from "./DashboardLayout.tsx";
import { questionBank, type SatSection, normalize } from "../data/questionBank.tsx";

type Mode = SatSection | null;

export default function SAT() {
  const [mode, setMode] = useState<Mode>(null); // "math" | "english" | null

  return (
    <DashboardLayout title="SAT Practice" subtitle="Choose a section and start a quick practice set">
      {!mode ? (
        <SectionPicker onPick={setMode} />
      ) : (
        <Quiz key={mode} section={mode} onReset={() => setMode(null)} />
      )}
    </DashboardLayout>
  );
}

/* ---------- Section Picker ---------- */
function SectionPicker({ onPick }: { onPick: (m: Mode) => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <button
        onClick={() => onPick("math")}
        className="rounded-2xl bg-[#111318] ring-1 ring-white/10 p-6 text-left hover:ring-white/20 transition"
      >
        <div className="text-xl font-semibold">Math</div>
        <p className="mt-2 text-white/70">No calculator/Calculator style questions.</p>
      </button>

      <button
        onClick={() => onPick("english")}
        className="rounded-2xl bg-[#111318] ring-1 ring-white/10 p-6 text-left hover:ring-white/20 transition"
      >
        <div className="text-xl font-semibold">English</div>
        <p className="mt-2 text-white/70">Reading & Writing — grammar, usage, clarity.</p>
      </button>
    </div>
  );
}

/* ---------- Quiz Engine (one question at a time) ---------- */
function Quiz({ section, onReset }: { section: SatSection; onReset: () => void }) {
  // shuffle questions each time section changes
  const questions = useMemo(() => {
    const src = [...questionBank[section]];
    for (let i = src.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [src[i], src[j]] = [src[j], src[i]];
    }
    return src;
  }, [section]);

  const [i, setI] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [typed, setTyped] = useState("");
  const [checked, setChecked] = useState<null | boolean>(null); // null = not submitted; true/false after submit

  const q = questions[i];
  const last = i === questions.length - 1;

  function submit() {
    if (!q) return;

    if (q.type === "mcq") {
      if (selectedIndex == null) return;
      setChecked(selectedIndex === q.answerIndex);
    } else {
      setChecked(normalize(typed) === normalize(q.answerText));
    }
  }

  function next() {
    if (last) {
      onReset(); // end -> back to picker for now
      return;
    }
    setI(i + 1);
    setSelectedIndex(null);
    setTyped("");
    setChecked(null);
  }

  return (
    <div className="max-w-2xl">
      {/* Progress */}
      <div className="mb-4 text-sm text-white/70">
        Question {i + 1} of {questions.length} · Section: <span className="capitalize">{section}</span>
      </div>

      {/* Card */}
      <div className="rounded-2xl bg-[#111318] ring-1 ring-white/10 p-5">
        <div className="text-base font-semibold">{q.prompt}</div>

        {q.type === "mcq" ? (
          <div className="mt-4 space-y-2">
            {q.choices.map((c, idx) => {
              const active = selectedIndex === idx;
              // after submit, show correct/incorrect colors
              const isCorrect = checked != null && idx === q.answerIndex;
              const isWrongSelected = checked === false && active;
              return (
                <label
                  key={idx}
                  className={[
                    "flex items-center gap-3 rounded-lg px-3 py-2 ring-1 transition",
                    active ? "ring-white/30 bg-white/5" : "ring-white/10 hover:ring-white/20",
                    isCorrect ? "bg-emerald-500/10 ring-emerald-500/40" : "",
                    isWrongSelected ? "bg-red-500/10 ring-red-500/40" : "",
                  ].join(" ")}
                >
                  <input
                    type="radio"
                    className="accent-emerald-500"
                    checked={active}
                    onChange={() => setSelectedIndex(idx)}
                  />
                  <span>{c}</span>
                </label>
              );
            })}
          </div>
        ) : (
          <div className="mt-4">
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="Type your answer…"
              className="w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-white/30"
            />
            {checked != null && (
              <div
                className={[
                  "mt-2 rounded-md px-3 py-2 text-sm",
                  checked ? "bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-500/30" : "bg-red-500/10 text-red-200 ring-1 ring-red-500/30",
                ].join(" ")}
              >
                {checked ? "Correct!" : `Incorrect. Correct answer: "${(q as any).answerText}"`}
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex items-center gap-3">
          {checked == null ? (
            <button
              onClick={submit}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500"
            >
              Submit
            </button>
          ) : (
            <button
              onClick={next}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500"
            >
              {last ? "Finish" : "Next"}
            </button>
          )}

          <button
            onClick={onReset}
            className="rounded-lg bg-white/5 px-4 py-2 text-sm text-white/80 ring-1 ring-white/10 hover:ring-white/20"
          >
            Exit
          </button>
        </div>
      </div>
    </div>
  );
}

