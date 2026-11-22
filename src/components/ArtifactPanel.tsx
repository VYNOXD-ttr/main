import {
  BookmarkPlus,
  Check,
  Code2,
  Copy,
  Download,
  Eye,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { ArtifactItem } from "../types/app";

interface ArtifactPanelProps {
  artifacts: ArtifactItem[];
  activeArtifactId: string | null;
  onSelectArtifact: (id: string) => void;
  onSaveToNote: (title: string, content: string) => void;
  onClose: () => void;
}

function getFileExtension(language: string): string {
  const norm = language.toLowerCase().trim();
  const map: Record<string, string> = {
    typescript: "ts",
    ts: "ts",
    tsx: "tsx",
    javascript: "js",
    js: "js",
    jsx: "jsx",
    html: "html",
    htm: "html",
    css: "css",
    json: "json",
    svg: "svg",
    python: "py",
    py: "py",
    bash: "sh",
    sh: "sh",
    markdown: "md",
    md: "md",
  };
  return map[norm] || "txt";
}

function buildPreviewSrcDoc(artifact: ArtifactItem): string {
  const lang = artifact.language.toLowerCase().trim();
  const code = artifact.code.trim();
  if (lang === "svg" || (code.startsWith("<svg") && !code.includes("<html"))) {
    return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<style>
  html, body { margin: 0; padding: 16px; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #0f172a; color: #f8fafc; font-family: system-ui, sans-serif; box-sizing: border-box; }
  svg { max-width: 100%; max-height: 85vh; height: auto; }
</style>
</head>
<body>${code}</body>
</html>`;
  }
  return artifact.code;
}

export function ArtifactPanel({
  artifacts,
  activeArtifactId,
  onSelectArtifact,
  onSaveToNote,
  onClose,
}: ArtifactPanelProps) {
  const activeArtifact =
    artifacts.find((a) => a.id === activeArtifactId) ||
    artifacts[artifacts.length - 1] ||
    null;

  const [viewMode, setViewMode] = useState<"preview" | "code">("code");
  const [copied, setCopied] = useState(false);
  const [savedNote, setSavedNote] = useState(false);

  useEffect(() => {
    if (!activeArtifact) return;
    setViewMode(activeArtifact.isPreviewableHtml ? "preview" : "code");
  }, [activeArtifact?.id, activeArtifact?.isPreviewableHtml]);

  if (!activeArtifact) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeArtifact.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const handleDownload = () => {
    const ext = getFileExtension(activeArtifact.language);
    const safeSlug =
      activeArtifact.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "helper-id-artifact";
    const blob = new Blob([activeArtifact.code], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeSlug}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleSaveNote = () => {
    onSaveToNote(
      activeArtifact.title,
      `[${activeArtifact.language.toUpperCase()}]\n${activeArtifact.code}`,
    );
    setSavedNote(true);
    window.setTimeout(() => setSavedNote(false), 1800);
  };

  return (
    <aside
      className="flex h-full flex-col overflow-hidden border lg:min-h-[520px]"
      style={{
        backgroundColor: "var(--bg-surface)",
        borderColor: "var(--border-subtle)",
        borderRadius: "var(--radius-card)",
      }}
      aria-label="Kanvas Artifact"
    >
      {/* Artifact Header */}
      <div
        className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2.5 sm:px-4 sm:py-3"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="font-mono text-[11px] font-semibold uppercase"
              style={{ color: "var(--accent)" }}
            >
              {activeArtifact.language || "txt"}
            </span>
            <span aria-hidden="true" style={{ color: "var(--text-muted)" }}>
              ·
            </span>
            <h2 className="truncate font-display text-sm font-bold">
              {activeArtifact.title}
            </h2>
          </div>

          {artifacts.length > 1 ? (
            <div className="mt-1.5 flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {artifacts.map((item, idx) => {
                const selected = item.id === activeArtifact.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectArtifact(item.id)}
                    className="min-h-[30px] shrink-0 border px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap transition-colors"
                    style={{
                      borderRadius: "var(--radius-control)",
                      borderColor: selected
                        ? "var(--accent)"
                        : "var(--border-subtle)",
                      backgroundColor: selected
                        ? "var(--accent-soft)"
                        : "var(--bg-canvas)",
                      color: selected
                        ? "var(--accent)"
                        : "var(--text-secondary)",
                    }}
                  >
                    #{idx + 1} {item.language.toUpperCase()}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {activeArtifact.isPreviewableHtml ? (
            <div
              className="flex items-center gap-0.5 p-0.5"
              style={{
                backgroundColor: "var(--bg-surface-muted)",
                borderRadius: "var(--radius-control)",
              }}
            >
              <button
                type="button"
                onClick={() => setViewMode("preview")}
                className="inline-flex min-h-[36px] items-center gap-1 px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors sm:min-h-[30px]"
                style={{
                  borderRadius: "var(--radius-control)",
                  backgroundColor:
                    viewMode === "preview" ? "var(--bg-surface)" : "transparent",
                  color:
                    viewMode === "preview"
                      ? "var(--text-primary)"
                      : "var(--text-muted)",
                }}
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Pratinjau</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("code")}
                className="inline-flex min-h-[36px] items-center gap-1 px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors sm:min-h-[30px]"
                style={{
                  borderRadius: "var(--radius-control)",
                  backgroundColor:
                    viewMode === "code" ? "var(--bg-surface)" : "transparent",
                  color:
                    viewMode === "code"
                      ? "var(--text-primary)"
                      : "var(--text-muted)",
                }}
              >
                <Code2 className="h-3.5 w-3.5" />
                <span>Kode</span>
              </button>
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex min-h-[38px] items-center gap-1 border px-2.5 py-1 text-xs font-medium whitespace-nowrap hover:opacity-80 sm:min-h-[32px]"
            style={{
              borderColor: "var(--border-subtle)",
              borderRadius: "var(--radius-control)",
            }}
            title="Salin kode"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                <span>Tersalin</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Salin</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex min-h-[38px] items-center gap-1 border px-2.5 py-1 text-xs font-medium whitespace-nowrap hover:opacity-80 sm:min-h-[32px]"
            style={{
              borderColor: "var(--border-subtle)",
              borderRadius: "var(--radius-control)",
            }}
            title="Unduh file"
            aria-label="Unduh file artifact"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Unduh</span>
          </button>

          <button
            type="button"
            onClick={handleSaveNote}
            className="inline-flex min-h-[38px] items-center gap-1 border px-2.5 py-1 text-xs font-medium whitespace-nowrap hover:opacity-80 sm:min-h-[32px]"
            style={{
              borderColor: "var(--border-subtle)",
              borderRadius: "var(--radius-control)",
              color: savedNote ? "var(--accent)" : "var(--text-primary)",
            }}
            title="Simpan ke Catatan Cepat"
            aria-label="Simpan ke Catatan Cepat"
          >
            {savedNote ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <BookmarkPlus className="h-3.5 w-3.5" />
            )}
            <span className="hidden xl:inline">
              {savedNote ? "Tersimpan" : "Catat"}
            </span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center border hover:opacity-80 sm:h-8 sm:w-8"
            style={{
              borderColor: "var(--border-subtle)",
              borderRadius: "var(--radius-control)",
            }}
            aria-label="Tutup Kanvas Artifact"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Body: Live Sandboxed Preview or Code */}
      <div className="flex-1 overflow-hidden">
        {viewMode === "preview" && activeArtifact.isPreviewableHtml ? (
          <iframe
            key={activeArtifact.id}
            title={activeArtifact.title}
            sandbox="allow-scripts"
            srcDoc={buildPreviewSrcDoc(activeArtifact)}
            className="h-full min-h-[360px] w-full border-0 bg-slate-950 lg:min-h-[460px]"
          />
        ) : (
          <pre
            className="h-full overflow-auto p-4 font-mono text-[13px] leading-relaxed"
            style={{
              backgroundColor: "var(--code-bg)",
              color: "var(--code-fg)",
            }}
          >
            <code>{activeArtifact.code}</code>
          </pre>
        )}
      </div>
    </aside>
  );
}
