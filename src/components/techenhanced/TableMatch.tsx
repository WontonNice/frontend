import React from "react";
import type { TableColumn, TableRow, TableOption, TableAnswer } from "./types";

type Props = {
  columns: TableColumn[];   // you currently use 1 column but we keep it generic
  rows: TableRow[];
  options: TableOption[];   // pool of choices
  value: TableAnswer;       // rowId -> optionId
  onChange: (next: TableAnswer) => void;
};

export default function TableMatch({ columns, rows, options, value, onChange }: Props) {
  const optionMap = React.useMemo(
    () => Object.fromEntries(options.map(o => [o.id, o] as const)),
    [options]
  );

  const handlePick = (rowId: string, optionId: string | undefined) => {
    const next = { ...(value || {}) };
    if (!optionId) delete next[rowId];
    else next[rowId] = optionId;
    onChange(next);
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border border-gray-300 bg-white">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 border-b border-gray-300 text-left w-1/2">Prompt</th>
            {columns.map(c => (
              <th key={c.key} className="px-3 py-2 border-b border-gray-300 text-left">{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} className="odd:bg-white even:bg-gray-50">
              <td className="px-3 py-2 border-t border-gray-200 font-medium">{r.header}</td>
              {columns.map(c => (
                <td key={c.key} className="px-3 py-2 border-t border-gray-200">
                  <select
                    value={value[r.id] ?? ""}
                    onChange={(e) => handlePick(r.id, e.target.value || undefined)}
                    className="w-full rounded-md border border-gray-300 px-2 py-1 bg-white"
                  >
                    <option value="">— Select —</option>
                    {options.map(o => (
                      <option key={o.id} value={o.id}>{o.label}</option>
                    ))}
                  </select>
                  {value[r.id] && (
                    <div className="text-xs text-gray-500 mt-1">
                      Chosen: <span className="font-medium">{optionMap[value[r.id] as string]?.label}</span>
                    </div>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 text-xs text-gray-500">
        Tip: you can change your selection anytime before submitting.
      </div>
    </div>
  );
}
