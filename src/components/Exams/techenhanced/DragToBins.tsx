import React from "react";
import type { Bin, DragOption, DragAnswer } from "./types";

type Props = {
  bins: Bin[];
  options: DragOption[];
  value: DragAnswer;                      // current placements (optionId -> binId)
  onChange: (next: DragAnswer) => void;   // lift state up to ExamRunner
};

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function DragToBins({ bins, options, value, onChange }: Props) {
  // Reverse index: binId -> optionIds[]
  const byBin: Record<string, string[]> = React.useMemo(() => {
    const acc: Record<string, string[]> = {};
    bins.forEach(b => (acc[b.id] = []));
    Object.entries(value || {}).forEach(([optId, binId]) => {
      if (binId && acc[binId]) acc[binId].push(optId);
    });
    return acc;
  }, [bins, value]);

  // Unplaced options (show at the top)
  const unplaced = options.filter(o => !value[o.id]);

  const dragData = React.useRef<{ optId?: string }>({});

  const handleDragStart = (optId: string) => (e: React.DragEvent) => {
    dragData.current.optId = optId;
    e.dataTransfer.setData("text/plain", optId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDropOnBin = (binId: string) => (e: React.DragEvent) => {
    e.preventDefault();
    const optId = (e.dataTransfer.getData("text/plain") || dragData.current.optId) as string;
    if (!optId) return;
    onChange({ ...(value || {}), [optId]: binId });
  };

  const handleClear = (optId: string) => {
    const next = { ...(value || {}) };
    delete next[optId];
    onChange(next);
  };

  const allowDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  return (
    <div className="space-y-4">
      {/* Unplaced option pills */}
      <div className="flex flex-wrap gap-3">
        {unplaced.map(o => (
          <button
            key={o.id}
            draggable
            onDragStart={handleDragStart(o.id)}
            className="px-4 py-3 rounded-md bg-[#e8f1ff] text-[#1856b7] font-semibold border border-[#b9d5ff] shadow-sm active:scale-[.98]"
            title="Drag to a bin below"
          >
            {o.label}
          </button>
        ))}
        {unplaced.length === 0 && (
          <span className="text-gray-500 text-sm">All items placed. You can drag between bins or click an item to remove.</span>
        )}
      </div>

      {/* Bins */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {bins.map(b => {
          const itemsHere = byBin[b.id] || [];
          return (
            <div
              key={b.id}
              onDrop={handleDropOnBin(b.id)}
              onDragOver={allowDrop}
              className="rounded-lg border border-gray-300 bg-gray-100 p-4 min-h-[140px]"
            >
              <div className="text-center font-semibold text-gray-800 mb-3">{b.label}</div>
              <div className="flex flex-wrap gap-3">
                {itemsHere.length === 0 ? (
                  <div className="text-gray-500 text-sm">Drop answers here</div>
                ) : (
                  itemsHere.map(optId => {
                    const opt = options.find(o => o.id === optId)!;
                    return (
                      <button
                        key={optId}
                        draggable
                        onDragStart={handleDragStart(optId)}
                        onClick={() => handleClear(optId)}
                        className={classNames(
                          "px-4 py-3 rounded-md bg-[#e8f1ff] text-[#1856b7] font-semibold",
                          "border border-[#b9d5ff] shadow-sm active:scale-[.98]"
                        )}
                        title="Drag to another bin or click to remove"
                      >
                        {opt?.label ?? optId}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
