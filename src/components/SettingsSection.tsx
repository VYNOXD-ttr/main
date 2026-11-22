import {
  BookOpen,
  Cloud,
  Code2,
  Cpu,
  LogOut,
  MessageSquare,
  Palette,
  RotateCcw,
  Scale,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { ACCENT_OPTIONS, THEME_PRESETS } from "../data/presetsAndProviders";
import type {
  AccentId,
  AssistantConfig,
  FontScaleId,
  RadiusScaleId,
  SettingsTabId,
  ThemePreferences,
  ThemePresetId,
  TokenUsageStats,
} from "../types/app";
import { CREDIT_LIMIT_PER_USER, formatCompactCredits } from "../utils/creditQuota";
import { ApiComparisonSection } from "./ApiComparisonSection";
import { HelperBrandLogo } from "./ClaudeMark";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { GuideSection } from "./GuideSection";
import { PromptStudioSection } from "./PromptStudioSection";
import { PWAInstallButton } from "./PWAInstallBanner";

interface SettingsSectionProps {
  activeSubTab: SettingsTabId;
  onSelectSubTab: (tab: SettingsTabId) => void;
  assistantConfig: AssistantConfig;
  onChangeAssistantConfig: (next: AssistantConfig) => void;
  themePreferences: ThemePreferences;
  onChangeThemePreferences: (next: ThemePreferences) => void;
  onResetTheme: () => void;
  onBackToChat: () => void;
  activeUserEmail: string | null;
  activeUserName: string | null;
  isCloudSynced: boolean;
  googleUserEmail: string | null;
  googleUserName: string | null;
  googleAuthLoading: boolean;
  googleAuthError: string | null;
  onOpenAuthModal: () => void;
  onSignOutAll: () => void;
  onSignInGoogle: () => void;
  tokenUsage: TokenUsageStats;
  onResetTokenUsage: () => void;
}

const SETTINGS_TABS: Array<{
  id: SettingsTabId;
  label: string;
  icon: typeof Code2;
}> = [
  { id: "workspace", label: "Agent & Google", icon: Cpu },
  { id: "studio", label: "Studio Prompt", icon: Code2 },
  { id: "guide", label: "Panduan", icon: BookOpen },
  { id: "compare", label: "Perbandingan API", icon: Scale },
  { id: "appearance", label: "Tampilan", icon: Palette },
];

const FONT_SCALES: Array<{ id: FontScaleId; label: string }> = [
  { id: "compact", label: "Ringkas" },
  { id: "standard", label: "Standar" },
  { id: "relaxed", label: "Lega" },
];

const RADIUS_SCALES: Array<{ id: RadiusScaleId; label: string }> = [
  { id: "sharp", label: "Tegas" },
  { id: "balanced", label: "Seimbang" },
  { id: "soft", label: "Lembut" },
];

const WORKSPACE_SERVICES = [
  {
    name: "Google Calendar",
    scopeNote: "Baca agenda kerja & usulkan jadwal rapat baru",
  },
  {
    name: "Gmail",
    scopeNote: "Baca/cari email masuk & siapkan draf atau kirim balasan",
  },
  {
    name: "Google Tasks",
    scopeNote: "Pantau tugas tertunda & sinkronkan daftar pekerjaan",
  },
  {
    name: "Google Drive",
    scopeNote: "Cari file kerja, baca dokumen teks & buat Google Docs baru",
  },
];

export function SettingsSection({
  activeSubTab,
  onSelectSubTab,
  assistantConfig,
  onChangeAssistantConfig,
  themePreferences,
  onChangeThemePreferences,
  onResetTheme,
  onBackToChat,
  activeUserEmail,
  activeUserName,
  isCloudSynced,
  googleUserEmail,
  googleUserName,
  googleAuthLoading,
  googleAuthError,
  onOpenAuthModal,
  onSignOutAll,
  onSignInGoogle,
  tokenUsage,
  onResetTokenUsage,
}: SettingsSectionProps) {
  const isCurrentDark =
    THEME_PRESETS.find((t) => t.id === themePreferences.preset)?.isDark ?? false;

  const updateThemeField = <K extends keyof ThemePreferences>(
    key: K,
    value: ThemePreferences[K],
  ) => {
    onChangeThemePreferences({ ...themePreferences, [key]: value });
  };

  const toggleConfigField = (
    field:
      | "ultraSaverMode"
      | "tokenSaverMode"
      | "agentWebSearchEnabled"
      | "dailyToolsEnabled"
      | "codingSkillEnabled"
      | "threejsSkillEnabled",
  ) => {
    const currentValue =
      field === "ultraSaverMode"
        ? assistantConfig.ultraSaverMode !== false
        : assistantConfig[field];
    onChangeAssistantConfig({
      ...assistantConfig,
      [field]: !currentValue,
    });
  };

  const creditLimit = tokenUsage.creditLimit || CREDIT_LIMIT_PER_USER;
  const creditsRemaining = Math.max(0, creditLimit - (tokenUsage.creditsUsed || 0));
  const remainingPercent = Math.max(
    0,
    Math.min(100, (creditsRemaining / creditLimit) * 100),
  );
  const isUltraActive = assistantConfig.ultraSaverMode !== false;

  return (
    <div className="space-y-8">
      {/* Unified Settings Header & Sub-Tab Navigation */}
      <div
        className="space-y-5 border-b pb-5"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="space-y-1">
            <h1 className="headline-balance font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Pengaturan AI, Agent &amp; Referensi
            </h1>
            <p
              className="max-w-2xl text-sm leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              Tautkan Google Workspace untuk kemampuan AI Agent, aktifkan Mode Hemat
              Token Free Tier, atur Studio Prompt, hingga sesuaikan tampilan kerja.
            </p>
          </div>

          <button
            type="button"
            onClick={onBackToChat}
            className="inline-flex min-h-[40px] shrink-0 items-center gap-2 border px-4 py-2 text-xs font-semibold whitespace-nowrap transition-opacity hover:opacity-80"
            style={{
              borderColor: "var(--border-strong)",
              backgroundColor: "var(--bg-surface)",
              color: "var(--text-primary)",
              borderRadius: "var(--radius-control)",
            }}
          >
            <MessageSquare className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
            <span>Kembali ke Asisten Chat</span>
          </button>
        </div>

        <div
          className="flex max-w-full items-center gap-1 overflow-x-auto p-1 sm:inline-flex sm:flex-wrap"
          style={{
            backgroundColor: "var(--bg-surface-muted)",
            borderRadius: "var(--radius-control)",
          }}
          role="tablist"
          aria-label="Submenu Pengaturan"
        >
          {SETTINGS_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onSelectSubTab(tab.id)}
                className="inline-flex min-h-[38px] shrink-0 items-center gap-2 px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-colors"
                style={{
                  borderRadius: "var(--radius-control)",
                  backgroundColor: active ? "var(--bg-surface)" : "transparent",
                  color: active ? "var(--text-primary)" : "var(--text-muted)",
                }}
              >
                <Icon
                  className="h-3.5 w-3.5 shrink-0"
                  style={{
                    color: active ? "var(--accent)" : "var(--text-muted)",
                  }}
                />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Sub-Tab Content */}
      {activeSubTab === "workspace" ? (
        <div className="space-y-6">
          {/* Firebase Cross-Device Cloud Account Card */}
          <section
            className="flex flex-col justify-between gap-4 border p-5 sm:flex-row sm:items-center sm:p-6"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-subtle)",
              borderRadius: "var(--radius-card)",
            }}
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Cloud className="h-4 w-4 shrink-0" style={{ color: "var(--accent)" }} />
                <h2 className="font-display text-lg font-bold">
                  Akun &amp; Sinkronisasi Cloud
                </h2>
              </div>
              <p
                className="max-w-2xl text-sm leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                {isCloudSynced && activeUserEmail
                  ? `Masuk sebagai ${activeUserName || activeUserEmail} (${activeUserEmail}). Riwayat chat, tugas, catatan, dan dompet 100 Juta kredit tersimpan selamanya di Cloud Firestore dan otomatis ikut saat login di HP maupun laptop.`
                  : "Anda sedang dalam Mode Tamu (tersimpan lokal di browser ini). Masuk dengan Email atau Google untuk menyimpan sesi selamanya lintas perangkat."}
              </p>
            </div>

            {isCloudSynced ? (
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={onOpenAuthModal}
                  className="inline-flex min-h-[40px] items-center border px-3.5 py-2 text-xs font-semibold whitespace-nowrap hover:opacity-80"
                  style={{
                    borderColor: "var(--border-strong)",
                    borderRadius: "var(--radius-control)",
                  }}
                >
                  Ganti Akun
                </button>
                <button
                  type="button"
                  onClick={onSignOutAll}
                  disabled={googleAuthLoading}
                  className="inline-flex min-h-[40px] items-center gap-1.5 border px-3.5 py-2 text-xs font-semibold whitespace-nowrap hover:opacity-80 disabled:opacity-50"
                  style={{
                    borderColor: "var(--border-strong)",
                    borderRadius: "var(--radius-control)",
                  }}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Keluar Akun</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={onOpenAuthModal}
                  className="inline-flex min-h-[42px] shrink-0 items-center gap-2 px-4 py-2 text-xs font-semibold whitespace-nowrap transition-opacity hover:opacity-90"
                  style={{
                    background: "var(--accent-gradient)",
                    backgroundColor: "var(--accent)",
                    color: "var(--accent-contrast)",
                    borderRadius: "var(--radius-control)",
                  }}
                >
                  <span>Masuk / Daftar Akun</span>
                </button>
                <button
                  type="button"
                  onClick={onSignOutAll}
                  className="inline-flex min-h-[42px] items-center border px-3.5 py-2 text-xs font-semibold whitespace-nowrap hover:opacity-80"
                  style={{
                    borderColor: "var(--border-strong)",
                    borderRadius: "var(--radius-control)",
                  }}
                >
                  Layar Masuk
                </button>
              </div>
            )}
          </section>

          {/* Mobile PWA Installability Card */}
          <section
            className="flex flex-col justify-between gap-4 border p-5 sm:flex-row sm:items-center sm:p-6"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-subtle)",
              borderRadius: "var(--radius-card)",
            }}
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Smartphone
                  className="h-4 w-4 shrink-0"
                  style={{ color: "var(--accent)" }}
                />
                <h2 className="font-display text-lg font-bold">
                  Tampilan Handphone &amp; Pasang Aplikasi
                </h2>
              </div>
              <p
                className="max-w-2xl text-sm leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                Buka <span className="font-semibold">HELPER AI.</span> dari browser
                HP lalu pasang ke Layar Utama (Android Chrome / iPhone Safari)
                untuk pengalaman layar penuh layaknya aplikasi mobile native.
              </p>
            </div>

            <div className="shrink-0">
              <PWAInstallButton />
            </div>
          </section>

          {/* Google Workspace Integration Card */}
          <section
            className="space-y-5 border p-5 sm:p-6"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-subtle)",
              borderRadius: "var(--radius-card)",
            }}
          >
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="space-y-1">
                <h2 className="font-display text-lg font-bold">
                  Tautan Akun Google Workspace
                </h2>
                <p
                  className="max-w-2xl text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Izinkan AI Agent membaca jadwal, email, tugas, dan dokumen Drive
                  Anda. Setiap aksi membuat, mengubah, atau mengirim pesan tetap
                  meminta konfirmasi Anda secara eksplisit.
                </p>
              </div>

              {googleUserEmail ? (
                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-left sm:text-right">
                    <div className="text-xs font-semibold">
                      {googleUserName || "Akun Google Terhubung"}
                    </div>
                    <div
                      className="font-mono text-[11px]"
                      style={{ color: "var(--accent)" }}
                    >
                      {googleUserEmail}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onSignOutAll}
                    disabled={googleAuthLoading}
                    className="inline-flex min-h-[40px] items-center border px-3.5 py-2 text-xs font-semibold whitespace-nowrap hover:opacity-80 disabled:opacity-50"
                    style={{
                      borderColor: "var(--border-strong)",
                      borderRadius: "var(--radius-control)",
                    }}
                  >
                    Putuskan &amp; Keluar
                  </button>
                </div>
              ) : (
                <GoogleSignInButton
                  loading={googleAuthLoading}
                  onClick={onSignInGoogle}
                />
              )}
            </div>

            {googleAuthError ? (
              <div
                className="border px-3.5 py-2.5 text-xs text-rose-600 dark:text-rose-400"
                style={{
                  backgroundColor: "var(--bg-surface-muted)",
                  borderColor: "var(--border-strong)",
                  borderRadius: "var(--radius-control)",
                }}
                role="alert"
              >
                {googleAuthError}
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {WORKSPACE_SERVICES.map((svc) => (
                <div
                  key={svc.name}
                  className="border p-3.5"
                  style={{
                    backgroundColor: "var(--bg-canvas)",
                    borderColor: "var(--border-subtle)",
                    borderRadius: "var(--radius-control)",
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold">{svc.name}</span>
                    <span
                      className="text-[11px] font-semibold"
                      style={{
                        color: googleUserEmail
                          ? "var(--accent)"
                          : "var(--text-muted)",
                      }}
                    >
                      {googleUserEmail ? "Siap" : "Belum tertaut"}
                    </span>
                  </div>
                  <p
                    className="mt-1.5 text-[11px] leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {svc.scopeNote}
                  </p>
                </div>
              ))}
            </div>

            <div
              className="flex items-start gap-2.5 border-t pt-4 text-xs"
              style={{
                borderColor: "var(--border-subtle)",
                color: "var(--text-secondary)",
              }}
            >
              <ShieldCheck
                className="mt-0.5 h-4 w-4 shrink-0"
                style={{ color: "var(--accent)" }}
              />
              <span>
                Keamanan Token: Token akses Google OAuth hanya disimpan di memori
                sesi browser dan otomatis terhapus saat halaman dimuat ulang atau
                koneksi diputus.
              </span>
            </div>
          </section>

          {/* 100M Credit Wallet & Efficiency Banner */}
          <section
            className="space-y-4 border p-6"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-subtle)",
              borderRadius: "var(--radius-card)",
            }}
          >
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3.5">
                <HelperBrandLogo size="md" />
                <div>
                  <h2 className="font-display text-lg font-bold">
                    Dompet Kredit Pengguna (100 Juta)
                  </h2>
                  <p
                    className="text-xs leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Kuota{" "}
                    <span className="font-mono font-semibold tabular-nums">
                      100.000.000
                    </span>{" "}
                    kredit per pengguna · Tarif aktif:{" "}
                    <strong>
                      {isUltraActive
                        ? "0,25× (Mode Ultra Hemat)"
                        : "1× (Mode Standar)"}
                    </strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onResetTokenUsage}
                className="inline-flex min-h-[36px] shrink-0 items-center gap-1.5 border px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap hover:opacity-80"
                style={{
                  borderColor: "var(--border-strong)",
                  borderRadius: "var(--radius-control)",
                }}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Kuota &amp; Statistik</span>
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: "var(--text-secondary)" }}>
                  Sisa Kredit Tersedia
                </span>
                <span className="font-mono font-semibold tabular-nums">
                  {creditsRemaining.toLocaleString("id-ID")} /{" "}
                  {creditLimit.toLocaleString("id-ID")} (
                  {remainingPercent.toFixed(2)}%)
                </span>
              </div>
              <div
                className="h-2.5 w-full overflow-hidden rounded-full"
                style={{ backgroundColor: "var(--bg-surface-muted)" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-200"
                  style={{
                    width: `${remainingPercent}%`,
                    background:
                      remainingPercent <= 10
                        ? "#dc2626"
                        : remainingPercent <= 25
                          ? "#d97706"
                          : "var(--accent-gradient)",
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div
                className="border p-3.5"
                style={{
                  backgroundColor: "var(--bg-canvas)",
                  borderColor: "var(--border-subtle)",
                  borderRadius: "var(--radius-control)",
                }}
              >
                <div
                  className="text-[11px] font-medium"
                  style={{ color: "var(--text-muted)" }}
                >
                  Sisa Kredit ({activeUserEmail || activeUserName || "Profil Tamu"})
                </div>
                <div
                  className="mt-1 font-mono text-xl font-bold tabular-nums"
                  style={{ color: "var(--accent)" }}
                >
                  {formatCompactCredits(creditsRemaining)}
                </div>
              </div>

              <div
                className="border p-3.5"
                style={{
                  backgroundColor: "var(--bg-canvas)",
                  borderColor: "var(--border-subtle)",
                  borderRadius: "var(--radius-control)",
                }}
              >
                <div
                  className="text-[11px] font-medium"
                  style={{ color: "var(--text-muted)" }}
                >
                  Total Kredit Terpakai
                </div>
                <div className="mt-1 font-mono text-xl font-bold tabular-nums">
                  {(tokenUsage.creditsUsed || 0).toLocaleString("id-ID")}
                </div>
              </div>

              <div
                className="border p-3.5"
                style={{
                  backgroundColor: "var(--bg-canvas)",
                  borderColor: "var(--border-subtle)",
                  borderRadius: "var(--radius-control)",
                }}
              >
                <div
                  className="text-[11px] font-medium"
                  style={{ color: "var(--text-muted)" }}
                >
                  Kredit Dihemat Ultra Hemat
                </div>
                <div className="mt-1 font-mono text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  +{(tokenUsage.creditsSavedEstimated || 0).toLocaleString("id-ID")}
                </div>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Free-Tier Token Saver & Agent Controls */}
            <section
              className="space-y-4 border p-6"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-subtle)",
                borderRadius: "var(--radius-card)",
              }}
            >
              <div>
                <h2 className="font-display text-lg font-bold">
                  Mode Ultra Hemat &amp; Alat Agent
                </h2>
                <p
                  className="mt-1 text-xs leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Optimalkan penggunaan kredit pengguna dan kuota Free Tier Gemini
                  lewat pemangkasan blok kode lama serta instruksi adaptif.
                </p>
              </div>

              <div className="space-y-2.5">
                {[
                  {
                    field: "ultraSaverMode" as const,
                    title: "Mode Ultra Hemat (0,25× Tarif Kredit)",
                    desc: "Ringkas otomatis blok kode lama di riwayat, pangkas konteks ke 4 giliran terbaru, padatkan instruksi sistem, dan kurangi beban kredit per token.",
                  },
                  {
                    field: "tokenSaverMode" as const,
                    title: "Mode Hemat Token (Free Tier)",
                    desc: "Batasi tugas/catatan yang dikirim agar kuota Free Tier bertahan jauh lebih lama.",
                  },
                  {
                    field: "agentWebSearchEnabled" as const,
                    title: "Pencarian Web Google Search untuk Agent",
                    desc: "Izinkan AI Agent mencari informasi terbaru di web secara otomatis saat dibutuhkan.",
                  },
                  {
                    field: "dailyToolsEnabled" as const,
                    title: "Alat Tugas & Catatan Lokal",
                    desc: "Asisten dapat menambah tugas, menyelesaikan item, dan menyimpan catatan cepat.",
                  },
                  {
                    field: "codingSkillEnabled" as const,
                    title: "Keahlian Koding React & TypeScript",
                    desc: "Sertakan panduan arsitektur kode modular dan pratinjau Kanvas.",
                  },
                  {
                    field: "threejsSkillEnabled" as const,
                    title: "Keahlian 3D Three.js",
                    desc: "Aktifkan output HTML tunggal interaktif untuk adegan 3D di Kanvas.",
                  },
                ].map((item) => {
                  const enabled =
                    item.field === "ultraSaverMode"
                      ? assistantConfig.ultraSaverMode !== false
                      : assistantConfig[item.field];
                  return (
                    <button
                      key={item.field}
                      type="button"
                      onClick={() => toggleConfigField(item.field)}
                      className="flex w-full items-start justify-between gap-3 border p-3 text-left transition-colors"
                      style={{
                        borderRadius: "var(--radius-control)",
                        borderColor: enabled
                          ? "var(--accent)"
                          : "var(--border-subtle)",
                        backgroundColor: enabled
                          ? "var(--accent-soft)"
                          : "var(--bg-canvas)",
                      }}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold">{item.title}</div>
                        <p
                          className="mt-0.5 text-[11px] leading-relaxed"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {item.desc}
                        </p>
                      </div>
                      <span
                        className="shrink-0 font-mono text-[11px] font-semibold"
                        style={{
                          color: enabled ? "var(--accent)" : "var(--text-muted)",
                        }}
                      >
                        {enabled ? "AKTIF" : "NONAKTIF"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Real Gemini usageMetadata Token Counter */}
            <section
              className="flex flex-col justify-between space-y-5 border p-6"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-subtle)",
                borderRadius: "var(--radius-card)",
              }}
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg font-bold">
                      Penghitung Token Sesi &amp; Total
                    </h2>
                    <p
                      className="mt-1 text-xs leading-relaxed"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Dihitung langsung dari <span className="font-mono">usageMetadata</span>{" "}
                      asli setiap balasan Gemini API.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={onResetTokenUsage}
                    className="inline-flex min-h-[34px] shrink-0 items-center gap-1.5 border px-3 py-1.5 text-xs font-semibold whitespace-nowrap hover:opacity-80"
                    style={{
                      borderColor: "var(--border-strong)",
                      borderRadius: "var(--radius-control)",
                    }}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Reset Statistik</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div
                    className="border p-4"
                    style={{
                      backgroundColor: "var(--bg-canvas)",
                      borderColor: "var(--border-subtle)",
                      borderRadius: "var(--radius-control)",
                    }}
                  >
                    <div
                      className="text-[11px] font-medium"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Input Sesi Ini
                    </div>
                    <div className="mt-1 font-mono text-2xl font-bold tabular-nums">
                      {tokenUsage.sessionPromptTokens.toLocaleString("id-ID")}
                    </div>
                  </div>

                  <div
                    className="border p-4"
                    style={{
                      backgroundColor: "var(--bg-canvas)",
                      borderColor: "var(--border-subtle)",
                      borderRadius: "var(--radius-control)",
                    }}
                  >
                    <div
                      className="text-[11px] font-medium"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Output Sesi Ini
                    </div>
                    <div className="mt-1 font-mono text-2xl font-bold tabular-nums">
                      {tokenUsage.sessionOutputTokens.toLocaleString("id-ID")}
                    </div>
                  </div>

                  <div
                    className="border p-4"
                    style={{
                      backgroundColor: "var(--bg-canvas)",
                      borderColor: "var(--border-subtle)",
                      borderRadius: "var(--radius-control)",
                    }}
                  >
                    <div
                      className="text-[11px] font-medium"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Total Sesi Ini
                    </div>
                    <div
                      className="mt-1 font-mono text-2xl font-bold tabular-nums"
                      style={{ color: "var(--accent)" }}
                    >
                      {tokenUsage.sessionTotalTokens.toLocaleString("id-ID")}
                    </div>
                    <div
                      className="mt-0.5 font-mono text-[11px] tabular-nums"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {tokenUsage.sessionRequests} permintaan
                    </div>
                  </div>

                  <div
                    className="border p-4"
                    style={{
                      backgroundColor: "var(--bg-canvas)",
                      borderColor: "var(--border-subtle)",
                      borderRadius: "var(--radius-control)",
                    }}
                  >
                    <div
                      className="text-[11px] font-medium"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Akumulasi Tersimpan
                    </div>
                    <div className="mt-1 font-mono text-2xl font-bold tabular-nums">
                      {tokenUsage.allTimeTotalTokens.toLocaleString("id-ID")}
                    </div>
                    <div
                      className="mt-0.5 font-mono text-[11px] tabular-nums"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {tokenUsage.allTimeRequests} permintaan
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="border-t pt-3 text-xs leading-relaxed"
                style={{
                  borderColor: "var(--border-subtle)",
                  color: "var(--text-secondary)",
                }}
              >
                Catatan: Tidak ada penyedia AI resmi dengan kredit gratis tanpa
                batas. Mengaktifkan <strong>Mode Hemat Token</strong> serta
                menggunakan tingkat penalaran <strong>Kilat</strong> menjaga kuota
                Free Tier Anda bertahan jauh lebih lama.
              </div>
            </section>
          </div>
        </div>
      ) : null}

      {activeSubTab === "studio" ? (
        <PromptStudioSection
          config={assistantConfig}
          onChange={onChangeAssistantConfig}
          onLaunchSandbox={onBackToChat}
        />
      ) : null}

      {activeSubTab === "guide" ? (
        <GuideSection
          themePreferences={themePreferences}
          onNavigate={(target) => {
            if (target === "studio") {
              onSelectSubTab("studio");
            } else {
              onBackToChat();
            }
          }}
        />
      ) : null}

      {activeSubTab === "compare" ? <ApiComparisonSection /> : null}

      {activeSubTab === "appearance" ? (
        <div className="space-y-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-display text-xl font-bold">
                Tampilan &amp; Tema Workspace
              </h2>
              <p
                className="mt-1 text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                Seluruh preferensi tema, warna aksen, skala huruf, dan sudut kartu
                otomatis tersimpan di browser Anda.
              </p>
            </div>

            <button
              type="button"
              onClick={onResetTheme}
              className="inline-flex min-h-[38px] shrink-0 items-center gap-2 border px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-colors hover:opacity-80"
              style={{
                borderColor: "var(--border-strong)",
                borderRadius: "var(--radius-control)",
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Kembalikan Standar</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section
              className="space-y-4 border p-6"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-subtle)",
                borderRadius: "var(--radius-card)",
              }}
            >
              <h3 className="font-display text-base font-bold">Tema Kanvas</h3>
              <div className="grid grid-cols-2 gap-3">
                {THEME_PRESETS.map((preset) => {
                  const selected = themePreferences.preset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() =>
                        updateThemeField("preset", preset.id as ThemePresetId)
                      }
                      className="flex min-h-[44px] items-center gap-2.5 border px-3.5 py-2.5 text-left text-xs font-medium transition-colors"
                      style={{
                        borderRadius: "var(--radius-control)",
                        borderColor: selected
                          ? "var(--accent)"
                          : "var(--border-subtle)",
                        backgroundColor: selected
                          ? "var(--accent-soft)"
                          : "var(--bg-canvas)",
                      }}
                    >
                      <span
                        className="h-4 w-4 shrink-0 border"
                        style={{
                          backgroundColor: preset.canvasHex,
                          borderColor: "var(--border-strong)",
                          borderRadius: "999px",
                        }}
                        aria-hidden="true"
                      />
                      <span className="truncate">{preset.label}</span>
                    </button>
                  );
                })}
              </div>

              <div
                className="space-y-3 border-t pt-4"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                <h4 className="text-sm font-semibold">
                  Warna Aksen &amp; Lampu 3D
                </h4>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {ACCENT_OPTIONS.map((opt) => {
                    const selected = themePreferences.accent === opt.id;
                    const swatch = isCurrentDark
                      ? opt.darkSwatchHex
                      : opt.swatchHex;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          updateThemeField("accent", opt.id as AccentId)
                        }
                        className="flex min-h-[40px] items-center justify-between border px-3 py-2 text-xs font-medium transition-colors"
                        style={{
                          borderRadius: "var(--radius-control)",
                          borderColor: selected
                            ? "var(--accent)"
                            : "var(--border-subtle)",
                          backgroundColor: selected
                            ? "var(--accent-soft)"
                            : "var(--bg-canvas)",
                        }}
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className="h-3.5 w-3.5 shrink-0"
                            style={{
                              background: opt.gradientCss || swatch,
                              borderRadius: "999px",
                            }}
                            aria-hidden="true"
                          />
                          <span className="truncate">{opt.label}</span>
                        </span>
                        {selected ? (
                          <span
                            className="text-[11px] font-semibold"
                            style={{ color: "var(--accent)" }}
                          >
                            Aktif
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            <section
              className="space-y-6 border p-6"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-subtle)",
                borderRadius: "var(--radius-card)",
              }}
            >
              <div className="space-y-3">
                <h3 className="font-display text-base font-bold">
                  Skala Ukuran Teks
                </h3>
                <div
                  className="grid grid-cols-3 gap-1 p-1"
                  style={{
                    backgroundColor: "var(--bg-surface-muted)",
                    borderRadius: "var(--radius-control)",
                  }}
                >
                  {FONT_SCALES.map((scale) => {
                    const selected = themePreferences.fontScale === scale.id;
                    return (
                      <button
                        key={scale.id}
                        type="button"
                        onClick={() => updateThemeField("fontScale", scale.id)}
                        className="min-h-[38px] px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors"
                        style={{
                          borderRadius: "var(--radius-control)",
                          backgroundColor: selected
                            ? "var(--bg-surface)"
                            : "transparent",
                          color: selected
                            ? "var(--text-primary)"
                            : "var(--text-muted)",
                        }}
                      >
                        {scale.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div
                className="space-y-3 border-t pt-5"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                <h3 className="font-display text-base font-bold">
                  Gaya Lengkungan Sudut
                </h3>
                <div
                  className="grid grid-cols-3 gap-1 p-1"
                  style={{
                    backgroundColor: "var(--bg-surface-muted)",
                    borderRadius: "var(--radius-control)",
                  }}
                >
                  {RADIUS_SCALES.map((r) => {
                    const selected = themePreferences.radius === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => updateThemeField("radius", r.id)}
                        className="min-h-[38px] px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors"
                        style={{
                          borderRadius: "var(--radius-control)",
                          backgroundColor: selected
                            ? "var(--bg-surface)"
                            : "transparent",
                          color: selected
                            ? "var(--text-primary)"
                            : "var(--text-muted)",
                        }}
                      >
                        {r.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>
        </div>
      ) : null}
    </div>
  );
}
