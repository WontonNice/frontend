import React from "react";

/** Generic string->string map (used for row -> option assignments) */
export type RowMap = Record<string, string>;

type TableMatchProps = {
  /** Unique id of the item (used by parent for answers state) */
  globalId: string;

  /** Table shape (rows are the only thing we need to target drops) */
  table: {
    columns: { key: string; header: string }[];
    rows: { id: string; header: string }[];
  };

  /** Answer choices shown as draggable blue pills */
  options: { id: string; label: string }[];

  /** Current value: rowId -> optionId */
  value: RowMap;

  /** Setter provided by the parent to update answers[globalId] */
  onChange: (next: RowMap) => void;
};

const pillClasses =
  "select-none inline-block bg-[#e6f0ff] text-[#0b4fd6] border border-[#a7c4ff] rounded-lg px-4 py-2 shadow-sm cursor-grab active:cursor-grabbing";

export default function TableMatch({
  table,
  options,
  value,
  onChange,
}: TableMatchProps) {
  // Which choices are currently placed in the table?
  const placedIds = new Set(Object.values(value || {}));
  const bankOptions = options.filter((o) => !placedIds.has(o.id));

  const onDragStart = (e: React.DragEvent<HTMLDivElement>, optionId: string) => {
    e.dataTransfer.setData("text/plain", optionId);
    e.dataTransfer.effectAllowed = "move";
  };
  const allowDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  // Drop into a specific row cell
  const dropIntoRow = (rowId: string) => (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const optionId = e.dataTransfer.getData("text/plain");
    if (!optionId) return;

    // Move the option into this row (and ensure it's not in any other row)
    const next: RowMap = { ...(value || {}) };
    for (const r of Object.keys(next)) {
      if (next[r] === optionId) delete next[r];
    }
    next[rowId] = optionId;
    onChange(next);
  };

  // Drop back to the bank (remove from whichever row it’s in)
  const dropToBank = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const optionId = e.dataTransfer.getData("text/plain");
    if (!optionId) return;

    const next: RowMap = { ...(value || {}) };
    for (const r of Object.keys(next)) {
      if (next[r] === optionId) delete next[r];
    }
    onChange(next);
  };

  const OptionPill = ({ id, label }: { id: string; label: string }) => (
    <div draggable onDragStart={(e) => onDragStart(e, id)} className={pillClasses} title={label}>
      {label}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Choice bank */}
      <div
        className="rounded-md border border-gray-200 bg-white p-3"
        onDragOver={allowDrop}
        onDrop={dropToBank}
      >
        <div className="text-sm text-gray-600 mb-2">
          Move the correct answer to each box in the table.
        </div>
        <div className="flex flex-wrap gap-3">
          {bankOptions.length ? (
            bankOptions.map((o) => <OptionPill key={o.id} id={o.id} label={o.label} />)
          ) : (
            <div className="text-sm text-gray-400">All answers placed.</div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {table.columns.map((c) => (
                <th
                  key={c.key}
                  className="border border-gray-300 bg-gray-100 px-4 py-3 text-center font-semibold text-gray-700"
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((r, idx) => {
              const optionId = value?.[r.id];
              const option = options.find((o) => o.id === optionId);
              return (
                <tr key={r.id} className={idx % 2 ? "bg-white" : "bg-gray-50"}>
                  {/* Left column: row header (paragraphs etc.) */}
                  <td className="border border-gray-300 px-4 py-4 text-center font-medium text-gray-700">
                    {r.header}
                  </td>

                  {/* Right column: droppable cell */}
                  <td
                    className="border border-gray-300 px-4 py-4"
                    onDragOver={allowDrop}
                    onDrop={dropIntoRow(r.id)}
                  >
                    {option ? (
                      <OptionPill id={option.id} label={option.label} />
                    ) : (
                      <div className="h-10 border-2 border-dashed border-gray-300 rounded-md bg-white" />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
