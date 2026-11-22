import { Code2, Layers, Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import {
  ArtifactPreviewCard,
  type SessionArtifactEntry,
} from "./ArtifactPreviewCard";

interface ArtifactsGallerySectionProps {
  entries: SessionArtifactEntry[];
  onOpenArtifactEntry: (entry: SessionArtifactEntry) => void;
  onStartPromptInChat: (prompt: string) => void;
}

export function ArtifactsGallerySection({
  entries,
  onOpenArtifactEntry,
  onStartPromptInChat,
}: ArtifactsGallerySectionProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "preview" | "code">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((item) => {
      if (filter === "preview" && !item.artifact.isPreviewableHtml) return false;
      if (filter === "code" && item.artifact.isPreviewableHtml) return false;
      if (!q) return true;
      return (
        item.artifact.title.toLowerCase().includes(q) ||
        item.artifact.language.toLowerCase().includes(q) ||
        item.sessionTitle.toLowerCase().includes(q)
      );
    });
  }, [entries, filter, query]);

  return (
    <div className="claude-enter space-y-6">
      <div
        className="flex flex-col justify-between gap-4 border-b pb-5 sm:flex-row sm:items-end"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <div className="space-y-1">
          <h1 className="font-editorial text-2xl font-medium tracking-tight sm:text-3xl">
            Artefak Karya Anda
          </h1>
          <p
            className="max-w-2xl text-sm leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            Seluruh halaman web HTML, animasi 3D Three.js, dan potongan kode yang
            dihasilkan di percakapan Anda tersimpan otomatis di sini untuk dibuka
            kembali kapan saja.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex items-center p-0.5"
            style={{
              backgroundColor: "var(--bg-surface-muted)",
              borderRadius: "var(--radius-control)",
            }}
            role="group"
            aria-label="Filter tipe artefak"
          >
            {(
              [
                { id: "all", label: "Semua" },
                { id: "preview", label: "Web & 3D" },
                { id: "code", label: "Kode" },
              ] as const
            ).map((opt) => {
              const active = filter === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setFilter(opt.id)}
                  className="min-h-[32px] px-3 py-1 text-xs font-semibold whitespace-nowrap transition-colors"
                  style={{
                    borderRadius: "calc(var(--radius-control) - 2px)",
                    backgroundColor: active ? "var(--bg-surface)" : "transparent",
                    color: active ? "var(--text-primary)" : "var(--text-muted)",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
          style={{ color: "var(--text-muted)" }}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari judul artefak, bahasa, atau obrolan..."
          className="min-h-[40px] w-full border py-2 pl-9 pr-3 text-sm focus:outline-none"
          style={{
            backgroundColor: "var(--bg-surface)",
            borderColor: "var(--border-subtle)",
            borderRadius: "var(--radius-control)",
          }}
        />
      </div>

      {filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center border px-6 py-12 text-center"
          style={{
            backgroundColor: "var(--bg-surface)",
            borderColor: "var(--border-subtle)",
            borderRadius: "var(--radius-card)",
          }}
        >
          <Layers
            className="mb-3 h-7 w-7"
            style={{ color: "var(--accent)" }}
          />
          <h2 className="font-display text-base font-bold">
            {entries.length === 0
              ? "Belum ada artefak tersimpan"
              : "Tidak ada artefak yang cocok dengan pencarian"}
          </h2>
          <p
            className="mt-1 max-w-md text-xs leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            {entries.length === 0
              ? "Minta asisten membuat halaman HTML interaktif, visualisasi data, atau scene 3D Three.js agar otomatis muncul sebagai kartu di sini."
              : "Coba ubah kata kunci pencarian atau pilih filter Semua."}
          </p>

          {entries.length === 0 ? (
            <div className="mt-5 flex flex-wrap justify-center gap-2.5">
              <button
                type="button"
                onClick={() =>
                  onStartPromptInChat(
                    "Buatkan halaman HTML tunggal interaktif bertema kalkulator hemat energi modern yang rapi dan responsif.",
                  )
                }
                className="inline-flex min-h-[38px] items-center gap-2 px-4 py-2 text-xs font-semibold whitespace-nowrap hover:opacity-90"
                style={{
                  backgroundColor: "var(--accent)",
                  color: "var(--accent-contrast)",
                  borderRadius: "var(--radius-control)",
                }}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Buat Web Interaktif Pertama</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  onStartPromptInChat(
                    "Buatkan file HTML tunggal Three.js dengan OrbitControls dan animasi obyek 3D kristal bercahaya.",
                  )
                }
                className="inline-flex min-h-[38px] items-center gap-2 border px-4 py-2 text-xs font-semibold whitespace-nowrap hover:opacity-80"
                style={{
                  borderColor: "var(--border-strong)",
                  backgroundColor: "var(--bg-canvas)",
                  borderRadius: "var(--radius-control)",
                }}
              >
                <Code2 className="h-3.5 w-3.5" />
                <span>Buat Scene 3D Three.js</span>
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((entry) => (
            <ArtifactPreviewCard
              key={`${entry.sessionId}-${entry.artifact.id}`}
              entry={entry}
              onSelect={onOpenArtifactEntry}
            />
          ))}
        </div>
      )}
    </div>
  );
}
