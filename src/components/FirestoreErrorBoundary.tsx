import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { HelperBrandLogo } from "./ClaudeMark";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class FirestoreErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: "",
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || "Terjadi kesalahan pada aplikasi.",
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("HELPER AI. ErrorBoundary:", error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      let friendlyText =
        "Terjadi kendala saat menyinkronkan sesi atau menampilkan ruang kerja.";
      if (this.state.errorMessage.includes("permission-denied")) {
        friendlyText =
          "Akses data cloud ditolak oleh aturan keamanan. Silakan masuk ulang dengan akun Anda atau muat ulang halaman.";
      }

      return (
        <div
          className="flex min-h-[100dvh] items-center justify-center p-6"
          style={{
            backgroundColor: "var(--bg-canvas)",
            color: "var(--text-primary)",
          }}
        >
          <div
            className="w-full max-w-md space-y-4 border p-6 text-center shadow-lg"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-strong)",
              borderRadius: "var(--radius-card)",
            }}
          >
            <div className="flex justify-center">
              <HelperBrandLogo size="md" showWordmark />
            </div>
            <div className="flex items-center justify-center gap-2 text-rose-500">
              <AlertTriangle className="h-5 w-5" />
              <h1 className="font-display text-lg font-bold">
                Pemulihan Sesi Diperlukan
              </h1>
            </div>
            <p
              className="text-xs leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              {friendlyText}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 px-4 py-2 text-xs font-semibold"
              style={{
                background: "var(--accent-gradient)",
                backgroundColor: "var(--accent)",
                color: "var(--accent-contrast)",
                borderRadius: "var(--radius-control)",
              }}
            >
              <RotateCcw className="h-4 w-4" />
              <span>Muat Ulang HELPER AI.</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
