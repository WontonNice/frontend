// src/components/SATMathPanel2.tsx
import { useNavigate } from "react-router-dom";
import { Layers, Sigma, Shapes, Dice5, FunctionSquare, Grid2X2 } from "lucide-react";

type Category = {
  id: string;
  title: string;
  blurb: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  path: string; // where "Start" goes
};

const CATEGORIES: Category[] = [
  {
    id: "set-venn",
    title: "Set Theory / Venn Diagrams",
    blurb: "Unions, intersections, complements, min/max overlap.",
    icon: Grid2X2,
    path: "/study/math/set-theory", // practice page
  },
  {
    id: "age",
    title: "Age Problems",
    blurb: "Practice solving for the ages of people in word problems.",
    icon: Sigma,
    path: "/study/math/age-practice",
  },
  {
    id: "geometry-angles",
    title: "Combinatorics",
    blurb: "Combinations and Permutations",
    icon: Shapes,
    path: "/study/math/combinatorics",
  },
  {
    id: "probability",
    title: "Probability & Counting",
    blurb: "Basic probability, counting principles, expected value.",
    icon: Dice5,
    path: "/study/math/probability",
  },
  {
    id: "inequalities",
    title: "Inequalities",
    blurb: "Inequality properties, solving and graphing inequalities.",
    icon: FunctionSquare,
    path: "/study/math/inequalities",
  },
  {
    id: "consecutive-integers",
    title: "Consecutive Integers",
    blurb: "Consecutive integer problems and their applications.",
    icon: Layers,
    path: "/study/math/consecutive-integers",
  },
];

export default function SATMathPanel2() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Math Practice Categories</h1>
        <p className="text-white/60 mt-2">
          Pick a topic and press <span className="font-medium text-white">Start</span>.
        </p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORIES.map(({ id, title, blurb, icon: Icon, path }) => (
          <article
            key={id}
            className="group rounded-2xl bg-[#121419] ring-1 ring-white/10 p-5 hover:ring-white/20 transition"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="grid place-items-center h-10 w-10 rounded-xl bg-white/5 ring-1 ring-white/10">
                <Icon className="text-white/80" size={18} />
              </span>
              <h2 className="text-lg font-semibold">{title}</h2>
            </div>

            <p className="text-sm text-white/60 min-h-12">{blurb}</p>

            <div className="mt-5">
              <button
                onClick={() => navigate(path)}
                className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 py-2.5 font-medium transition"
              >
                Start
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
