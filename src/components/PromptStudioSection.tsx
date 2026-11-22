import { Check, Copy, Play, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { ASSISTANT_PRESETS } from "../data/presetsAndProviders";
import type {
  AssistantConfig,
  OutputFormatId,
  ThinkingLevelOption,
} from "../types/app";
import {
  compileSystemPrompt,
  generateIntegrationCode,
  type CodeTabId,
} from "../utils/promptAndCodeGen";
import { CodeBlock } from "./CodeBlock";

interface PromptStudioSectionProps {
  config: AssistantConfig;
  onChange: (next: AssistantConfig) => void;
  onLaunchSandbox: () => void;
}

const CODE_TABS: Array<{ id: CodeTabId; label: string }> = [
  { id: "server", label: "Server (Node.js)" },
  { id: "client", label: "Client (React)" },
  { id: "curl", label: "cURL Terminal" },
  { id: "env", label: ".env & Paket" },
  { id: "threejs", label: "Three.js + AI" },
];

export function PromptStudioSection({
  config,
  onChange,
  onLaunchSandbox,
}: PromptStudioSectionProps) {
  const [newRule, setNewRule] = useState("");
  const [codeTab, setCodeTab] = useState<CodeTabId>("server");
  const [promptCopied, setPromptCopied] = useState(false);

  const compiledPrompt = useMemo(() => compileSystemPrompt(config), [config]);
  const generatedCodes = useMemo(
    () => generateIntegrationCode(config, compiledPrompt),
    [config, compiledPrompt],
  );

  const applyPreset = (presetId: string) => {
    const found = ASSISTANT_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    onChange({
      ...found.config,
      model: "gemini-4-hydrogen",
      thinkingLevel: config.thinkingLevel,
    });
  };

  const addRule = () => {
    const trimmed = newRule.trim();
    if (!trimmed) return;
    onChange({ ...config, rules: [...config.rules, trimmed] });
    setNewRule("");
  };

  const removeRule = (index: number) => {
    onChange({
      ...config,
      rules: config.rules.filter((_, i) => i !== index),
    });
  };

  const copyCompiledPrompt = async () => {
    try {
      await navigator.clipboard.writeText(compiledPrompt);
      setPromptCopied(true);
      window.setTimeout(() => setPromptCopied(false), 1800);
    } catch {
      setPromptCopied(false);
    }
  };

  const activeCode = generatedCodes[codeTab];

  return (
    <div className="space-y-8">
      <section
        className="flex flex-col justify-between gap-4 border-b pb-6 sm:flex-row sm:items-end"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-wide" style={{ color: "var(--accent)" }}>
            Simulator System Prompt &amp; Generator Kode
          </p>
          <h1 className="headline-balance font-display text-3xl font-bold tracking-tight">
            Rancang Persona, Skill Koding &amp; Three.js Asisten Anda
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Setiap perubahan aturan dan skill di panel kiri otomatis menyusun System Prompt baru
            dan memperbarui kode Node.js + React siap salin di panel kanan.
          </p>
        </div>

        <button
          type="button"
          onClick={onLaunchSandbox}
          className="inline-flex min-h-[42px] shrink-0 items-center gap-2 px-5 py-2.5 text-sm font-semibold whitespace-nowrap transition-opacity hover:opacity-90"
          style={{
            backgroundColor: "var(--accent)",
            color: "var(--accent-contrast)",
            borderRadius: "var(--radius-control)",
          }}
        >
          <Play className="h-4 w-4" />
          <span>Pakai di Asisten Harian</span>
        </button>
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left: Persona & Skill Controls */}
        <section
          className="space-y-6 border p-6 lg:col-span-5"
          style={{
            backgroundColor: "var(--bg-surface)",
            borderColor: "var(--border-subtle)",
            borderRadius: "var(--radius-card)",
          }}
        >
          <div className="space-y-2.5">
            <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              Pilih Preset Awal
            </label>
            <div className="flex flex-wrap gap-2">
              {ASSISTANT_PRESETS.map((preset) => {
                const selected = config.presetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset.id)}
                    className="min-h-[36px] border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors"
                    style={{
                      borderRadius: "var(--radius-control)",
                      borderColor: selected ? "var(--accent)" : "var(--border-subtle)",
                      backgroundColor: selected ? "var(--accent-soft)" : "var(--bg-canvas)",
                      color: selected ? "var(--accent)" : "var(--text-primary)",
                    }}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="assistant-name" className="block text-xs font-semibold">
                Nama Asisten
              </label>
              <input
                id="assistant-name"
                type="text"
                value={config.name}
                onChange={(e) => onChange({ ...config, name: e.target.value })}
                className="min-h-[40px] w-full border px-3 py-2 text-sm focus:outline-2"
                style={{
                  backgroundColor: "var(--bg-canvas)",
                  borderColor: "var(--border-subtle)",
                  borderRadius: "var(--radius-control)",
                }}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="assistant-lang" className="block text-xs font-semibold">
                Bahasa Jawaban
              </label>
              <input
                id="assistant-lang"
                type="text"
                value={config.language}
                onChange={(e) => onChange({ ...config, language: e.target.value })}
                className="min-h-[40px] w-full border px-3 py-2 text-sm focus:outline-2"
                style={{
                  backgroundColor: "var(--bg-canvas)",
                  borderColor: "var(--border-subtle)",
                  borderRadius: "var(--radius-control)",
                }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="assistant-role" className="block text-xs font-semibold">
              Peran &amp; Keahlian Utama
            </label>
            <textarea
              id="assistant-role"
              rows={3}
              value={config.role}
              onChange={(e) => onChange({ ...config, role: e.target.value })}
              className="w-full border px-3 py-2 text-sm leading-relaxed focus:outline-2"
              style={{
                backgroundColor: "var(--bg-canvas)",
                borderColor: "var(--border-subtle)",
                borderRadius: "var(--radius-control)",
              }}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="assistant-tone" className="block text-xs font-semibold">
              Gaya Bahasa &amp; Nada Bicara
            </label>
            <input
              id="assistant-tone"
              type="text"
              value={config.tone}
              onChange={(e) => onChange({ ...config, tone: e.target.value })}
              className="min-h-[40px] w-full border px-3 py-2 text-sm focus:outline-2"
              style={{
                backgroundColor: "var(--bg-canvas)",
                borderColor: "var(--border-subtle)",
                borderRadius: "var(--radius-control)",
              }}
            />
          </div>

          {/* Skill Koding, Three.js & Alat Harian Toggles */}
          <div
            className="space-y-3 border-t pt-4"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              Skill Tambahan Asisten
            </p>

            <label
              className="flex cursor-pointer items-start justify-between gap-3 border p-3"
              style={{
                borderColor: config.dailyToolsEnabled
                  ? "var(--accent)"
                  : "var(--border-subtle)",
                backgroundColor: config.dailyToolsEnabled
                  ? "var(--accent-soft)"
                  : "var(--bg-canvas)",
                borderRadius: "var(--radius-control)",
              }}
            >
              <div>
                <div className="text-sm font-semibold">Alat Tugas &amp; Catatan Harian</div>
                <p className="mt-0.5 text-xs" style={{ color: "var(--text-secondary)" }}>
                  Asisten dapat langsung mencatat tugas, jadwal, dan catatan cepat via Function Calling.
                </p>
              </div>
              <input
                type="checkbox"
                checked={config.dailyToolsEnabled}
                onChange={(e) =>
                  onChange({ ...config, dailyToolsEnabled: e.target.checked })
                }
                className="mt-1 h-4 w-4 accent-[var(--accent)]"
              />
            </label>

            <label
              className="flex cursor-pointer items-start justify-between gap-3 border p-3"
              style={{
                borderColor: config.codingSkillEnabled
                  ? "var(--accent)"
                  : "var(--border-subtle)",
                backgroundColor: config.codingSkillEnabled
                  ? "var(--accent-soft)"
                  : "var(--bg-canvas)",
                borderRadius: "var(--radius-control)",
              }}
            >
              <div>
                <div className="text-sm font-semibold">Skill Koding Full-Stack</div>
                <p className="mt-0.5 text-xs" style={{ color: "var(--text-secondary)" }}>
                  Aktifkan aturan kode TypeScript/React/Node.js bersih + pemisahan rahasia server.
                </p>
              </div>
              <input
                type="checkbox"
                checked={config.codingSkillEnabled}
                onChange={(e) =>
                  onChange({ ...config, codingSkillEnabled: e.target.checked })
                }
                className="mt-1 h-4 w-4 accent-[var(--accent)]"
              />
            </label>

            <label
              className="flex cursor-pointer items-start justify-between gap-3 border p-3"
              style={{
                borderColor: config.threejsSkillEnabled
                  ? "var(--accent)"
                  : "var(--border-subtle)",
                backgroundColor: config.threejsSkillEnabled
                  ? "var(--accent-soft)"
                  : "var(--bg-canvas)",
                borderRadius: "var(--radius-control)",
              }}
            >
              <div>
                <div className="text-sm font-semibold">Skill Three.js &amp; WebGL 3D</div>
                <p className="mt-0.5 text-xs" style={{ color: "var(--text-secondary)" }}>
                  Aktifkan panduan scene PBR, OrbitControls, dan cleanup memori WebGL di React.
                </p>
              </div>
              <input
                type="checkbox"
                checked={config.threejsSkillEnabled}
                onChange={(e) =>
                  onChange({ ...config, threejsSkillEnabled: e.target.checked })
                }
                className="mt-1 h-4 w-4 accent-[var(--accent)]"
              />
            </label>
          </div>

          {/* ThinkingLevel & Output Format */}
          <div
            className="grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-2"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <div className="space-y-1.5">
              <label htmlFor="thinking-select" className="block text-xs font-semibold">
                Kedalaman Penalaran (ThinkingLevel)
              </label>
              <select
                id="thinking-select"
                value={config.thinkingLevel}
                onChange={(e) =>
                  onChange({
                    ...config,
                    thinkingLevel: e.target.value as ThinkingLevelOption,
                  })
                }
                className="min-h-[40px] w-full border px-3 py-2 text-sm"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  borderColor: "var(--border-strong)",
                  borderRadius: "var(--radius-control)",
                }}
              >
                <option value="LOW">Kilat / Respons Paling Cepat (LOW)</option>
                <option value="MEDIUM">Seimbang (MEDIUM)</option>
                <option value="HIGH">Mendalam (HIGH)</option>
                <option value="XHIGH">Penalaran Maksimal (XHIGH)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="format-select" className="block text-xs font-semibold">
                Format Jawaban
              </label>
              <select
                id="format-select"
                value={config.outputFormat}
                onChange={(e) =>
                  onChange({
                    ...config,
                    outputFormat: e.target.value as OutputFormatId,
                  })
                }
                className="min-h-[40px] w-full border px-3 py-2 text-sm"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  borderColor: "var(--border-strong)",
                  borderRadius: "var(--radius-control)",
                }}
              >
                <option value="conversational">Percakapan Mengalir</option>
                <option value="structured-bullet">Poin Terstruktur</option>
                <option value="code-focused">Fokus Blok Kode</option>
              </select>
            </div>
          </div>

          <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Mesin AI aktif:{" "}
            <span className="font-mono font-semibold" style={{ color: "var(--text-primary)" }}>
              gemini-4-hydrogen
            </span>{" "}
            (cepat, efisien, mendukung ThinkingLevel MEDIUM, HIGH, hingga XHIGH).
          </p>

          {/* Guardrail Rules */}
          <div
            className="space-y-3 border-t pt-4"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <label htmlFor="new-rule-input" className="block text-xs font-semibold">
              Aturan Batasan (Guardrails)
            </label>
            <div className="flex gap-2">
              <input
                id="new-rule-input"
                type="text"
                value={newRule}
                onChange={(e) => setNewRule(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addRule();
                  }
                }}
                placeholder="Tambah aturan baru..."
                className="min-h-[40px] flex-1 border px-3 py-2 text-sm"
                style={{
                  backgroundColor: "var(--bg-canvas)",
                  borderColor: "var(--border-subtle)",
                  borderRadius: "var(--radius-control)",
                }}
              />
              <button
                type="button"
                onClick={addRule}
                className="inline-flex min-h-[40px] shrink-0 items-center gap-1 px-3 py-2 text-xs font-semibold"
                style={{
                  backgroundColor: "var(--accent)",
                  color: "var(--accent-contrast)",
                  borderRadius: "var(--radius-control)",
                }}
              >
                <Plus className="h-4 w-4" />
                <span>Tambah</span>
              </button>
            </div>

            <ul className="space-y-2">
              {config.rules.map((rule, idx) => (
                <li
                  key={idx}
                  className="flex items-start justify-between gap-2 border px-3 py-2 text-xs leading-relaxed"
                  style={{
                    backgroundColor: "var(--bg-canvas)",
                    borderColor: "var(--border-subtle)",
                    borderRadius: "var(--radius-control)",
                  }}
                >
                  <span>{rule}</span>
                  <button
                    type="button"
                    onClick={() => removeRule(idx)}
                    className="shrink-0 p-1 opacity-70 hover:opacity-100"
                    aria-label="Hapus aturan"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Right: Compiled System Prompt & Live Code Generator */}
        <section className="space-y-6 lg:col-span-7">
          <div
            className="border p-6"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-subtle)",
              borderRadius: "var(--radius-card)",
            }}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-bold">
                  System Prompt Tersusun (Siap Dikirim ke Gemini)
                </h2>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Instruksi ini menuntun perilaku AI sebelum pesan pengguna dibaca.
                </p>
              </div>

              <button
                type="button"
                onClick={copyCompiledPrompt}
                className="inline-flex min-h-[36px] shrink-0 items-center gap-1.5 border px-3 py-1.5 text-xs font-medium"
                style={{
                  borderColor: "var(--border-strong)",
                  borderRadius: "var(--radius-control)",
                }}
              >
                {promptCopied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Salin Prompt</span>
                  </>
                )}
              </button>
            </div>

            <pre
              className="max-h-60 overflow-y-auto whitespace-pre-wrap border p-4 font-mono text-xs leading-relaxed"
              style={{
                backgroundColor: "var(--bg-canvas)",
                borderColor: "var(--border-subtle)",
                borderRadius: "var(--radius-control)",
                color: "var(--text-secondary)",
              }}
            >
              {compiledPrompt}
            </pre>
          </div>

          {/* Code Generator Tabs */}
          <div
            className="space-y-4 border p-6"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-subtle)",
              borderRadius: "var(--radius-card)",
            }}
          >
            <div className="space-y-2">
              <h2 className="font-display text-base font-bold">
                Generator Kode Integrasi Siap Pakai
              </h2>
              <div
                className="flex flex-wrap gap-1 p-1"
                style={{
                  backgroundColor: "var(--bg-surface-muted)",
                  borderRadius: "var(--radius-control)",
                }}
                role="tablist"
                aria-label="Pilih file kode"
              >
                {CODE_TABS.map((tab) => {
                  const active = codeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setCodeTab(tab.id)}
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

            <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {activeCode.description}
            </p>

            <CodeBlock
              code={activeCode.code}
              language={activeCode.language}
              title={activeCode.title}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
