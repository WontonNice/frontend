// src/components/Achievements.tsx

/* ------------------------------ types ------------------------------ */
export type Achievement = {
  id: string;
  title: string;
  description: string;
  /** Either an emoji (e.g. "🔥") or an image path/url (e.g. "/img/badges/streak.png") */
  icon: string;
  current: number;   // current progress (e.g. 5)
  target: number;    // target to complete (e.g. 7)
  category?: string; // optional small label (e.g. "Streaks")
};

type Props = {
  items?: Achievement[];
  className?: string;
  /** Called when a card is clicked, if you want to open details */
  onSelect?: (a: Achievement) => void;
};

/* ---------------------------- utilities ---------------------------- */
function clamp(n: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, n));
}

/** Render an emoji or an <img> depending on the string. */
function Icon({ src }: { src: string }) {
  const isImage = /\/|\.png|\.svg|\.jpg|\.jpeg|^https?:\/\//i.test(src);
  if (isImage) {
    return (
      <img
        src={src}
        alt=""
        className="h-10 w-10 rounded-lg ring-1 ring-white/10 object-cover bg-white/5"
      />
    );
  }
  return (
    <div className="grid h-10 w-10 place-items-center text-2xl rounded-lg bg-white/5 ring-1 ring-white/10">
      {src}
    </div>
  );
}

/* --------------------------- progress bar -------------------------- */
function ProgressBar({
  value,
  max,
  showLabel = true,
}: {
  value: number;
  max: number;
  showLabel?: boolean;
}) {
  const pct = clamp(max === 0 ? 0 : value / max);
  const width = `${(pct * 100).toFixed(0)}%`;
  const done = pct >= 1;

  return (
    <div className="space-y-1">
      {showLabel && (
        <div className="flex items-center justify-between text-xs text-white/60">
          <span>{done ? "Completed" : "Progress"}</span>
          <span>
            {value}/{max}
          </span>
        </div>
      )}
      <div
        className="h-2 w-full rounded-full bg-white/10 overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.min(value, max)}
        aria-label="Achievement progress"
      >
        <div
          className={`h-full transition-all duration-500 ${
            done ? "bg-emerald-400" : "bg-emerald-500/80"
          }`}
          style={{ width }}
        />
      </div>
    </div>
  );
}

/* ------------------------------ sample ----------------------------- */
/** Used if you don't pass `items` in props. Replace with live data later. */
const SAMPLE: Achievement[] = [
  {
    id: "streak-7",
    title: "7-Day Streak",
    description: "Log in once every 24 hours for a week.",
    icon: "🔥",
    current: 0,
    target: 7,
    category: "Streaks",
  },
  {
    id: "set-rookie-10",
    title: "Set Theory Rookie",
    description: "Answer 10 Set Theory questions correctly.",
    icon: "🧩",
    current: 0,
    target: 10,
    category: "Practice",
  },
  {
    id: "age-ace-25",
    title: "Age Word-Problems Ace",
    description: "Get 25 age questions correct across sessions.",
    icon: "🎯",
    current: 0,
    target: 25,
    category: "Practice",
  },
  {
    id: "combo-builder",
    title: "Combinatorics Builder",
    description: "Reach a score of 15 in Combinatorics practice.",
    icon: "📚",
    current: 0,
    target: 15,
    category: "Practice",
  },
];

/* ---------------------------- main component ---------------------------- */
export default function Achievements({ items = SAMPLE, className = "", onSelect }: Props) {
  return (
    <div className={`min-h-[calc(100vh-var(--topbar-height,56px))] bg-[#0f1115] text-white ${className}`}>
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-semibold">Achievements</h1>
          <p className="text-sm text-white/70 mt-1">
            Keep practicing to unlock badges and track your progress.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((a) => {
            const pct = clamp(a.target ? a.current / a.target : 0);
            const done = pct >= 1;
            return (
              <button
                key={a.id}
                onClick={() => onSelect?.(a)}
                className={[
                  "group text-left rounded-2xl p-4",
                  "bg-[#141821] ring-1 ring-white/10 hover:ring-white/20 transition",
                ].join(" ")}
              >
                <div className="flex items-start gap-3">
                  <Icon src={a.icon} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{a.title}</h3>
                      {done && (
                        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300 ring-1 ring-emerald-400/30">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          Completed
                        </span>
                      )}
                    </div>
                    {a.category && (
                      <div className="text-[10px] uppercase tracking-wide text-white/50 mt-0.5">
                        {a.category}
                      </div>
                    )}
                    <p className="mt-2 text-sm text-white/80">{a.description}</p>
                    <div className="mt-3">
                      <ProgressBar value={a.current} max={a.target} />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
