// src/components/Exams/Tools/GlobalNotepad.tsx
import { useEffect, useState } from "react";

const NoteIcon = (props: any) => (
  <svg viewBox="0 0 24 24" {...props}><path d="M4 4h10l6 6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M14 4v6h6" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
);

type Props = {
  /** Show/hide panel */
  active: boolean;
  /** e.g. notes:${slug}; pass null/undefined to disable persistence */
  storageKey?: string | null;
  onClose: () => void;
};

function GlobalNotepad({ active, storageKey, onClose }: Props) {
  const [text, setText] = useState("");

  // load on key change
  useEffect(() => {
    if (!storageKey) {
      setText("");
      return;
    }
    setText(localStorage.getItem(storageKey) || "");
  }, [storageKey]);

  // persist
  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, text);
    } catch {}
  }, [storageKey, text]);

  if (!active) return null;

  return (
    <div className="fixed bottom-4 right-4 w-[380px] bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden z-40">
      <div className="flex items-center justify-between bg-gray-100 px-3 py-2 border-b">
        <div className="flex items-center gap-2 font-medium text-gray-700">
          <NoteIcon className="h-4 w-4" /> Notepad
        </div>
        <button className="text-sm text-gray-600 hover:text-gray-900" onClick={onClose}>
          Close
        </button>
      </div>
      <textarea
        className="w-full h-56 p-3 outline-none"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type your notes here…"
      />
    </div>
  );
}

export default GlobalNotepad;
export { GlobalNotepad };