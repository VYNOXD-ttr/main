import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Cloud,
  KeyRound,
  LogIn,
  ShieldCheck,
  Smartphone,
  UserPlus,
} from "lucide-react";
import { useState } from "react";
import { HelperBrandLogo, ThemeToggleTabs } from "./ClaudeMark";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { PWAInstallButton } from "./PWAInstallBanner";

interface AuthWelcomeScreenProps {
  isDark: boolean;
  onChangeThemeMode: (mode: "light" | "dark") => void;
  googleAuthLoading: boolean;
  googleAuthError: string | null;
  onLoginEmail: (email: string, password: string) => Promise<void>;
  onRegisterEmail: (
    displayName: string,
    email: string,
    password: string,
  ) => Promise<void>;
  onSignInGoogle: () => Promise<void>;
  onContinueAsGuest: () => void;
}

export function AuthWelcomeScreen({
  isDark,
  onChangeThemeMode,
  googleAuthLoading,
  googleAuthError,
  onLoginEmail,
  onRegisterEmail,
  onSignInGoogle,
  onContinueAsGuest,
}: AuthWelcomeScreenProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setFormError(null);
    setBusy(true);
    try {
      if (mode === "register") {
        await onRegisterEmail(displayName, email, password);
      } else {
        await onLoginEmail(email, password);
      }
      setPassword("");
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Gagal memproses autentikasi akun.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="claude-hero-atmosphere flex min-h-[100dvh] w-full flex-col overflow-y-auto px-4 py-5 pb-safe sm:px-8 sm:py-8"
      style={{
        backgroundColor: "var(--bg-canvas)",
        color: "var(--text-primary)",
      }}
    >
      {/* Top Bar: Brand Wordmark + Install PWA + Theme Switch */}
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 pb-6">
        <HelperBrandLogo size="sm" showWordmark />
        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <PWAInstallButton compact />
          </div>
          <ThemeToggleTabs isDark={isDark} onChangeMode={onChangeThemeMode} />
        </div>
      </header>

      {/* Main Split Content */}
      <main className="mx-auto my-auto grid w-full max-w-5xl grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-12">
        {/* Left: Editorial Value Prop */}
        <section className="space-y-6 lg:col-span-6">
          <div className="flex items-center gap-4">
            <HelperBrandLogo size="lg" />
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--accent)" }}
              >
                Ruang Kerja AI Lintas Perangkat
              </p>
              <h1 className="headline-balance font-editorial mt-1 text-3xl font-medium tracking-tight sm:text-4xl">
                Satu akun untuk laptop &amp; handphone.
              </h1>
            </div>
          </div>

          <p
            className="max-w-xl text-sm leading-relaxed sm:text-base"
            style={{ color: "var(--text-secondary)" }}
          >
            Masuk sekali saja dan sesi Anda tetap aktif selamanya. Seluruh riwayat
            percakapan, artefak kode/3D, daftar tugas, dan dompet{" "}
            <span className="font-mono font-semibold tabular-nums">
              100 Juta
            </span>{" "}
            kredit otomatis tersinkron antar perangkat.
          </p>

          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {[
              {
                icon: Cloud,
                title: "Sinkronisasi Cloud Selamanya",
                desc: "Login dengan akun yang sama di browser mana pun—riwayat chat & kuota kredit langsung ikut.",
              },
              {
                icon: Smartphone,
                title: "Siap Mobile & Layar Penuh",
                desc: "Navigasi bawah nyaman di jari dan dapat dipasang langsung ke Layar Utama HP Android & iPhone.",
              },
              {
                icon: ShieldCheck,
                title: "Agen Google Workspace & Mode Ultra Hemat",
                desc: "Kelola Calendar, Gmail, Tasks, Drive dengan konfirmasi wajib serta hemat kredit 0,25×.",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <li
                  key={item.title}
                  className="flex items-start gap-3 border p-3.5"
                  style={{
                    backgroundColor: "var(--bg-surface)",
                    borderColor: "var(--border-subtle)",
                    borderRadius: "var(--radius-control)",
                  }}
                >
                  <span
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center"
                    style={{
                      backgroundColor: "var(--accent-soft)",
                      color: "var(--accent)",
                      borderRadius: "var(--radius-control)",
                    }}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold">{item.title}</div>
                    <p
                      className="mt-0.5 text-xs leading-relaxed"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {item.desc}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Right: Auth Card + Guest Option */}
        <section className="lg:col-span-6">
          <div
            className="claude-enter border p-5 shadow-xl sm:p-7"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-strong)",
              borderRadius: "var(--radius-card)",
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-lg font-bold tracking-tight sm:text-xl">
                  {mode === "login"
                    ? "Masuk ke HELPER AI."
                    : "Buat Akun Baru"}
                </h2>
                <p
                  className="mt-0.5 text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {mode === "login"
                    ? "Lanjutkan pekerjaan Anda di perangkat ini"
                    : "Simpan riwayat obrolan & 100 Juta kredit di cloud"}
                </p>
              </div>
              <CheckCircle2
                className="h-5 w-5 shrink-0"
                style={{ color: "var(--accent)" }}
                aria-hidden="true"
              />
            </div>

            {/* Mode Switcher */}
            <div
              className="mt-5 grid grid-cols-2 gap-1 p-1"
              style={{
                backgroundColor: "var(--bg-surface-muted)",
                borderRadius: "var(--radius-control)",
              }}
              role="tablist"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === "login"}
                onClick={() => {
                  setMode("login");
                  setFormError(null);
                }}
                className="inline-flex min-h-[40px] items-center justify-center gap-1.5 text-xs font-semibold transition-colors"
                style={{
                  borderRadius: "calc(var(--radius-control) - 2px)",
                  backgroundColor:
                    mode === "login" ? "var(--bg-surface)" : "transparent",
                  color:
                    mode === "login"
                      ? "var(--text-primary)"
                      : "var(--text-muted)",
                }}
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Masuk</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={mode === "register"}
                onClick={() => {
                  setMode("register");
                  setFormError(null);
                }}
                className="inline-flex min-h-[40px] items-center justify-center gap-1.5 text-xs font-semibold transition-colors"
                style={{
                  borderRadius: "calc(var(--radius-control) - 2px)",
                  backgroundColor:
                    mode === "register" ? "var(--bg-surface)" : "transparent",
                  color:
                    mode === "register"
                      ? "var(--text-primary)"
                      : "var(--text-muted)",
                }}
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Daftar Baru</span>
              </button>
            </div>

            <form
              onSubmit={(e) => void handleSubmit(e)}
              className="mt-4 space-y-3.5"
            >
              {mode === "register" ? (
                <div className="space-y-1">
                  <label className="block text-xs font-semibold">
                    Nama Tampilan
                  </label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Contoh: Arkananta"
                    className="min-h-[44px] w-full border px-3.5 py-2 text-sm focus:outline-none"
                    style={{
                      backgroundColor: "var(--bg-canvas)",
                      borderColor: "var(--border-strong)",
                      borderRadius: "var(--radius-control)",
                    }}
                  />
                </div>
              ) : null}

              <div className="space-y-1">
                <label className="block text-xs font-semibold">Email</label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="min-h-[44px] w-full border px-3.5 py-2 text-sm focus:outline-none"
                  style={{
                    backgroundColor: "var(--bg-canvas)",
                    borderColor: "var(--border-strong)",
                    borderRadius: "var(--radius-control)",
                  }}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold">Kata Sandi</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete={
                    mode === "register" ? "new-password" : "current-password"
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="min-h-[44px] w-full border px-3.5 py-2 text-sm focus:outline-none"
                  style={{
                    backgroundColor: "var(--bg-canvas)",
                    borderColor: "var(--border-strong)",
                    borderRadius: "var(--radius-control)",
                  }}
                />
              </div>

              {formError ? (
                <div
                  className="flex items-start gap-2 border px-3 py-2.5 text-xs leading-relaxed text-rose-600 dark:text-rose-400"
                  style={{
                    backgroundColor: "var(--bg-surface-muted)",
                    borderColor: "var(--border-strong)",
                    borderRadius: "var(--radius-control)",
                  }}
                  role="alert"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={busy}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{
                  background: "var(--accent-gradient)",
                  backgroundColor: "var(--accent)",
                  color: "var(--accent-contrast)",
                  borderRadius: "var(--radius-control)",
                }}
              >
                <KeyRound className="h-4 w-4" />
                <span>
                  {busy
                    ? "Menyambungkan Akun..."
                    : mode === "login"
                      ? "Masuk & Sinkronkan"
                      : "Buat Akun & Masuk"}
                </span>
              </button>
            </form>

            {/* Google Sign-In & Guest Gate */}
            <div
              className="mt-5 space-y-3 border-t pt-4"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <GoogleSignInButton
                  loading={googleAuthLoading}
                  onClick={() => void onSignInGoogle()}
                />

                <button
                  type="button"
                  onClick={onContinueAsGuest}
                  className="inline-flex min-h-[44px] items-center justify-center gap-1.5 border px-4 py-2 text-xs font-semibold whitespace-nowrap transition-opacity hover:opacity-80"
                  style={{
                    borderColor: "var(--border-strong)",
                    backgroundColor: "var(--bg-canvas)",
                    borderRadius: "var(--radius-control)",
                  }}
                >
                  <span>Lanjutkan sebagai Tamu</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {googleAuthError ? (
                <div
                  className="flex items-start gap-2 border px-3 py-2 text-xs leading-relaxed text-rose-600 dark:text-rose-400"
                  style={{
                    backgroundColor: "var(--bg-surface-muted)",
                    borderColor: "var(--border-strong)",
                    borderRadius: "var(--radius-control)",
                  }}
                  role="alert"
                >
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{googleAuthError}</span>
                </div>
              ) : null}

              <div className="flex items-center justify-between gap-2 pt-1 sm:hidden">
                <PWAInstallButton compact />
                <span
                  className="text-[11px]"
                  style={{ color: "var(--text-muted)" }}
                >
                  Mode Tamu tersimpan lokal
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
