import { Moon, Sun } from "lucide-react";

interface HelperBrandLogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  showWordmark?: boolean;
  layout?: "horizontal" | "stacked";
  className?: string;
}

const LOGO_SIZE_CLASSES: Record<
  NonNullable<HelperBrandLogoProps["size"]>,
  { box: string; radius: string; svg: string; title: string }
> = {
  xs: {
    box: "h-7 w-7",
    radius: "rounded-lg",
    svg: "h-7 w-7",
    title: "text-xs",
  },
  sm: {
    box: "h-8 w-8",
    radius: "rounded-lg",
    svg: "h-8 w-8",
    title: "text-sm",
  },
  md: {
    box: "h-10 w-10",
    radius: "rounded-xl",
    svg: "h-10 w-10",
    title: "text-base",
  },
  lg: {
    box: "h-14 w-14",
    radius: "rounded-2xl",
    svg: "h-14 w-14",
    title: "text-xl",
  },
  xl: {
    box: "h-16 w-16 sm:h-20 sm:w-20",
    radius: "rounded-2xl",
    svg: "h-16 w-16 sm:h-20 sm:w-20",
    title: "text-xl sm:text-2xl",
  },
};

export function HelperAiWordmark({
  size = "sm",
  className = "",
}: {
  size?: NonNullable<HelperBrandLogoProps["size"]>;
  className?: string;
}) {
  const spec = LOGO_SIZE_CLASSES[size];
  return (
    <span
      className={`font-display inline-flex items-baseline font-extrabold uppercase tracking-tight ${spec.title} ${className}`}
      style={{ color: "var(--text-primary)" }}
    >
      <span>HELPER AI</span>
      <span className="text-[#dc2626] dark:text-[#ef4444]">.</span>
    </span>
  );
}

export function HelperBrandLogo({
  size = "md",
  showWordmark = false,
  layout = "horizontal",
  className = "",
}: HelperBrandLogoProps) {
  const spec = LOGO_SIZE_CLASSES[size];
  const isHero = size === "lg" || size === "xl";

  return (
    <span
      className={`inline-flex items-center ${
        layout === "stacked" ? "flex-col gap-2.5 text-center" : "gap-2.5"
      } ${className}`}
    >
      <span
        className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden ${spec.box} ${spec.radius} ${
          isHero ? "brand-emblem-glow p-[1.5px]" : "border"
        }`}
        style={
          isHero
            ? {
                background:
                  "linear-gradient(135deg, #dc2626 0%, #d97757 55%, #1a1918 100%)",
              }
            : {
                backgroundColor: "#0b0b0b",
                borderColor: "rgba(220, 38, 38, 0.35)",
              }
        }
      >
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`h-full w-full ${isHero ? "rounded-[calc(1rem-2px)]" : ""}`}
          role="img"
          aria-label="Logo Resmi HELPER AI."
        >
          <rect width="32" height="32" rx="7" fill="#0B0B0B" />
          <path
            d="M15 5.5 C15.9 12.1 18.9 15.1 25.5 16 C18.9 16.9 15.9 19.9 15 26.5 C14.1 19.9 11.1 16.9 4.5 16 C11.1 15.1 14.1 12.1 15 5.5 Z"
            fill="#FFFFFF"
          />
          <circle cx="23.5" cy="8.8" r="2.8" fill="#DC2626" />
        </svg>
      </span>

      {showWordmark ? (
        <span className="min-w-0 leading-none">
          <HelperAiWordmark size={size} />
        </span>
      ) : null}
    </span>
  );
}

interface ThemeToggleTabsProps {
  isDark: boolean;
  onChangeMode: (mode: "light" | "dark") => void;
}

export function ThemeToggleTabs({
  isDark,
  onChangeMode,
}: ThemeToggleTabsProps) {
  return (
    <div
      className="inline-flex shrink-0 items-center gap-0.5 border p-0.5"
      style={{
        backgroundColor: "var(--bg-surface-muted)",
        borderColor: "var(--border-subtle)",
        borderRadius: "var(--radius-control)",
      }}
      role="tablist"
      aria-label="Pilihan tampilan Terang atau Gelap"
    >
      <button
        type="button"
        role="tab"
        aria-selected={!isDark}
        onClick={() => onChangeMode("light")}
        className="inline-flex min-h-[28px] items-center gap-1.5 px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition-colors"
        style={{
          borderRadius: "calc(var(--radius-control) - 2px)",
          backgroundColor: !isDark ? "var(--bg-surface)" : "transparent",
          color: !isDark ? "var(--text-primary)" : "var(--text-muted)",
        }}
      >
        <Sun
          className="h-3.5 w-3.5 shrink-0"
          style={{ color: !isDark ? "var(--accent)" : "var(--text-muted)" }}
        />
        <span>Terang</span>
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={isDark}
        onClick={() => onChangeMode("dark")}
        className="inline-flex min-h-[28px] items-center gap-1.5 px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition-colors"
        style={{
          borderRadius: "calc(var(--radius-control) - 2px)",
          backgroundColor: isDark ? "var(--bg-surface)" : "transparent",
          color: isDark ? "var(--text-primary)" : "var(--text-muted)",
        }}
      >
        <Moon
          className="h-3.5 w-3.5 shrink-0"
          style={{ color: isDark ? "var(--accent)" : "var(--text-muted)" }}
        />
        <span>Gelap</span>
      </button>
    </div>
  );
}
