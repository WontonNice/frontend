// src/components/Exams/techenhanced/Dropdown.tsx
import React from "react";
import MathText from "../../MathText";

export type DropMeta = { id: string; options: string[]; correctIndex?: number };
export type DropAnswer = Record<string, number | undefined>;

type Props = {
  /** Text that may include placeholders like [[drop:lowest]] */
  text: string;
  /** All dropdowns referenced in the text */
  dropdowns: DropMeta[];
  /** Current selections (index per dropdown id) */
  value: DropAnswer;
  onChange: (next: DropAnswer) => void;
  /** Optional class for the wrapper */
  className?: string;
};

/** Renders math text with inline <select> boxes placed via [[drop:id]] tokens. */
export default function InlineDropdowns({
  text,
  dropdowns,
  value,
  onChange,
  className = "",
}: Props) {
  const metaById = React.useMemo(
    () => Object.fromEntries(dropdowns.map((d) => [d.id, d])),
    [dropdowns]
  );

  // Split text into parts: plain text and [[drop:...]] tokens
  const parts: Array<{ type: "text"; text: string } | { type: "drop"; id: string }> =
    React.useMemo(() => {
      const out: Array<{ type: "text"; text: string } | { type: "drop"; id: string }> = [];
      const re = /\[\[drop:([a-zA-Z0-9_-]+)\]\]/g;
      let last = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        const before = text.slice(last, m.index);
        if (before) out.push({ type: "text", text: before });
        out.push({ type: "drop", id: m[1] });
        last = m.index + m[0].length;
      }
      const tail = text.slice(last);
      if (tail) out.push({ type: "text", text: tail });
      return out;
    }, [text]);

  const handleChange = (id: string, idx: number | "") => {
    const next = { ...(value || {}) };
    next[id] = idx === "" ? undefined : Number(idx);
    onChange(next);
  };

  const Select = ({ id }: { id: string }) => {
    const meta = metaById[id];
    if (!meta) {
      return (
        <span className="mx-1 text-red-600 text-sm align-middle">[unknown drop:{id}]</span>
      );
    }
    const cur = value?.[id];
    return (
      <select
        value={cur ?? ""}
        onChange={(e) => handleChange(id, e.target.value === "" ? "" : Number(e.target.value))}
        className="mx-1 inline-block align-middle h-8 rounded-md border border-gray-300 bg-white px-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label={`Select ${id}`}
      >
        <option value="">— Select —</option>
        {meta.options.map((opt, i) => (
          <option key={i} value={i}>
            {opt}
          </option>
        ))}
      </select>
    );
  };

  return (
    <div className={className}>
      {parts.map((p, i) =>
        p.type === "text" ? (
          // MathText renders each text chunk with KaTeX ($...$ or \[...\])
          <MathText key={i} text={p.text} className="inline" />
        ) : (
          <Select key={i} id={p.id} />
        )
      )}
    </div>
  );
}
