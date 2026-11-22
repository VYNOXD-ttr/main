import { Download, Share, Smartphone, WifiOff, X } from "lucide-react";
import { useState } from "react";
import { useOnlineStatus, usePWAInstall } from "../hooks/usePWAInstall";

interface PWAInstallButtonProps {
  compact?: boolean;
}

export function PWAInstallButton({ compact = false }: PWAInstallButtonProps) {
  const { canNativeInstall, isStandalone, isIOS, triggerInstall } =
    usePWAInstall();
  const [iosGuideOpen, setIosGuideOpen] = useState(false);

  if (isStandalone) {
    return (
      <span
        className="inline-flex min-h-[38px] items-center gap-1.5 border px-3 py-1.5 text-xs font-semibold"
        style={{
          borderColor: "var(--border-subtle)",
          backgroundColor: "var(--bg-canvas)",
          color: "var(--accent)",
          borderRadius: "var(--radius-control)",
        }}
      >
        <Smartphone className="h-3.5 w-3.5 shrink-0" />
        <span>Terpasang di Perangkat</span>
      </span>
    );
  }

  const handleClick = async () => {
    if (canNativeInstall) {
      await triggerInstall();
    } else {
      setIosGuideOpen(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void handleClick()}
        className="inline-flex min-h-[42px] items-center justify-center gap-2 border px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-opacity hover:opacity-85"
        style={{
          borderColor: "var(--border-strong)",
          backgroundColor: "var(--bg-surface)",
          color: "var(--text-primary)",
          borderRadius: "var(--radius-control)",
        }}
      >
        {isIOS && !canNativeInstall ? (
          <Share className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--accent)" }} />
        ) : (
          <Download className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--accent)" }} />
        )}
        <span>
          {compact
            ? "Pasang di HP"
            : canNativeInstall
              ? "Pasang Aplikasi di HP"
              : isIOS
                ? "Pasang di iPhone / iPad"
                : "Cara Pasang di HP"}
        </span>
      </button>

      {iosGuideOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-guide-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIosGuideOpen(false);
          }}
        >
          <div
            className="claude-enter w-full max-w-md border p-5 shadow-2xl"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-strong)",
              borderRadius: "var(--radius-card)",
              color: "var(--text-primary)",
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Smartphone
                  className="h-5 w-5 shrink-0"
                  style={{ color: "var(--accent)" }}
                />
                <h3
                  id="pwa-install-guide-title"
                  className="font-display text-base font-bold"
                >
                  Pasang HELPER AI. di Handphone
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setIosGuideOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center border hover:opacity-75"
                style={{
                  borderColor: "var(--border-subtle)",
                  borderRadius: "var(--radius-control)",
                }}
                aria-label="Tutup panduan instalasi"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div
              className="mt-4 space-y-3 text-xs leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              {isIOS ? (
                <ol className="list-decimal space-y-2 pl-4">
                  <li>
                    Buka situs ini di browser <strong>Safari</strong> pada iPhone
                    atau iPad Anda.
                  </li>
                  <li>
                    Ketuk ikon <strong>Bagikan (Share)</strong> di bilah bawah
                    Safari.
                  </li>
                  <li>
                    Gulir ke bawah lalu pilih{" "}
                    <strong>Tambahkan ke Layar Utama (Add to Home Screen)</strong>,
                    kemudian ketuk <strong>Tambah</strong>.
                  </li>
                </ol>
              ) : (
                <ol className="list-decimal space-y-2 pl-4">
                  <li>
                    Buka situs ini lewat browser <strong>Google Chrome</strong>{" "}
                    di HP Android Anda.
                  </li>
                  <li>
                    Ketuk ikon menu <strong>⋮ (tiga titik)</strong> di pojok kanan
                    atas browser.
                  </li>
                  <li>
                    Pilih <strong>Tambahkan ke Layar Utama</strong> atau{" "}
                    <strong>Instal aplikasi</strong> untuk membukanya dalam mode
                    layar penuh seperti aplikasi native.
                  </li>
                </ol>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIosGuideOpen(false)}
              className="mt-5 inline-flex min-h-[42px] w-full items-center justify-center px-4 py-2 text-xs font-semibold"
              style={{
                background: "var(--accent-gradient)",
                backgroundColor: "var(--accent)",
                color: "var(--accent-contrast)",
                borderRadius: "var(--radius-control)",
              }}
            >
              Mengerti
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function OfflineStatusBanner() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      className="flex shrink-0 items-center justify-center gap-2 border-b px-3 py-1.5 text-center text-xs font-medium"
      style={{
        backgroundColor: "var(--accent-soft)",
        borderColor: "var(--accent)",
        color: "var(--accent)",
      }}
      role="status"
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0" />
      <span>
        Mode Offline aktif · Riwayat &amp; tugas tetap terbaca, balasan AI butuh
        internet.
      </span>
    </div>
  );
}
