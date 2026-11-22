import { ArrowRight, CheckCircle2, Lock, Terminal } from "lucide-react";
import { useState } from "react";
import { PIPELINE_NODES } from "../data/presetsAndProviders";
import type { PipelineNodeId, ThemePreferences } from "../types/app";
import { Architecture3DCanvas } from "./Architecture3DCanvas";
import { CodeBlock } from "./CodeBlock";

interface GuideSectionProps {
  themePreferences: ThemePreferences;
  onNavigate: (tab: "sandbox" | "studio") => void;
}

const BEGINNER_STEPS = [
  {
    num: "01",
    title: "Ambil API Key Gratis di Google AI Studio",
    detail:
      "Masuk dengan akun Google biasa ke Google AI Studio, klik Create API Key. Anda tidak memerlukan kartu kredit untuk mulai belajar di Free Tier.",
  },
  {
    num: "02",
    title: "Simpan Kunci di Server (.env / Settings > Secrets)",
    detail:
      "Taruh kunci sebagai variabel lingkungan GEMINI_API_KEY di sisi server. Jangan pernah menaruhnya di kode React atau membagikan key asli ke repositori publik.",
  },
  {
    num: "03",
    title: "Buat Endpoint Proxy di Node.js + Express",
    detail:
      "Pasang paket @google/genai, baca pesan dari browser, sisipkan System Prompt, lalu panggil gemini-4-hydrogen dengan ThinkingLevel secara streaming.",
  },
  {
    num: "04",
    title: "Hubungkan Antarmuka React via fetch",
    detail:
      "Komponen React cukup mengirim JSON ke /api/assistant/chat dan menampilkan potongan teks SSE yang masuk—termasuk blok kode siap salin.",
  },
];

export function GuideSection({
  themePreferences,
  onNavigate,
}: GuideSectionProps) {
  const [selectedNode, setSelectedNode] = useState<PipelineNodeId>("server");
  const activeSpec =
    PIPELINE_NODES.find((n) => n.id === selectedNode) || PIPELINE_NODES[1];

  return (
    <div className="space-y-12">
      {/* Hero Intro */}
      <section className="flex flex-col justify-between gap-6 border-b pb-8 lg:flex-row lg:items-end"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <div className="max-w-3xl space-y-3">
          <p className="text-xs font-semibold tracking-wide" style={{ color: "var(--accent)" }}>
            Panduan Dasar Full-Stack AI Assistant
          </p>
          <h1 className="headline-balance font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Cara Membangun AI Assistant dari Nol dengan Node.js, React, dan Gemini API
          </h1>
          <p className="max-w-2xl text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Pelajari alur kerja aplikasi AI yang aman melalui visualisasi 3D interaktif,
            bandingkan penyedia API key untuk pemula, racik System Prompt beserta Skill Koding &amp; Three.js,
            lalu uji coba langsung di Kanvas Artifact bersama{" "}
            <span className="font-mono text-sm">gemini-4-hydrogen</span>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate("studio")}
            className="inline-flex min-h-[42px] items-center gap-2 px-5 py-2.5 text-sm font-semibold whitespace-nowrap shrink-0 transition-opacity hover:opacity-90"
            style={{
              backgroundColor: "var(--accent)",
              color: "var(--accent-contrast)",
              borderRadius: "var(--radius-control)",
            }}
          >
            <span>Buka Studio Prompt</span>
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onNavigate("sandbox")}
            className="inline-flex min-h-[42px] items-center gap-2 border px-4 py-2.5 text-sm font-medium whitespace-nowrap shrink-0 transition-colors hover:opacity-80"
            style={{
              borderColor: "var(--border-strong)",
              backgroundColor: "var(--bg-surface)",
              borderRadius: "var(--radius-control)",
            }}
          >
            <span>Buka Asisten Harian</span>
          </button>
        </div>
      </section>

      {/* Interactive 3D Three.js Architecture Stage + Inspector */}
      <section className="space-y-4">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <h2 className="font-display text-xl font-bold">
              01. Visualisasi Arsitektur 3D Interaktif
            </h2>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Putar kanvas Three.js, klik salah satu node 3D, atau jalankan simulasi untuk melihat perjalanan pesan &amp; API key.
            </p>
          </div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Drag untuk putar · Scroll untuk zoom · Klik objek untuk inspeksi
          </p>
        </div>

        <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Architecture3DCanvas
              selectedNode={selectedNode}
              onSelectNode={setSelectedNode}
              themePreferences={themePreferences}
            />
          </div>

          <div
            className="flex flex-col justify-between border p-6 lg:col-span-5"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-subtle)",
              borderRadius: "var(--radius-card)",
            }}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-mono font-semibold" style={{ color: "var(--accent)" }}>
                  Tahap {activeSpec.stepNumber}
                </span>
                <span style={{ color: "var(--text-muted)" }}>
                  {activeSpec.shortLabel}
                </span>
              </div>

              <h3 className="font-display text-lg font-bold">
                {activeSpec.title}
              </h3>

              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {activeSpec.summary}
              </p>

              <ul className="space-y-2 pt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                {activeSpec.responsibilities.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0"
                      style={{ color: "var(--accent)" }}
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div
                className="flex items-start gap-2.5 p-3.5 text-xs leading-relaxed"
                style={{
                  backgroundColor: "var(--bg-surface-muted)",
                  borderRadius: "var(--radius-control)",
                  color: "var(--text-secondary)",
                }}
              >
                <Lock className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--accent)" }} />
                <span>{activeSpec.securityNote}</span>
              </div>
            </div>

            <div className="mt-5">
              <CodeBlock
                code={activeSpec.codePreview}
                language="ts"
                title={activeSpec.shortLabel}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 4-Step Beginner Roadmap */}
      <section className="space-y-6">
        <div>
          <h2 className="font-display text-xl font-bold">
            02. Empat Langkah Praktis Membuat AI Assistant
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            Alur yang sama persis digunakan oleh aplikasi Helper.Id ini di balik layar.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          {BEGINNER_STEPS.map((step) => (
            <div
              key={step.num}
              className="flex flex-col justify-between border p-5"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-subtle)",
                borderRadius: "var(--radius-card)",
              }}
            >
              <div className="space-y-2.5">
                <span
                  className="font-mono text-xs font-semibold tabular-nums"
                  style={{ color: "var(--accent)" }}
                >
                  Langkah {step.num}
                </span>
                <h3 className="font-display text-base font-semibold leading-snug">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {step.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pro vs Flash & Security Clarity */}
      <section
        className="grid grid-cols-1 gap-8 border-t pt-8 lg:grid-cols-2"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <div className="space-y-3">
          <h2 className="font-display text-lg font-bold">
            Mengoptimalkan gemini-4-hydrogen &amp; Kanvas Artifact
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Model <span className="font-mono">gemini-4-hydrogen</span> memadukan kecepatan respons
            tinggi dengan penalaran koding yang kuat untuk jadwal harian, kode
            TypeScript/React, sekaligus scene 3D Three.js. Gunakan mode{" "}
            <strong>Kilat (LOW)</strong> untuk balasan paling cepat,{" "}
            <strong>Seimbang (MEDIUM)</strong> untuk harian, atau{" "}
            <strong>Dalam (HIGH) / Maksimal (XHIGH)</strong> untuk arsitektur kompleks. Blok kode dan file HTML
            Three.js otomatis terbuka di panel Kanvas Artifact agar bisa langsung dipratinjau.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4" style={{ color: "var(--accent)" }} />
            <h2 className="font-display text-lg font-bold">
              Catatan Penting Tentang API Key &amp; Deploy ke Vercel
            </h2>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Jangan pernah menaruh kunci API asli di kode frontend atau chat publik—selalu
            simpan di panel <strong>Settings &gt; Secrets</strong> atau file{" "}
            <span className="font-mono">.env</span> di server. Untuk memublikasikan web ini ke{" "}
            <strong>Vercel</strong>, impor proyek ke Vercel, tambahkan variabel lingkungan{" "}
            <span className="font-mono">GEMINI_API_KEY</span> di pengaturan proyek Vercel, dan
            daftarkan domain <span className="font-mono">*.vercel.app</span> ke Firebase
            Authorized Domains bila memakai koneksi Google Workspace.
          </p>
        </div>
      </section>
    </div>
  );
}
