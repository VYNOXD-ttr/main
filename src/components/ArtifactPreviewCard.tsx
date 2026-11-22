import { Code2, Globe } from "lucide-react";
import type { ArtifactItem } from "../types/app";

export interface SessionArtifactEntry {
  artifact: ArtifactItem;
  sessionId: string;
  sessionTitle: string;
  timestamp: number;
}

interface ArtifactPreviewCardProps {
  entry: SessionArtifactEntry;
  onSelect: (entry: SessionArtifactEntry) => void;
}

function formatShortDate(ts: number): string {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
    }).format(new Date(ts));
  } catch {
    return "";
  }
}

export function ArtifactPreviewCard({
  entry,
  onSelect,
}: ArtifactPreviewCardProps) {
  const { artifact, sessionTitle, timestamp } = entry;
  const codeLines = artifact.code.split("\n").slice(0, 8).join("\n");

  return (
    <button
      type="button"
      onClick={() => onSelect(entry)}
      className="claude-card-hover group flex flex-col overflow-hidden border text-left"
      style={{
        backgroundColor: "var(--bg-surface)",
        borderColor: "var(--border-subtle)",
        borderRadius: "var(--radius-card)",
      }}
    >
      <div
        className="relative h-28 w-full overflow-hidden border-b"
        style={{
          backgroundColor: "var(--bg-surface-muted)",
          borderColor: "var(--border-subtle)",
        }}
      >
        {artifact.isPreviewableHtml ? (
          <iframe
            title={`Pratinjau ${artifact.title}`}
            srcDoc={artifact.code}
            sandbox="allow-scripts"
            loading="lazy"
            tabIndex={-1}
            className="pointer-events-none h-[400%] w-[400%] origin-top-left scale-25 border-0 bg-white"
          />
        ) : (
          <pre
            className="h-full w-full overflow-hidden p-3 font-mono text-[10px] leading-relaxed opacity-85"
            style={{
              backgroundColor: "var(--code-bg)",
              color: "var(--code-fg)",
            }}
          >
            <code>{codeLines}</code>
          </pre>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between gap-1.5 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="line-clamp-1 text-xs font-semibold">
            {artifact.title}
          </div>
          {artifact.isPreviewableHtml ? (
            <Globe
              className="mt-0.5 h-3.5 w-3.5 shrink-0"
              style={{ color: "var(--accent)" }}
            />
          ) : (
            <Code2
              className="mt-0.5 h-3.5 w-3.5 shrink-0"
              style={{ color: "var(--text-muted)" }}
            />
          )}
        </div>

        <div
          className="flex items-center justify-between gap-2 text-[11px]"
          style={{ color: "var(--text-muted)" }}
        >
          <span className="truncate">{sessionTitle}</span>
          <span className="shrink-0 tabular-nums">
            {formatShortDate(timestamp)}
          </span>
        </div>
      </div>
    </button>
  );
}
