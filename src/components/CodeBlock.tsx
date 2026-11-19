import { memo, useMemo, useState } from "react";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import python from "highlight.js/lib/languages/python";
import bash from "highlight.js/lib/languages/bash";
import json from "highlight.js/lib/languages/json";
import css from "highlight.js/lib/languages/css";
import xml from "highlight.js/lib/languages/xml";
import sql from "highlight.js/lib/languages/sql";
import rust from "highlight.js/lib/languages/rust";
import go from "highlight.js/lib/languages/go";
import java from "highlight.js/lib/languages/java";
import cpp from "highlight.js/lib/languages/cpp";
import yaml from "highlight.js/lib/languages/yaml";
import markdown from "highlight.js/lib/languages/markdown";
import { Check, Copy } from "lucide-react";
import { copyText } from "../utils/clipboard";

hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("python", python);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("json", json);
hljs.registerLanguage("css", css);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("rust", rust);
hljs.registerLanguage("go", go);
hljs.registerLanguage("java", java);
hljs.registerLanguage("cpp", cpp);
hljs.registerLanguage("yaml", yaml);
hljs.registerLanguage("markdown", markdown);

const ALIASES: Record<string, string> = {
  js: "javascript", jsx: "javascript", mjs: "javascript", ts: "typescript", tsx: "typescript",
  py: "python", sh: "bash", shell: "bash", zsh: "bash", html: "xml", svg: "xml", yml: "yaml",
  rs: "rust", "c++": "cpp", c: "cpp", md: "markdown",
};

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const resolved = lang ? ALIASES[lang.toLowerCase()] ?? lang.toLowerCase() : undefined;

  const html = useMemo(() => {
    try {
      if (resolved && hljs.getLanguage(resolved)) return hljs.highlight(code, { language: resolved, ignoreIllegals: true }).value;
      return hljs.highlightAuto(code).value;
    } catch {
      return code.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    }
  }, [code, resolved]);

  const onCopy = async () => {
    if (await copyText(code)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <div className="group/code my-4 overflow-hidden rounded-2xl border border-soul/25 bg-[#0c0716]/80 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.8)]">
      <div className="flex items-center justify-between border-b border-soul/15 bg-soul/[0.07] px-4 py-2">
        <span className="font-display text-[10px] uppercase tracking-[0.25em] text-lilac/70">{lang || "code"}</span>
        <button
          onClick={onCopy}
          aria-label={copied ? "Copied" : "Copy code"}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-white/60 transition-colors duration-200 hover:bg-soul/20 hover:text-white focus-visible:outline-2"
        >
          {copied ? <Check size={14} className="text-emerald-300" /> : <Copy size={14} />}
          <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre className="m-0 overflow-x-auto p-4 text-[13px] leading-relaxed">
        <code className="hljs font-mono" dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    </div>
  );
}

export default memo(CodeBlock);
