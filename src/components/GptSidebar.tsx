import {
  ChevronDown,
  ChevronRight,
  Code2,
  FolderKanban,
  Layers,
  LogIn,
  LogOut,
  MessageSquare,
  PanelLeftClose,
  Pin,
  PinOff,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { ChatSession, NavTab } from "../types/app";
import { formatCompactCredits } from "../utils/creditQuota";
import { HelperBrandLogo } from "./ClaudeMark";

interface GptSidebarProps {
  open: boolean;
  activeTab: NavTab;
  sessions: ChatSession[];
  activeSessionId: string;
  pendingTaskCount: number;
  artifactCount: number;
  isStreaming: boolean;
  activeUserEmail: string | null;
  activeUserName: string | null;
  isCloudSynced: boolean;
  isGoogleConnected: boolean;
  tokenSaverMode: boolean;
  ultraSaverMode: boolean;
  creditsRemaining: number;
  onClose: () => void;
  onSelectTab: (tab: NavTab) => void;
  onCreateSession: () => void;
  onSelectSession: (sessionId: string) => void;
  onTogglePinSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onOpenAuthModal: () => void;
  onSignOut: () => void;
}

export function GptSidebar({
  open,
  activeTab,
  sessions,
  activeSessionId,
  pendingTaskCount,
  artifactCount,
  isStreaming,
  activeUserEmail,
  activeUserName,
  isCloudSynced,
  isGoogleConnected,
  tokenSaverMode,
  ultraSaverMode,
  creditsRemaining,
  onClose,
  onSelectTab,
  onCreateSession,
  onSelectSession,
  onTogglePinSession,
  onDeleteSession,
  onOpenAuthModal,
  onSignOut,
}: GptSidebarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pinnedExpanded, setPinnedExpanded] = useState(true);
  const [recentsExpanded, setRecentsExpanded] = useState(true);

  const filteredSessions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.messages.some((m) => m.text.toLowerCase().includes(q)),
    );
  }, [sessions, searchQuery]);

  const pinnedSessions = useMemo(
    () => filteredSessions.filter((s) => s.pinned),
    [filteredSessions],
  );
  const recentSessions = useMemo(
    () => filteredSessions.filter((s) => !s.pinned),
    [filteredSessions],
  );

  if (!open) return null;

  const closeOnMobile = () => {
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  const renderSessionRow = (session: ChatSession) => {
    const isCurrent = activeTab === "sandbox" && session.id === activeSessionId;
    return (
      <li
        key={session.id}
        className="group flex min-h-[40px] items-center justify-between gap-1 px-2.5 py-1 text-[13px] transition-colors"
        style={{
          borderRadius: "var(--radius-control)",
          backgroundColor: isCurrent ? "var(--bg-surface)" : "transparent",
          color: isCurrent ? "var(--text-primary)" : "var(--text-secondary)",
        }}
      >
        <button
          type="button"
          onClick={() => {
            onSelectSession(session.id);
            onSelectTab("sandbox");
            closeOnMobile();
          }}
          className="min-h-[36px] min-w-0 flex-1 truncate text-left font-normal"
        >
          {session.title}
        </button>

        <div
          className={`flex shrink-0 items-center gap-0.5 transition-opacity ${
            isCurrent
              ? "opacity-85"
              : "opacity-80 lg:opacity-0 lg:group-hover:opacity-80"
          }`}
        >
          <button
            type="button"
            onClick={() => onTogglePinSession(session.id)}
            className="inline-flex h-8 w-8 items-center justify-center hover:opacity-100"
            aria-label={session.pinned ? "Lepas sematan" : "Sematkan obrolan"}
            title={session.pinned ? "Lepas sematan" : "Sematkan ke Disematkan"}
          >
            {session.pinned ? (
              <PinOff className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
            ) : (
              <Pin className="h-3.5 w-3.5" />
            )}
          </button>

          {sessions.length > 1 ? (
            <button
              type="button"
              onClick={() => onDeleteSession(session.id)}
              className="inline-flex h-8 w-8 items-center justify-center hover:opacity-100"
              aria-label={`Hapus ${session.title}`}
              title="Hapus obrolan"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </li>
    );
  };

  const displayName =
    activeUserName ||
    (activeUserEmail ? activeUserEmail.split("@")[0] : null) ||
    "Mode Tamu";
  const avatarInitial = activeUserEmail
    ? displayName.charAt(0).toUpperCase()
    : "H";

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/45 lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className="fixed inset-y-0 left-0 z-50 flex w-[272px] shrink-0 flex-col border-r pb-safe lg:static lg:z-auto lg:w-[264px]"
        style={{
          backgroundColor: "var(--bg-surface-muted)",
          borderColor: "var(--border-subtle)",
          color: "var(--text-primary)",
        }}
        aria-label="Sidebar navigasi"
      >
        {/* Top Brand Lockup + Quick Controls Row */}
        <div className="flex h-14 items-center justify-between gap-2 px-3">
          <button
            type="button"
            onClick={() => {
              onSelectTab("sandbox");
              closeOnMobile();
            }}
            className="min-w-0 text-left transition-opacity hover:opacity-85"
            title="Beranda HELPER AI."
          >
            <HelperBrandLogo size="sm" showWordmark />
          </button>

          <div className="flex shrink-0 items-center gap-1">
            <div
              className="flex items-center gap-0.5 border p-0.5"
              style={{
                backgroundColor: "var(--bg-canvas)",
                borderColor: "var(--border-subtle)",
                borderRadius: "var(--radius-control)",
              }}
              aria-label="Beralih cepat antara Chat dan Artefak"
            >
              <button
                type="button"
                onClick={() => {
                  onSelectTab("sandbox");
                  closeOnMobile();
                }}
                className="inline-flex h-8 w-8 items-center justify-center transition-colors sm:h-7 sm:w-7"
                style={{
                  borderRadius: "calc(var(--radius-control) - 2px)",
                  backgroundColor:
                    activeTab === "sandbox" ? "var(--bg-surface)" : "transparent",
                  color:
                    activeTab === "sandbox"
                      ? "var(--accent)"
                      : "var(--text-muted)",
                }}
                aria-label="Mode Chat"
                title="Obrolan Chat"
              >
                <MessageSquare className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectTab("artifacts");
                  closeOnMobile();
                }}
                className="inline-flex h-8 w-8 items-center justify-center transition-colors sm:h-7 sm:w-7"
                style={{
                  borderRadius: "calc(var(--radius-control) - 2px)",
                  backgroundColor:
                    activeTab === "artifacts"
                      ? "var(--bg-surface)"
                      : "transparent",
                  color:
                    activeTab === "artifacts"
                      ? "var(--accent)"
                      : "var(--text-muted)",
                }}
                aria-label="Mode Artefak & Kode"
                title="Galeri Artefak & Kode"
              >
                <Code2 className="h-3.5 w-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center transition-colors hover:opacity-75 sm:h-8 sm:w-8"
              style={{
                borderRadius: "var(--radius-control)",
                color: "var(--text-secondary)",
              }}
              aria-label="Tutup sidebar"
              title="Tutup sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Primary Navigation */}
        <div className="space-y-0.5 px-2.5 pb-3">
          <button
            type="button"
            disabled={isStreaming}
            onClick={() => {
              onCreateSession();
              onSelectTab("sandbox");
              closeOnMobile();
            }}
            className="flex min-h-[42px] w-full items-center gap-2.5 border px-3 py-1.5 text-left text-[13px] font-semibold transition-colors hover:opacity-85 disabled:opacity-50 sm:min-h-[38px]"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-subtle)",
              color: "var(--text-primary)",
              borderRadius: "var(--radius-control)",
            }}
          >
            <Plus className="h-4 w-4 shrink-0" style={{ color: "var(--accent)" }} />
            <span>Obrolan Baru</span>
          </button>

          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            className="flex min-h-[40px] w-full items-center gap-2.5 px-3 py-1.5 text-left text-[13px] font-medium transition-colors hover:opacity-85 sm:min-h-[36px]"
            style={{
              borderRadius: "var(--radius-control)",
              backgroundColor: searchOpen ? "var(--bg-surface)" : "transparent",
              color: searchOpen ? "var(--text-primary)" : "var(--text-secondary)",
            }}
          >
            <Search className="h-4 w-4 shrink-0" style={{ color: "var(--text-muted)" }} />
            <span>Cari</span>
          </button>

          {searchOpen ? (
            <div className="px-1 py-1">
              <div
                className="flex items-center gap-1.5 border px-2.5 py-2"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  borderColor: "var(--border-strong)",
                  borderRadius: "var(--radius-control)",
                }}
              >
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter riwayat obrolan..."
                  className="w-full bg-transparent text-xs focus:outline-none"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label="Hapus pencarian"
                  >
                    <X className="h-3.5 w-3.5" style={{ color: "var(--text-muted)" }} />
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          <nav aria-label="Menu utama" className="space-y-0.5">
            <button
              type="button"
              onClick={() => {
                onSelectTab("tasks");
                closeOnMobile();
              }}
              className="flex min-h-[40px] w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-[13px] font-medium transition-colors sm:min-h-[36px]"
              style={{
                borderRadius: "var(--radius-control)",
                backgroundColor:
                  activeTab === "tasks" ? "var(--bg-surface)" : "transparent",
                color:
                  activeTab === "tasks"
                    ? "var(--text-primary)"
                    : "var(--text-secondary)",
              }}
            >
              <span className="flex items-center gap-2.5">
                <FolderKanban
                  className="h-4 w-4 shrink-0"
                  style={{
                    color:
                      activeTab === "tasks"
                        ? "var(--accent)"
                        : "var(--text-muted)",
                  }}
                />
                <span>Tugas &amp; Proyek</span>
              </span>
              {pendingTaskCount > 0 ? (
                <span
                  className="font-mono text-[11px] font-semibold tabular-nums"
                  style={{ color: "var(--accent)" }}
                >
                  {pendingTaskCount}
                </span>
              ) : null}
            </button>

            <button
              type="button"
              onClick={() => {
                onSelectTab("artifacts");
                closeOnMobile();
              }}
              className="flex min-h-[40px] w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-[13px] font-medium transition-colors sm:min-h-[36px]"
              style={{
                borderRadius: "var(--radius-control)",
                backgroundColor:
                  activeTab === "artifacts"
                    ? "var(--bg-surface)"
                    : "transparent",
                color:
                  activeTab === "artifacts"
                    ? "var(--text-primary)"
                    : "var(--text-secondary)",
              }}
            >
              <span className="flex items-center gap-2.5">
                <Layers
                  className="h-4 w-4 shrink-0"
                  style={{
                    color:
                      activeTab === "artifacts"
                        ? "var(--accent)"
                        : "var(--text-muted)",
                  }}
                />
                <span>Artefak</span>
              </span>
              {artifactCount > 0 ? (
                <span
                  className="font-mono text-[11px] font-semibold tabular-nums"
                  style={{ color: "var(--text-muted)" }}
                >
                  {artifactCount}
                </span>
              ) : null}
            </button>

            <button
              type="button"
              onClick={() => {
                onSelectTab("settings");
                closeOnMobile();
              }}
              className="flex min-h-[40px] w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-[13px] font-medium transition-colors sm:min-h-[36px]"
              style={{
                borderRadius: "var(--radius-control)",
                backgroundColor:
                  activeTab === "settings"
                    ? "var(--bg-surface)"
                    : "transparent",
                color:
                  activeTab === "settings"
                    ? "var(--text-primary)"
                    : "var(--text-secondary)",
              }}
            >
              <span className="flex items-center gap-2.5">
                <SlidersHorizontal
                  className="h-4 w-4 shrink-0"
                  style={{
                    color:
                      activeTab === "settings"
                        ? "var(--accent)"
                        : "var(--text-muted)",
                  }}
                />
                <span>Pengaturan</span>
              </span>
            </button>
          </nav>
        </div>

        {/* Scrollable Pinned & Recents Sections */}
        <div
          className="flex min-h-0 flex-1 flex-col overflow-y-auto border-t px-2.5 py-3"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          {pinnedSessions.length > 0 ? (
            <div className="mb-3">
              <button
                type="button"
                onClick={() => setPinnedExpanded((v) => !v)}
                className="flex w-full items-center gap-1 px-2 pb-1.5 text-[11px] font-semibold"
                style={{ color: "var(--text-muted)" }}
              >
                <span>Disematkan</span>
                {pinnedExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </button>
              {pinnedExpanded ? (
                <ul className="space-y-0.5">
                  {pinnedSessions.map(renderSessionRow)}
                </ul>
              ) : null}
            </div>
          ) : null}

          <div>
            <button
              type="button"
              onClick={() => setRecentsExpanded((v) => !v)}
              className="flex w-full items-center gap-1 px-2 pb-1.5 text-[11px] font-semibold"
              style={{ color: "var(--text-muted)" }}
            >
              <span>Terbaru</span>
              {recentsExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>
            {recentsExpanded ? (
              recentSessions.length > 0 ? (
                <ul className="space-y-0.5">
                  {recentSessions.map(renderSessionRow)}
                </ul>
              ) : (
                <p
                  className="px-2 py-2 text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  {searchQuery
                    ? "Tidak ada obrolan yang cocok."
                    : "Belum ada riwayat tambahan."}
                </p>
              )
            ) : null}
          </div>
        </div>

        {/* Compact Profile / Account Row */}
        <div
          className="flex items-center gap-1.5 border-t p-2.5"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <button
            type="button"
            onClick={() => {
              if (!activeUserEmail) {
                onOpenAuthModal();
              } else {
                onSelectTab("settings");
              }
              closeOnMobile();
            }}
            className="flex min-h-[42px] min-w-0 flex-1 items-center justify-between gap-2 px-2 py-1.5 text-left transition-colors hover:opacity-80"
            style={{ borderRadius: "var(--radius-control)" }}
            title={
              activeUserEmail
                ? "Buka Pengaturan Akun & Kredit"
                : "Masuk atau Daftar Akun HELPER AI."
            }
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center text-xs font-bold"
                style={{
                  background: activeUserEmail
                    ? "var(--text-primary)"
                    : "var(--accent-gradient)",
                  color: activeUserEmail
                    ? "var(--bg-canvas)"
                    : "var(--accent-contrast)",
                  borderRadius: "999px",
                }}
                aria-hidden="true"
              >
                {activeUserEmail ? avatarInitial : <LogIn className="h-3.5 w-3.5" />}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold">
                  {displayName}
                </span>
                <span
                  className="block truncate font-mono text-[11px] tabular-nums"
                  style={{ color: "var(--text-muted)" }}
                >
                  {formatCompactCredits(creditsRemaining)}
                  {ultraSaverMode
                    ? " · Ultra"
                    : tokenSaverMode
                      ? " · Hemat"
                      : ""}
                  {isGoogleConnected
                    ? " · Workspace"
                    : isCloudSynced
                      ? " · Cloud"
                      : " · Tamu"}
                </span>
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              onSignOut();
              closeOnMobile();
            }}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center border hover:opacity-80"
            style={{
              borderColor: "var(--border-subtle)",
              borderRadius: "var(--radius-control)",
              color: "var(--text-secondary)",
            }}
            title={activeUserEmail ? "Keluar Akun" : "Kembali ke Layar Masuk"}
            aria-label={activeUserEmail ? "Keluar Akun" : "Kembali ke Layar Masuk"}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>
    </>
  );
}
