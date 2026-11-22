import { Check, Copy, PanelRightOpen } from "lucide-react";
import { useState } from "react";

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
  onOpenArtifact?: () => void;
}

export function CodeBlock({
  code,
  language = "ts",
  title,
  onOpenArtifact,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      className="overflow-hidden border"
      style={{
        backgroundColor: "var(--code-bg)",
        color: "var(--code-fg)",
        borderColor: "var(--border-subtle)",
        borderRadius: "var(--radius-card)",
      }}
    >
      <div
        className="flex items-center justify-between gap-4 border-b px-4 py-2.5 text-xs"
        style={{ borderColor: "rgba(148, 163, 184, 0.2)" }}
      >
        <div className="flex min-w-0 items-center gap-2 text-slate-300">
          <span className="font-mono font-medium uppercase tracking-wide text-slate-400">
            {language}
          </span>
          {title ? (
            <>
              <span aria-hidden="true" className="text-slate-600">
                ·
              </span>
              <span className="truncate text-slate-200">{title}</span>
            </>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {onOpenArtifact ? (
            <button
              type="button"
              onClick={onOpenArtifact}
              className="inline-flex shrink-0 items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-200 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              style={{ borderRadius: "var(--radius-control)" }}
              aria-label="Buka di Kanvas Artifact"
            >
              <PanelRightOpen className="h-3.5 w-3.5" />
              <span className="whitespace-nowrap">Kanvas</span>
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex shrink-0 items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-200 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            style={{ borderRadius: "var(--radius-control)" }}
            aria-label="Salin kode"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="whitespace-nowrap text-emerald-300">Tersalin</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span className="whitespace-nowrap">Salin</span>
              </>
            )}
          </button>
        </div>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}
