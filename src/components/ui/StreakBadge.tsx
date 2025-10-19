// src/components/ui/StreakBadge.tsx
export default function StreakBadge({
  current,
  best,
  className = "",
}: {
  current: number;
  best: number;
  className?: string;
}) {
  return (
    <div
      className={
        "flex items-center gap-3 self-end rounded-xl bg-[#121821] ring-1 ring-white/10 px-4 py-2 " +
        className
      }
      aria-label="Streak"
    >
      <div className="text-sm">
        <div className="text-white/60">Current</div>
        <div className="text-lg font-semibold">{current}</div>
      </div>
      <div className="h-8 w-px bg-white/10" />
      <div className="text-sm">
        <div className="text-white/60">Best</div>
        <div className="text-lg font-semibold">{best}</div>
      </div>
    </div>
  );
}
