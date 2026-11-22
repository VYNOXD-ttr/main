import { ExternalLink, Info } from "lucide-react";
import { useMemo, useState } from "react";
import { PROVIDER_CATALOG } from "../data/presetsAndProviders";

type ProviderFilter = "all" | "free" | "no-card" | "coding";

export function ApiComparisonSection() {
  const [filter, setFilter] = useState<ProviderFilter>("all");

  const filteredProviders = useMemo(() => {
    return PROVIDER_CATALOG.filter((item) => {
      if (filter === "free") return item.freeTierAvailable;
      if (filter === "no-card") return item.freeTierAvailable && !item.creditCardRequired;
      if (filter === "coding") return /baik|unggul/i.test(item.codingRating);
      return true;
    });
  }, [filter]);

  return (
    <div className="space-y-10">
      {/* Header & Recommendation Lead */}
      <section
        className="space-y-4 border-b pb-8"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <p className="text-xs font-semibold tracking-wide" style={{ color: "var(--accent)" }}>
          Rekomendasi API untuk Pemula
        </p>
        <h1 className="headline-balance font-display text-3xl font-bold tracking-tight">
          Perbandingan API Key Termurah &amp; Termudah untuk Memulai
        </h1>
        <p className="max-w-3xl text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          Untuk pemula, pilihan termudah dan paling hemat adalah{" "}
          <strong>Google Gemini via Google AI Studio</strong> karena menyediakan Free Tier
          permanen tanpa meminta kartu kredit, SDK TypeScript resmi (<span className="font-mono text-sm">@google/genai</span>),
          dan mendukung model cepat &amp; cerdas terbaru seperti <span className="font-mono text-sm">gemini-4-hydrogen</span>.
        </p>

        {/* Honest clarification on awesome-free-llm-apis */}
        <div
          className="flex items-start gap-3 border p-4 text-sm leading-relaxed"
          style={{
            backgroundColor: "var(--bg-surface)",
            borderColor: "var(--border-subtle)",
            borderRadius: "var(--radius-card)",
            color: "var(--text-secondary)",
          }}
        >
          <Info className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--accent)" }} />
          <div>
            <strong style={{ color: "var(--text-primary)" }}>
              Tentang repositori daftar Free LLM APIs (seperti awesome-free-llm-apis):
            </strong>{" "}
            Repositori tersebut berisi <em>direktori penyedia AI yang punya paket gratis</em> beserta
            batas kuota dan tautan pendaftarannya—bukan kumpulan API key siap pakai yang dibagikan publik.
            Anda tetap perlu membuat akun gratis di penyedia pilihan Anda untuk memperoleh API key pribadi.
          </div>
        </div>
      </section>

      {/* Filter Controls */}
      <section className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <h2 className="font-display text-xl font-bold">
            Katalog Penyedia API ({filteredProviders.length})
          </h2>

          <div
            className="inline-flex flex-wrap items-center gap-1 p-1"
            style={{
              backgroundColor: "var(--bg-surface-muted)",
              borderRadius: "var(--radius-control)",
            }}
            role="tablist"
            aria-label="Filter penyedia API"
          >
            {(
              [
                { id: "all", label: "Semua" },
                { id: "free", label: "Gratis Permanen" },
                { id: "no-card", label: "Tanpa Kartu Kredit" },
                { id: "coding", label: "Cocok Koding" },
              ] as Array<{ id: ProviderFilter; label: string }>
            ).map((tab) => {
              const active = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className="min-h-[36px] px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors"
                  style={{
                    borderRadius: "var(--radius-control)",
                    backgroundColor: active ? "var(--bg-surface)" : "transparent",
                    color: active ? "var(--text-primary)" : "var(--text-muted)",
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Provider Cards */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {filteredProviders.map((provider) => (
            <article
              key={provider.id}
              className="flex flex-col justify-between border p-6"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderColor: provider.recommended
                  ? "var(--accent)"
                  : "var(--border-subtle)",
                borderRadius: "var(--radius-card)",
              }}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-lg font-bold">
                      {provider.name}
                    </h3>
                    <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
                      <span>
                        {provider.freeTierAvailable ? "Free Tier Tersedia" : "Berbasis Kredit / Berbayar"}
                      </span>
                      <span aria-hidden="true"> · </span>
                      <span>
                        {provider.creditCardRequired ? "Butuh Kartu Kredit" : "Tanpa Kartu Kredit"}
                      </span>
                      {provider.recommended ? (
                        <>
                          <span aria-hidden="true"> · </span>
                          <span className="font-semibold" style={{ color: "var(--accent)" }}>
                            Pilihan Utama Pemula
                          </span>
                        </>
                      ) : null}
                    </p>
                  </div>

                  <a
                    href={provider.docsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex shrink-0 items-center gap-1 text-xs font-medium hover:underline"
                    style={{ color: "var(--accent)" }}
                  >
                    <span>Portal</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>

                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {provider.costSummary}
                </p>

                <dl
                  className="grid grid-cols-1 gap-2 border-t pt-3 text-xs sm:grid-cols-2"
                  style={{ borderColor: "var(--border-subtle)" }}
                >
                  <div>
                    <dt style={{ color: "var(--text-muted)" }}>Model Awal</dt>
                    <dd className="mt-0.5 font-mono font-medium">
                      {provider.starterModel}
                    </dd>
                  </div>
                  <div>
                    <dt style={{ color: "var(--text-muted)" }}>Kemampuan Koding</dt>
                    <dd className="mt-0.5 font-medium">{provider.codingRating}</dd>
                  </div>
                  <div>
                    <dt style={{ color: "var(--text-muted)" }}>Batas Kuota</dt>
                    <dd className="mt-0.5 tabular-nums">{provider.rateLimitLabel}</dd>
                  </div>
                  <div>
                    <dt style={{ color: "var(--text-muted)" }}>Variabel Secret (.env)</dt>
                    <dd className="mt-0.5 font-mono">{provider.envVarName}</dd>
                  </div>
                </dl>
              </div>

              <div
                className="mt-4 border-t pt-3 text-xs leading-relaxed"
                style={{
                  borderColor: "var(--border-subtle)",
                  color: "var(--text-muted)",
                }}
              >
                <strong style={{ color: "var(--text-secondary)" }}>Catatan: </strong>
                {provider.caveat}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Quick Decision Matrix Table */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold">
          Ringkasan Keputusan Cepat
        </h2>
        <div
          className="overflow-x-auto border"
          style={{
            backgroundColor: "var(--bg-surface)",
            borderColor: "var(--border-subtle)",
            borderRadius: "var(--radius-card)",
          }}
        >
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr
                className="border-b text-xs"
                style={{
                  borderColor: "var(--border-subtle)",
                  color: "var(--text-muted)",
                }}
              >
                <th className="px-4 py-3 font-semibold">Penyedia</th>
                <th className="px-4 py-3 font-semibold">Biaya Awal</th>
                <th className="px-4 py-3 font-semibold">Kartu Kredit</th>
                <th className="px-4 py-3 font-semibold">Format API</th>
                <th className="px-4 py-3 font-semibold">Paling Cocok Untuk</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
              {PROVIDER_CATALOG.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {item.freeTierAvailable ? "Gratis (Free Tier)" : "Berbayar / Kredit"}
                  </td>
                  <td className="px-4 py-3">
                    {item.creditCardRequired ? "Wajib" : "Tidak Perlu"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {item.openAiCompatible ? "SDK Resmi + OpenAI Compat" : "Messages API Khusus"}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--text-secondary)" }}>
                    {item.bestFor}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
