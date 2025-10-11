// src/components/MathText.tsx
import { useEffect, useRef } from "react";
import renderMathInElement from "katex/contrib/auto-render";
import "katex/dist/katex.min.css";

// If TS complained earlier, keep a declaration file:
// src/types/katex-auto-render.d.ts ->  declare module "katex/contrib/auto-render";

export default function MathText({ text, className = "" }: { text: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    // Insert raw text (preserve $...$), escape only < > &
    ref.current.innerHTML = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    renderMathInElement(ref.current, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "\\[", right: "\\]", display: true },
        { left: "$",  right: "$",  display: false },
        { left: "\\(", right: "\\)", display: false },
      ],
      throwOnError: false,
      strict: "ignore",
    });
  }, [text]);

  return <div ref={ref} className={className} />;
}
