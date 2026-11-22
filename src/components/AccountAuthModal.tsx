import { AlertCircle, KeyRound, LogIn, UserPlus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { HelperBrandLogo } from "./ClaudeMark";
import { GoogleSignInButton } from "./GoogleSignInButton";

interface AccountAuthModalProps {
  open: boolean;
  initialMode?: "login" | "register";
  googleAuthLoading: boolean;
  googleAuthError: string | null;
  onClose: () => void;
  onLoginEmail: (email: string, password: string) => Promise<void>;
  onRegisterEmail: (
    displayName: string,
    email: string,
    password: string,
  ) => Promise<void>;
  onSignInGoogle: () => Promise<void>;
}

export function AccountAuthModal({
  open,
  initialMode = "login",
  googleAuthLoading,
  googleAuthError,
  onClose,
  onLoginEmail,
  onRegisterEmail,
  onSignInGoogle,
}: AccountAuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setFormError(null);
    }
  }, [open, initialMode]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

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
      onClose();
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="claude-enter w-full max-w-md border p-5 shadow-2xl sm:p-6"
        style={{
          backgroundColor: "var(--bg-surface)",
          borderColor: "var(--border-strong)",
          borderRadius: "var(--radius-card)",
          color: "var(--text-primary)",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <HelperBrandLogo size="md" />
            <div>
              <h2
                id="auth-modal-title"
                className="font-display text-lg font-bold tracking-tight"
              >
                {mode === "login"
                  ? "Masuk ke HELPER AI."
                  : "Daftar Akun HELPER AI."}
              </h2>
              <p
                className="text-xs"
                style={{ color: "var(--text-secondary)" }}
              >
                Sinkronkan dompet 100 Juta kredit &amp; riwayat lintas perangkat
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center border hover:opacity-75"
            style={{
              borderColor: "var(--border-subtle)",
              borderRadius: "var(--radius-control)",
            }}
            aria-label="Tutup dialog login"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
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

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-3.5">
          {mode === "register" ? (
            <div className="space-y-1">
              <label className="block text-xs font-semibold">Nama Tampilan</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Contoh: Arkananta"
                className="min-h-[44px] w-full border px-3 py-2 text-sm focus:outline-none"
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
              className="min-h-[44px] w-full border px-3 py-2 text-sm focus:outline-none"
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
              className="min-h-[44px] w-full border px-3 py-2 text-sm focus:outline-none"
              style={{
                backgroundColor: "var(--bg-canvas)",
                borderColor: "var(--border-strong)",
                borderRadius: "var(--radius-control)",
              }}
            />
          </div>

          {formError ? (
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
              <span>{formError}</span>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 px-4 py-2 text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{
              background: "var(--accent-gradient)",
              backgroundColor: "var(--accent)",
              color: "var(--accent-contrast)",
              borderRadius: "var(--radius-control)",
            }}
          >
            <KeyRound className="h-3.5 w-3.5" />
            <span>
              {busy
                ? "Memproses..."
                : mode === "login"
                  ? "Masuk & Sinkronkan"
                  : "Buat Akun & Masuk"}
            </span>
          </button>
        </form>

        <div
          className="mt-5 space-y-3 border-t pt-4"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className="text-[11px] font-medium"
              style={{ color: "var(--text-muted)" }}
            >
              Atau masuk cepat dengan akun Google:
            </span>
          </div>

          <div className="flex justify-start">
            <GoogleSignInButton
              loading={googleAuthLoading}
              onClick={() => void onSignInGoogle()}
            />
          </div>

          {googleAuthError ? (
            <div
              className="flex items-start gap-2 border px-3 py-2 text-[11px] leading-relaxed text-rose-600 dark:text-rose-400"
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
        </div>
      </div>
    </div>
  );
}
