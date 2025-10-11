import { Link } from "react-router-dom";

export default function LiveActivitiesPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Live Activities</h2>

      <Link
        to="/live-activities/session"
        className="block text-left rounded-2xl bg-[#111318] ring-1 ring-white/10 p-5 transition hover:-translate-y-0.5 hover:ring-white/20 w-full"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Join Session</h3>
          <span className="text-xs px-2 py-1 rounded bg-emerald-600/20 text-emerald-300 ring-1 ring-emerald-500/30">
            Beta
          </span>
        </div>
        <p className="text-sm text-white/70 mt-2">
          Enter a shared space—see everyone’s mouse pointer live.
        </p>
      </Link>
    </div>
  );
}
