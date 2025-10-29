// src/components/MathText.tsx
import { useEffect, useRef } from "react";
import renderMathInElement from "katex/contrib/auto-render";
import "katex/dist/katex.min.css";

// Minimal HTML escape (safe for innerHTML)
function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Convert **bold**, *italic*, and newlines on NON-MATH segments only
function markdownLite(s: string) {
  // support both literal "\n" and real newlines
  s = s.replace(/\\n/g, "\n");
  s = esc(s);
  s = s.replace(/\n/g, "<br/>");
  // bold (**, __) then italics (*, _)
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/__(.+?)__/g, "<strong>$1</strong>");
  s = s.replace(/\*(.+?)\*/g, "<em>$1</em>");
  s = s.replace(/_(.+?)_/g, "<em>$1</em>");
  return s;
}

// Split text into tokens so markdown isn’t applied inside math
function tokenize(src: string) {
  // Order matters: longest delimiters first, all non-greedy
  const re =
    /(\\\[)([\s\S]*?)(\\\])|(\$\$)([\s\S]*?)(\$\$)|(\\\()([\s\S]*?)(\\\))|(\$)([^$]*?)(\$)/g;

  const out: Array<
    | { type: "text"; v: string }
    | { type: "math"; left: string; body: string; right: string }
  > = [];

  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    if (m.index > last) out.push({ type: "text", v: src.slice(last, m.index) });

    if (m[1]) out.push({ type: "math", left: m[1], body: m[2], right: m[3] });          // \[...\]
    else if (m[4]) out.push({ type: "math", left: m[4], body: m[5], right: m[6] });     // $$...$$
    else if (m[7]) out.push({ type: "math", left: m[7], body: m[8], right: m[9] });     // \(...\)
    else out.push({ type: "math", left: m[10], body: m[11], right: m[12] });            // $...$

    last = re.lastIndex;
  }
  if (last < src.length) out.push({ type: "text", v: src.slice(last) });
  return out;
}

export default function MathText({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    // Build HTML: apply markdown to text segments; escape math bodies but keep delimiters
    const html = tokenize(text)
      .map((t) =>
        t.type === "text"
          ? markdownLite(t.v)
          : `${t.left}${esc(t.body)}${t.right}`
      )
      .join("");

    ref.current.innerHTML = html;

    renderMathInElement(ref.current, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "\\[", right: "\\]", display: true },
        { left: "\\(", right: "\\)", display: false },
        { left: "$", right: "$", display: false },
      ],
      throwOnError: false,
      strict: "ignore",
    });
  }, [text]);

  return <div ref={ref} className={className} />;
}
