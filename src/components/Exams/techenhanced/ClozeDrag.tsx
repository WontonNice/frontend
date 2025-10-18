// src/components/Exams/techenhanced/ClozeDrag.tsx
import React, { useMemo } from "react";

export type ClozeAnswer = Record<string, string | undefined>;
type Option = { id: string; label: string };

type Props = {
  /** The single blank id to fill (we support one blank for now) */
  blankId: string;
  /** Chips to drag */
  options: Option[];
  /** Sentence text that comes after the blank (e.g., "spending prolonged periods...") */
  textAfter: string;
  /** Current value: { [blankId]: optionId } */
  value: ClozeAnswer;
  onChange: (next: ClozeAnswer) => void;
  /** Optional helper text above the chips */
  helper?: string;
};

export default function ClozeDrag({
  blankId,
  options,
  textAfter,
  value,
  onChange,
  helper = "Move the correct answer to the box.",
}: Props) {
  const placedId = value?.[blankId];
  const placed = useMemo(
    () => options.find((o) => o.id === placedId),
    [options, placedId]
  );
  const available = useMemo(
    () => options.filter((o) => o.id !== placedId),
    [options, placedId]
  );

  const handleDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (options.some((o) => o.id === id)) {
      onChange({ ...(value || {}), [blankId]: id });
    }
  };

  const clear = () => {
    const next = { ...(value || {}) };
    delete next[blankId];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {/* Chips row */}
      <div className="flex flex-wrap gap-2">
        {available.map((o) => (
          <button
            key={o.id}
            draggable
            onDragStart={(e) => e.dataTransfer.setData("text/plain", o.id)}
            onClick={() => onChange({ ...(value || {}), [blankId]: o.id })}
            className="rounded-md border border-blue-400 px-3 py-1 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100"
            title="Drag or click to place"
          >
            {o.label}
          </button>
        ))}
      </div>

      {/* Helper text */}
      {helper ? (
        <div className="text-[13px] text-gray-600">{helper}</div>
      ) : null}

      {/* Sentence with inline blank */}
      <div className="text-[15px] leading-7">
        {/* The drop area is inline-block so the line height looks natural */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="inline-flex align-middle min-w-[140px] h-8 px-2 mr-2 border-2 border-dashed border-gray-300 rounded-md bg-white"
          title="Drop here"
        >
          {placed ? (
            <div className="flex items-center gap-1">
              <span className="rounded-md border border-blue-400 px-2 py-[2px] text-sm font-medium text-blue-700 bg-blue-50">
                {placed.label}
              </span>
              <button
                type="button"
                onClick={clear}
                className="ml-1 text-gray-500 hover:text-gray-700"
                aria-label="Clear"
                title="Clear"
              >
                ×
              </button>
            </div>
          ) : (
            <span className="self-center text-gray-400 text-sm">Drop here</span>
          )}
        </div>
        <span>{textAfter}</span>
      </div>
    </div>
  );
}
