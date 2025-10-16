//import React from "react";

type SectionTotals = {
  reading: { correct: number; scored: number };
  math: { correct: number; scored: number };
};

type ResultsSummary = {
  correctCount: number;
  scoredCount: number;
  sectionTotals: SectionTotals;
};

type ExamResultsPageProps = {
  examTitle: string;
  results: ResultsSummary;
  onDownloadPdf: () => void;
  /** e.g. "top-14" when the global bar is visible */
  stickyTopClass?: string;
};

function ExamResultsPage({
  examTitle,
  results,
  onDownloadPdf,
  stickyTopClass = "top-14",
}: ExamResultsPageProps) {
  const { correctCount, scoredCount, sectionTotals } = results;
  const percent = scoredCount ? Math.round((correctCount / scoredCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Full-bleed status */}
      <div className={`sticky ${stickyTopClass} z-30 full-bleed`}>
        <div className="h-[3px] bg-sky-500 border-t border-gray-300" />
        <div className="w-full bg-[#5e5e5e] text-white text-[13px]">
          <div className="flex items-center gap-2 px-6 py-1">
            <span className="font-semibold">{examTitle.toUpperCase()}</span>
            <span>/</span>
            <span>RESULTS</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white shadow-md border border-gray-200 p-8 max-w-4xl mx-auto">
        <div className="text-center mb-6">
          <h2 className="text-4xl font-bold">Your Score</h2>
          <div className="mt-3 text-xl">
            <span className="font-semibold">{correctCount}</span> correct out of{" "}
            <span className="font-semibold">{scoredCount}</span> scored questions ·{" "}
            <span className="font-semibold">{percent}%</span>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto text-sm">
            <div className="rounded-md border border-gray-200 p-3">
              <div className="text-gray-600">Reading</div>
              <div className="text-lg font-semibold">
                {sectionTotals.reading.correct} / {sectionTotals.reading.scored}
              </div>
            </div>
            <div className="rounded-md border border-gray-200 p-3">
              <div className="text-gray-600">Math</div>
              <div className="text-lg font-semibold">
                {sectionTotals.math.correct} / {sectionTotals.math.scored}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <button
              onClick={onDownloadPdf}
              className="px-5 py-2.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              Download Report (PDF)
            </button>
          </div>
        </div>
      </div>

      {/* Local style for full-bleed */}
      <style>{`
        .full-bleed { margin-left: calc(50% - 50vw); margin-right: calc(50% - 50vw); width: 100vw; }
      `}</style>
    </div>
  );
}

export default ExamResultsPage;
export { ExamResultsPage };
