// src/components/Exams/Tools/ToolButtons.tsx
import type { Tool } from "./types";

const PointerIcon = (props: any) => (
  <svg viewBox="0 0 24 24" {...props}><path d="M3 2l18 9-7 2 2 7-5-6-8-12z" fill="currentColor"/></svg>
);
const XIcon = (props: any) => (
  <svg viewBox="0 0 24 24" {...props}><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
);
const NoteIcon = (props: any) => (
  <svg viewBox="0 0 24 24" {...props}><path d="M4 4h10l6 6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M14 4v6h6" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
);

type Props = {
  tool: Tool;
  setTool: (t: Tool) => void;
};

function ExamToolButtons({ tool, setTool }: Props) {
  return (
    <div className="flex items-center gap-1.5 ml-1">
      <button
        className={`h-8 w-8 rounded border ${
          tool === "pointer"
            ? "bg-gray-700 text-white border-gray-800"
            : "border-gray-400 bg-gradient-to-b from-white to-gray-100 hover:bg-gray-50"
        }`}
        title="Pointer"
        onClick={() => setTool("pointer")}
      >
        <PointerIcon className="h-4 w-4 mx-auto" />
      </button>

      <button
        className={`h-8 w-8 rounded border ${
          tool === "eliminate"
            ? "bg-gray-700 text-white border-gray-800"
            : "border-gray-400 bg-gradient-to-b from-white to-gray-100 hover:bg-gray-50"
        }`}
        title="Answer Eliminator"
        onClick={() => setTool(tool === "eliminate" ? "pointer" : "eliminate")}
      >
        <XIcon className="h-4 w-4 mx-auto" />
      </button>

      <button
        className={`h-8 w-8 rounded border ${
          tool === "notepad"
            ? "bg-gray-700 text-white border-gray-800"
            : "border-gray-400 bg-gradient-to-b from-white to-gray-100 hover:bg-gray-50"
        }`}
        title="Open Notepad"
        onClick={() => setTool(tool === "notepad" ? "pointer" : "notepad")}
      >
        <NoteIcon className="h-4 w-4 mx-auto" />
      </button>
    </div>
  );
}

export default ExamToolButtons;
export { ExamToolButtons };