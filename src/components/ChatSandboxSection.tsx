import {
  AlertCircle,
  ArrowRight,
  Box,
  CalendarClock,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  Code2,
  Cpu,
  Globe,
  LogIn,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  RotateCcw,
  Send,
  ShieldAlert,
  Sliders,
  Sparkles,
  SquarePen,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ASSISTANT_PRESETS } from "../data/presetsAndProviders";
import type {
  ArtifactItem,
  AssistantConfig,
  ChatMessage,
  ChatSession,
  DailyTask,
  PendingAgentAction,
  QuickNote,
  ThinkingLevelOption,
  TokenUsageStats,
  TokenUsageSummary,
  ToolActionEvent,
} from "../types/app";
import {
  computeCreditCharge,
  CREDIT_LIMIT_PER_USER,
  formatCompactCredits,
  trimMessagesForRequest,
} from "../utils/creditQuota";
import {
  executeConfirmedWorkspaceAction,
  getWorkspaceAccessToken,
} from "../utils/googleWorkspace";
import { compileSystemPrompt } from "../utils/promptAndCodeGen";
import { ArtifactPanel } from "./ArtifactPanel";
import {
  ArtifactPreviewCard,
  type SessionArtifactEntry,
} from "./ArtifactPreviewCard";
import { HelperBrandLogo, ThemeToggleTabs } from "./ClaudeMark";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { extractArtifactsFromText, MarkdownMessage } from "./MarkdownMessage";

interface ChatSandboxSectionProps {
  sidebarOpen: boolean;
  isDark: boolean;
  config: AssistantConfig;
  activeSession: ChatSession;
  dailyTasks: DailyTask[];
  quickNotes: QuickNote[];
  queuedPrompt: string | null;
  requestedArtifactId: string | null;
  recentArtifacts: SessionArtifactEntry[];
  activeUserEmail: string | null;
  activeUserName: string | null;
  isCloudSynced: boolean;
  googleUserEmail: string | null;
  googleUserName: string | null;
  googleAuthLoading: boolean;
  googleAuthError: string | null;
  creditStats: TokenUsageStats;
  onChangeThemeMode: (mode: "light" | "dark") => void;
  onConsumeQueuedPrompt: () => void;
  onConsumeRequestedArtifact: () => void;
  onOpenSidebar: () => void;
  onCreateSession: () => void;
  onChangeConfig: (next: AssistantConfig) => void;
  onUpdateSessionMessages: (sessionId: string, messages: ChatMessage[]) => void;
  onUpdateDailyTasks: (updater: (prev: DailyTask[]) => DailyTask[]) => void;
  onUpdateQuickNotes: (updater: (prev: QuickNote[]) => QuickNote[]) => void;
  onOpenTasks: () => void;
  onOpenArtifactsGallery: () => void;
  onOpenArtifactEntry: (entry: SessionArtifactEntry) => void;
  onEditStudio: () => void;
  onOpenGoogleSettings: () => void;
  onOpenCreditSettings: () => void;
  onOpenAuthModal: () => void;
  onSignInGoogle: () => void;
  onRecordUsage: (usage: TokenUsageSummary) => void;
}

export function ChatSandboxSection({
  sidebarOpen,
  isDark,
  config,
  activeSession,
  dailyTasks,
  quickNotes,
  queuedPrompt,
  requestedArtifactId,
  recentArtifacts,
  activeUserEmail,
  activeUserName,
  isCloudSynced,
  googleUserEmail,
  googleUserName,
  googleAuthLoading,
  googleAuthError,
  creditStats,
  onChangeThemeMode,
  onConsumeQueuedPrompt,
  onConsumeRequestedArtifact,
  onOpenSidebar,
  onCreateSession,
  onChangeConfig,
  onUpdateSessionMessages,
  onUpdateDailyTasks,
  onUpdateQuickNotes,
  onOpenTasks,
  onOpenArtifactsGallery,
  onOpenArtifactEntry,
  onEditStudio,
  onOpenGoogleSettings,
  onOpenCreditSettings,
  onOpenAuthModal,
  onSignInGoogle,
  onRecordUsage,
}: ChatSandboxSectionProps) {
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [artifactOpen, setArtifactOpen] = useState(false);
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null);
  const [customArtifact, setCustomArtifact] = useState<ArtifactItem | null>(null);
  const [presetMenuOpen, setPresetMenuOpen] = useState(false);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const presetMenuRef = useRef<HTMLDivElement | null>(null);
  const plusMenuRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const messages = activeSession?.messages || [];
  const isUltraSaver = config.ultraSaverMode !== false;
  const creditLimit = creditStats.creditLimit || CREDIT_LIMIT_PER_USER;
  const creditsRemaining = Math.max(0, creditLimit - (creditStats.creditsUsed || 0));
  const creditRemainingPercent = Math.max(
    0,
    Math.min(100, (creditsRemaining / creditLimit) * 100),
  );
  const pendingTaskCount = dailyTasks.filter((t) => !t.done).length;
  const activePreset =
    ASSISTANT_PRESETS.find((p) => p.id === config.presetId) ||
    ASSISTANT_PRESETS[0];

  useEffect(() => {
    if (!presetMenuOpen && !plusMenuOpen) return;
    const handleOutside = (ev: MouseEvent) => {
      if (
        presetMenuOpen &&
        presetMenuRef.current &&
        !presetMenuRef.current.contains(ev.target as Node)
      ) {
        setPresetMenuOpen(false);
      }
      if (
        plusMenuOpen &&
        plusMenuRef.current &&
        !plusMenuRef.current.contains(ev.target as Node)
      ) {
        setPlusMenuOpen(false);
      }
    };
    const handleKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        setPresetMenuOpen(false);
        setPlusMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [presetMenuOpen, plusMenuOpen]);

  const sessionArtifacts = useMemo(() => {
    const collected: ArtifactItem[] = [];
    for (const msg of messages) {
      if (msg.role === "model" && msg.text) {
        collected.push(...extractArtifactsFromText(msg.text, msg.id));
      }
    }
    if (
      customArtifact &&
      !collected.some((a) => a.id === customArtifact.id)
    ) {
      collected.push(customArtifact);
    }
    return collected;
  }, [messages, customArtifact]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, isStreaming]);

  useEffect(() => {
    setCustomArtifact(null);
    setActiveArtifactId(null);
    setArtifactOpen(false);
  }, [activeSession?.id]);

  useEffect(() => {
    if (!requestedArtifactId) return;
    const found = sessionArtifacts.find((a) => a.id === requestedArtifactId);
    if (found) {
      setActiveArtifactId(found.id);
      setArtifactOpen(true);
    }
    onConsumeRequestedArtifact();
  }, [requestedArtifactId, sessionArtifacts, onConsumeRequestedArtifact]);

  const applyPresetInline = (presetId: string) => {
    const found = ASSISTANT_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    onChangeConfig({
      ...found.config,
      model: "gemini-4-hydrogen",
      thinkingLevel: config.thinkingLevel,
      tokenSaverMode: config.tokenSaverMode,
      ultraSaverMode: isUltraSaver,
      agentWebSearchEnabled: config.agentWebSearchEnabled,
    });
  };

  const applyToolActions = (actions: ToolActionEvent[]): string[] => {
    const summaries: string[] = [];

    for (const action of actions) {
      if (action.type === "add_daily_task") {
        const task: DailyTask = {
          id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: action.title,
          timeLabel: action.timeLabel,
          priority: action.priority || "normal",
          done: false,
          createdAt: Date.now(),
        };
        onUpdateDailyTasks((prev) => [task, ...prev]);
        summaries.push(
          `Tugas ditambahkan: ${action.title}${action.timeLabel ? ` (${action.timeLabel})` : ""}`,
        );
      } else if (action.type === "complete_daily_task") {
        const q = action.query.toLowerCase();
        onUpdateDailyTasks((prev) =>
          prev.map((t) =>
            t.title.toLowerCase().includes(q) ? { ...t, done: true } : t,
          ),
        );
        summaries.push(`Tugas ditandai selesai: "${action.query}"`);
      } else if (action.type === "save_quick_note") {
        const note: QuickNote = {
          id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: action.title,
          content: action.content,
          createdAt: Date.now(),
        };
        onUpdateQuickNotes((prev) => [note, ...prev]);
        summaries.push(`Catatan disimpan: ${action.title}`);
      }
    }

    return summaries;
  };

  const handleApproveAction = async (
    messageId: string,
    action: PendingAgentAction,
  ) => {
    if (!activeSession || executingActionId) return;
    setExecutingActionId(action.id);
    try {
      const resultMessage = await executeConfirmedWorkspaceAction(action);
      onUpdateSessionMessages(
        activeSession.id,
        messages.map((m) =>
          m.id !== messageId
            ? m
            : {
                ...m,
                pendingActions: (m.pendingActions || []).map((a) =>
                  a.id === action.id
                    ? { ...a, status: "executed", resultMessage }
                    : a,
                ),
              },
        ),
      );
    } catch (err) {
      const resultMessage =
        err instanceof Error ? err.message : "Gagal mengeksekusi aksi.";
      onUpdateSessionMessages(
        activeSession.id,
        messages.map((m) =>
          m.id !== messageId
            ? m
            : {
                ...m,
                pendingActions: (m.pendingActions || []).map((a) =>
                  a.id === action.id
                    ? { ...a, status: "failed", resultMessage }
                    : a,
                ),
              },
        ),
      );
    } finally {
      setExecutingActionId(null);
    }
  };

  const handleCancelAction = (messageId: string, actionId: string) => {
    if (!activeSession) return;
    onUpdateSessionMessages(
      activeSession.id,
      messages.map((m) =>
        m.id !== messageId
          ? m
          : {
              ...m,
              pendingActions: (m.pendingActions || []).map((a) =>
                a.id === actionId
                  ? {
                      ...a,
                      status: "cancelled",
                      resultMessage: "Aksi dibatalkan oleh pengguna.",
                    }
                  : a,
              ),
            },
      ),
    );
  };

  const handleOpenArtifact = (artifact: ArtifactItem) => {
    setCustomArtifact(artifact);
    setActiveArtifactId(artifact.id);
    setArtifactOpen(true);
  };

  const handleSaveArtifactToNote = (title: string, content: string) => {
    onUpdateQuickNotes((prev) => [
      {
        id: `n-${Date.now()}`,
        title,
        content,
        createdAt: Date.now(),
      },
      ...prev,
    ]);
  };

  const sendMessage = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || isStreaming || !activeSession) return;

    if (creditsRemaining <= 0) {
      setErrorBanner(
        "Kuota kredit Anda (100 Juta) telah habis. Buka Pengaturan untuk reset kuota atau pastikan Mode Ultra Hemat aktif.",
      );
      return;
    }

    setErrorBanner(null);
    setPlusMenuOpen(false);
    if (!textOverride) setInput("");

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text,
      timestamp: Date.now(),
    };

    const assistantMsgId = `m-${Date.now() + 1}`;
    const placeholderAssistant: ChatMessage = {
      id: assistantMsgId,
      role: "model",
      text: "",
      timestamp: Date.now(),
    };

    const historyForApi = trimMessagesForRequest(
      [...messages, userMsg],
      isUltraSaver,
      config.tokenSaverMode,
    );
    const adaptiveSystemPrompt = compileSystemPrompt(config, text);

    const nextList = [...messages, userMsg, placeholderAssistant];
    onUpdateSessionMessages(activeSession.id, nextList);
    setIsStreaming(true);

    let accumulated = "";
    let modelUsed = "gemini-4-hydrogen";
    let thinkingUsed: ThinkingLevelOption = config.thinkingLevel;
    let toolSummary: string[] = [];
    const agentSteps: string[] = [];
    const pendingActions: PendingAgentAction[] = [];

    const syncAssistantMessage = (extra?: Partial<ChatMessage>) => {
      onUpdateSessionMessages(
        activeSession.id,
        nextList.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                text: accumulated,
                modelUsed,
                thinkingUsed,
                toolSummary: toolSummary.length > 0 ? [...toolSummary] : undefined,
                agentSteps: agentSteps.length > 0 ? [...agentSteps] : undefined,
                pendingActions:
                  pendingActions.length > 0 ? [...pendingActions] : undefined,
                ...extra,
              }
            : m,
        ),
      );
    };

    const localDateTime = new Date().toLocaleString("id-ID", {
      dateStyle: "full",
      timeStyle: "short",
    });

    const workspaceToken = getWorkspaceAccessToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (workspaceToken) {
      headers.Authorization = `Bearer ${workspaceToken}`;
    }

    try {
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({
          messages: historyForApi,
          systemInstruction: adaptiveSystemPrompt,
          thinkingLevel: config.thinkingLevel,
          enableDailyTools: config.dailyToolsEnabled,
          tokenSaverMode: config.tokenSaverMode,
          ultraSaverMode: isUltraSaver,
          agentWebSearchEnabled: config.agentWebSearchEnabled,
          dailyContext: {
            localDateTime,
            tasks: isUltraSaver
              ? dailyTasks.filter((t) => !t.done).slice(0, 4)
              : config.tokenSaverMode
                ? dailyTasks.filter((t) => !t.done).slice(0, 6)
                : dailyTasks.slice(0, 20),
            notes: isUltraSaver
              ? quickNotes.slice(0, 2)
              : config.tokenSaverMode
                ? quickNotes.slice(0, 3)
                : quickNotes.slice(0, 10),
          },
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line.startsWith("data: ")) continue;

          try {
            const payload = JSON.parse(line.slice(6)) as {
              type?: string;
              text?: string;
              label?: string;
              modelUsed?: string;
              thinkingUsed?: ThinkingLevelOption;
              actions?: unknown[];
              usage?: TokenUsageSummary;
              message?: string;
            };

            if (payload.type === "meta") {
              if (payload.modelUsed) modelUsed = payload.modelUsed;
              if (payload.thinkingUsed) thinkingUsed = payload.thinkingUsed;
            } else if (payload.type === "agent_step" && payload.label) {
              agentSteps.push(payload.label);
              syncAssistantMessage();
            } else if (
              payload.type === "tool_actions" &&
              Array.isArray(payload.actions)
            ) {
              toolSummary = applyToolActions(
                payload.actions as ToolActionEvent[],
              );
              syncAssistantMessage();
            } else if (
              payload.type === "pending_actions" &&
              Array.isArray(payload.actions)
            ) {
              for (const act of payload.actions as PendingAgentAction[]) {
                pendingActions.push(act);
              }
              syncAssistantMessage();
            } else if (payload.type === "delta" && payload.text) {
              accumulated += payload.text;
              syncAssistantMessage();
            } else if (payload.type === "done") {
              if (payload.modelUsed) modelUsed = payload.modelUsed;
              if (payload.thinkingUsed) thinkingUsed = payload.thinkingUsed;
              let usageWithCredits = payload.usage;
              if (payload.usage) {
                const { creditsCharged, creditsSaved } = computeCreditCharge(
                  payload.usage.totalTokens,
                  isUltraSaver,
                );
                usageWithCredits = {
                  ...payload.usage,
                  creditsCharged,
                  creditsSaved,
                };
                onRecordUsage(usageWithCredits);
              }
              syncAssistantMessage({ usage: usageWithCredits });
              const extracted = extractArtifactsFromText(
                accumulated,
                assistantMsgId,
              );
              if (extracted.length > 0) {
                const latest = extracted[extracted.length - 1];
                setCustomArtifact(null);
                setActiveArtifactId(latest.id);
                setArtifactOpen(true);
              }
            } else if (payload.type === "error") {
              throw new Error(
                payload.message || "Gagal memproses balasan gemini-4-hydrogen.",
              );
            }
          } catch (parseErr) {
            if (
              parseErr instanceof Error &&
              parseErr.message !== "Unexpected end of JSON input"
            ) {
              throw parseErr;
            }
          }
        }
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Terjadi kendala saat menghubungi server AI.";
      setErrorBanner(msg);
      syncAssistantMessage({
        text: accumulated || "Permintaan tidak dapat diselesaikan.",
        error: msg,
      });
    } finally {
      setIsStreaming(false);
    }
  };

  useEffect(() => {
    if (queuedPrompt && !isStreaming) {
      const promptToRun = queuedPrompt;
      onConsumeQueuedPrompt();
      void sendMessage(promptToRun);
    }
  });

  const quickStartCards = [
    {
      icon: CalendarClock,
      title: "Agenda & Tugas Kerja",
      prompt: googleUserEmail
        ? "Cek jadwal Google Calendar hari ini, daftar tugas saya di Google Tasks, dan email penting yang belum dibaca."
        : config.starterPrompts[0],
    },
    {
      icon: Box,
      title: "Scene 3D Three.js",
      prompt:
        config.starterPrompts[1] ||
        "Buatkan file HTML tunggal Three.js dengan OrbitControls dan obyek 3D interaktif agar bisa dipratinjau di Kanvas.",
    },
    {
      icon: Code2,
      title: "Koding React & TS",
      prompt:
        config.starterPrompts[2] ||
        "Buatkan contoh komponen React TypeScript + fetch streaming SSE yang bersih dan aman.",
    },
    {
      icon: Sparkles,
      title: googleUserEmail ? "Buat Draf Laporan" : "Draf Pesan",
      prompt: googleUserEmail
        ? "Cari dokumen ringkasan kerja terbaru saya di Google Drive lalu buatkan draf email laporannya."
        : config.starterPrompts[3] ||
          "Tulis draf pesan WhatsApp dan email profesional untuk menindaklanjuti progres hari ini.",
    },
  ];

  const firstName = (activeUserName || googleUserName)?.trim().split(/\s+/)[0];
  const greetingHeadline = firstName
    ? `Kembali bekerja, ${firstName}`
    : "Apa yang bisa dibantu?";

  const renderComposer = (centered: boolean) => (
    <div className="w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void sendMessage();
        }}
        className="composer-creative-ring w-full border px-3 pt-3 pb-2 shadow-sm transition-shadow focus-within:shadow-md sm:px-4 sm:pt-3.5 sm:pb-2.5"
        style={{
          backgroundColor: "var(--bg-surface)",
          borderColor: "var(--border-strong)",
          borderRadius: "var(--radius-card)",
        }}
      >
        <textarea
          rows={centered ? 3 : 2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void sendMessage();
            }
          }}
          placeholder="Apa yang bisa saya bantu hari ini?"
          className="max-h-44 w-full resize-none bg-transparent py-0.5 text-[15px] leading-relaxed focus:outline-none"
        />

        <div className="mt-2 flex items-center justify-between gap-1.5 pt-1 sm:gap-2">
          {/* Left: Claude-style '+' Quick Menu + Search Web */}
          <div className="relative flex items-center gap-1.5" ref={plusMenuRef}>
            <button
              type="button"
              onClick={() => setPlusMenuOpen((v) => !v)}
              className="inline-flex h-9 w-9 items-center justify-center border transition-colors hover:opacity-85 sm:h-8 sm:w-8"
              style={{
                borderColor: plusMenuOpen
                  ? "var(--accent)"
                  : "var(--border-subtle)",
                backgroundColor: plusMenuOpen
                  ? "var(--accent-soft)"
                  : "transparent",
                color: plusMenuOpen ? "var(--accent)" : "var(--text-secondary)",
                borderRadius: "var(--radius-control)",
              }}
              aria-label="Menu cepat alat & pengaturan"
              title="Alat AI Agent & Hemat Token"
            >
              <Plus className="h-4 w-4" />
            </button>

            {plusMenuOpen ? (
              <div
                className="claude-enter absolute bottom-full left-0 z-40 mb-2 w-72 max-w-[calc(100vw-2rem)] border p-2 shadow-lg"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  borderColor: "var(--border-strong)",
                  borderRadius: "var(--radius-card)",
                }}
              >
                <div
                  className="px-2 py-1 text-[11px] font-semibold"
                  style={{ color: "var(--text-muted)" }}
                >
                  Kontrol Agent &amp; Hemat Kuota
                </div>

                <button
                  type="button"
                  onClick={() =>
                    onChangeConfig({
                      ...config,
                      ultraSaverMode: !isUltraSaver,
                    })
                  }
                  className="flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left text-xs transition-colors hover:opacity-85"
                  style={{ borderRadius: "var(--radius-control)" }}
                >
                  <span className="font-medium">Mode Ultra Hemat (0,25×)</span>
                  <span
                    className="font-mono text-[11px] font-semibold"
                    style={{
                      color: isUltraSaver
                        ? "var(--accent)"
                        : "var(--text-muted)",
                    }}
                  >
                    {isUltraSaver ? "AKTIF" : "MATI"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onChangeConfig({
                      ...config,
                      tokenSaverMode: !config.tokenSaverMode,
                    })
                  }
                  className="flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left text-xs transition-colors hover:opacity-85"
                  style={{ borderRadius: "var(--radius-control)" }}
                >
                  <span className="font-medium">Mode Hemat Token</span>
                  <span
                    className="font-mono text-[11px] font-semibold"
                    style={{
                      color: config.tokenSaverMode
                        ? "var(--accent)"
                        : "var(--text-muted)",
                    }}
                  >
                    {config.tokenSaverMode ? "AKTIF" : "MATI"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onChangeConfig({
                      ...config,
                      dailyToolsEnabled: !config.dailyToolsEnabled,
                    })
                  }
                  className="flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left text-xs transition-colors hover:opacity-85"
                  style={{ borderRadius: "var(--radius-control)" }}
                >
                  <span className="font-medium">Alat Tugas &amp; Catatan Lokal</span>
                  <span
                    className="font-mono text-[11px] font-semibold"
                    style={{
                      color: config.dailyToolsEnabled
                        ? "var(--accent)"
                        : "var(--text-muted)",
                    }}
                  >
                    {config.dailyToolsEnabled ? "AKTIF" : "MATI"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPlusMenuOpen(false);
                    onOpenGoogleSettings();
                  }}
                  className="flex w-full items-center justify-between gap-2 border-t px-2.5 py-2 text-left text-xs transition-colors hover:opacity-85"
                  style={{ borderColor: "var(--border-subtle)" }}
                >
                  <span className="flex items-center gap-2 font-medium">
                    <Cpu className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
                    <span>Google Workspace &amp; Token</span>
                  </span>
                  <ArrowRight className="h-3.5 w-3.5" style={{ color: "var(--text-muted)" }} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPlusMenuOpen(false);
                    onEditStudio();
                  }}
                  className="flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left text-xs transition-colors hover:opacity-85"
                  style={{ borderRadius: "var(--radius-control)" }}
                >
                  <span className="flex items-center gap-2 font-medium">
                    <Sliders className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
                    <span>Studio Prompt</span>
                  </span>
                  <ArrowRight className="h-3.5 w-3.5" style={{ color: "var(--text-muted)" }} />
                </button>
              </div>
            ) : null}

            <button
              type="button"
              onClick={() =>
                onChangeConfig({
                  ...config,
                  agentWebSearchEnabled: !config.agentWebSearchEnabled,
                })
              }
              className="inline-flex min-h-[36px] items-center gap-1 border px-2 py-1 text-[11px] font-medium whitespace-nowrap transition-colors sm:min-h-[30px] sm:gap-1.5 sm:px-2.5"
              style={{
                borderRadius: "var(--radius-control)",
                borderColor: config.agentWebSearchEnabled
                  ? "var(--accent)"
                  : "var(--border-subtle)",
                backgroundColor: config.agentWebSearchEnabled
                  ? "var(--accent-soft)"
                  : "transparent",
                color: config.agentWebSearchEnabled
                  ? "var(--accent)"
                  : "var(--text-muted)",
              }}
              title="Aktifkan pencarian web Google Search"
            >
              <Globe className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">Cari Web</span>
              <span className="sm:hidden">Web</span>
            </button>
          </div>

          {/* Right: Reasoning Depth + Terracotta Send */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div
              className="flex items-center p-0.5"
              style={{
                backgroundColor: "var(--bg-surface-muted)",
                borderRadius: "var(--radius-control)",
              }}
              role="group"
              aria-label="Kedalaman penalaran"
            >
              {(
                [
                  { id: "LOW", label: "Kilat" },
                  { id: "MEDIUM", label: "Seimbang" },
                  { id: "HIGH", label: "Dalam" },
                ] as Array<{ id: ThinkingLevelOption; label: string }>
              ).map((opt) => {
                const selected = config.thinkingLevel === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      onChangeConfig({ ...config, thinkingLevel: opt.id })
                    }
                    className="min-h-[30px] px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap transition-colors sm:min-h-[26px] sm:px-2"
                    style={{
                      borderRadius: "calc(var(--radius-control) - 2px)",
                      backgroundColor: selected
                        ? "var(--bg-surface)"
                        : "transparent",
                      color: selected
                        ? "var(--text-primary)"
                        : "var(--text-muted)",
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center transition-opacity hover:opacity-90 disabled:opacity-35 sm:h-8 sm:w-8"
              style={{
                background: "var(--accent-gradient)",
                backgroundColor: "var(--accent)",
                color: "var(--accent-contrast)",
                borderRadius: "var(--radius-control)",
              }}
              aria-label="Kirim pesan"
              title="Kirim pesan"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </form>

      {/* Subtle Context Strip Under Composer */}
      <div
        className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1 text-[11px]"
        style={{ color: "var(--text-muted)" }}
      >
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={activeUserEmail ? onOpenGoogleSettings : onOpenAuthModal}
            className="truncate max-w-[200px] hover:underline sm:max-w-none"
          >
            {googleUserEmail
              ? `Workspace: ${googleUserEmail}`
              : isCloudSynced && activeUserEmail
                ? `Cloud: ${activeUserEmail}`
                : "Tamu · Masuk untuk Sinkron Cloud"}
          </button>
          <span className="hidden sm:inline">·</span>
          <span className="hidden sm:inline">
            {isUltraSaver
              ? "Mode Ultra Hemat (0,25× Kredit)"
              : config.tokenSaverMode
                ? "Hemat Token Aktif"
                : "Mode Penuh"}
          </span>
        </div>
        <span className="font-mono">gemini-4-hydrogen</span>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Top Bar with Top-Right Light/Dark Tab */}
      <header
        className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-2.5 sm:gap-3 sm:px-4"
        style={{
          backgroundColor: "var(--bg-canvas)",
          borderColor: "var(--border-subtle)",
        }}
      >
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          {!sidebarOpen ? (
            <>
              <button
                type="button"
                onClick={onOpenSidebar}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center border hover:opacity-80 sm:h-8 sm:w-8"
                style={{
                  borderColor: "var(--border-subtle)",
                  borderRadius: "var(--radius-control)",
                }}
                aria-label="Buka sidebar"
                title="Buka sidebar"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onCreateSession}
                disabled={isStreaming}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center border hover:opacity-80 disabled:opacity-45 sm:h-8 sm:w-8"
                style={{
                  borderColor: "var(--border-subtle)",
                  borderRadius: "var(--radius-control)",
                }}
                aria-label="Obrolan Baru"
                title="Obrolan Baru"
              >
                <SquarePen className="h-4 w-4" />
              </button>
            </>
          ) : null}

          <div className="relative" ref={presetMenuRef}>
            <button
              type="button"
              onClick={() => setPresetMenuOpen((v) => !v)}
              aria-haspopup="listbox"
              aria-expanded={presetMenuOpen}
              aria-label="Pilih mode asisten"
              className="inline-flex min-h-[36px] max-w-[128px] items-center gap-1.5 border px-2 py-1 text-xs font-semibold whitespace-nowrap transition-colors hover:opacity-90 sm:min-h-[34px] sm:max-w-[220px] sm:gap-2 sm:px-3"
              style={{
                backgroundColor: "var(--accent-soft)",
                borderColor: "var(--accent)",
                color: "var(--accent)",
                borderRadius: "var(--radius-control)",
              }}
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{activePreset.label}</span>
              <ChevronDown
                className={`h-3.5 w-3.5 shrink-0 transition-transform ${
                  presetMenuOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {presetMenuOpen ? (
              <div
                role="listbox"
                aria-label="Daftar mode asisten"
                className="claude-enter absolute left-0 top-full z-40 mt-1.5 w-72 max-w-[calc(100vw-2rem)] border p-1.5 shadow-lg"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  borderColor: "var(--border-strong)",
                  borderRadius: "var(--radius-card)",
                  color: "var(--text-primary)",
                }}
              >
                {ASSISTANT_PRESETS.map((preset) => {
                  const selected = preset.id === config.presetId;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => {
                        applyPresetInline(preset.id);
                        setPresetMenuOpen(false);
                      }}
                      className="flex w-full items-start justify-between gap-2 px-2.5 py-2 text-left transition-colors"
                      style={{
                        borderRadius: "var(--radius-control)",
                        backgroundColor: selected
                          ? "var(--accent-soft)"
                          : "transparent",
                        color: selected
                          ? "var(--accent)"
                          : "var(--text-primary)",
                      }}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold">
                          {preset.label}
                        </div>
                        <div
                          className="mt-0.5 line-clamp-2 text-[11px] leading-snug"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {preset.summary}
                        </div>
                      </div>
                      {selected ? (
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>

        {/* Center-Right: Top Chat Header Credit Bar + Actions + Terang/Gelap */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={onOpenCreditSettings}
            className="inline-flex min-h-[36px] items-center gap-2 border px-2 py-1 text-left transition-colors hover:opacity-85 sm:min-h-[34px] sm:gap-2.5 sm:px-2.5"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor:
                creditRemainingPercent <= 10
                  ? "#dc2626"
                  : creditRemainingPercent <= 25
                    ? "#d97706"
                    : "var(--border-subtle)",
              borderRadius: "var(--radius-control)",
            }}
            title={`Sisa kredit: ${creditsRemaining.toLocaleString("id-ID")} dari ${creditLimit.toLocaleString("id-ID")} · Klik untuk kelola di Pengaturan`}
          >
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span
                className="hidden text-[11px] font-medium xl:inline"
                style={{ color: "var(--text-muted)" }}
              >
                Kredit
              </span>
              <span className="font-mono text-xs font-bold tabular-nums">
                {formatCompactCredits(creditsRemaining)}
              </span>
            </div>

            <div
              className="hidden h-1.5 w-16 overflow-hidden rounded-full sm:block md:w-20"
              style={{ backgroundColor: "var(--bg-surface-muted)" }}
              aria-hidden="true"
            >
              <div
                className="h-full rounded-full transition-all duration-200"
                style={{
                  width: `${creditRemainingPercent}%`,
                  background:
                    creditRemainingPercent <= 10
                      ? "#dc2626"
                      : creditRemainingPercent <= 25
                        ? "#d97706"
                        : "var(--accent-gradient)",
                }}
              />
            </div>

            <span
              className="hidden text-[10px] font-semibold whitespace-nowrap lg:inline"
              style={{
                color:
                  creditRemainingPercent <= 10
                    ? "#dc2626"
                    : creditRemainingPercent <= 25
                      ? "#d97706"
                      : "var(--accent)",
              }}
            >
              {creditRemainingPercent <= 10
                ? "Kritis"
                : creditRemainingPercent <= 25
                  ? "Menipis"
                  : isUltraSaver
                    ? "Ultra Hemat"
                    : "Standar"}
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenTasks}
            className="hidden min-h-[34px] items-center gap-1.5 border px-2.5 py-1 text-xs font-medium whitespace-nowrap tabular-nums hover:opacity-80 md:inline-flex"
            style={{
              borderColor: "var(--border-subtle)",
              borderRadius: "var(--radius-control)",
            }}
          >
            <CheckSquare className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
            <span>Tugas ({pendingTaskCount})</span>
          </button>

          {sessionArtifacts.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                if (!activeArtifactId && sessionArtifacts.length > 0) {
                  setActiveArtifactId(
                    sessionArtifacts[sessionArtifacts.length - 1].id,
                  );
                }
                setArtifactOpen((v) => !v);
              }}
              className="inline-flex min-h-[36px] items-center gap-1.5 border px-2 py-1 text-xs font-semibold whitespace-nowrap transition-colors sm:min-h-[34px] sm:px-2.5"
              style={{
                borderColor: artifactOpen
                  ? "var(--accent)"
                  : "var(--border-strong)",
                backgroundColor: artifactOpen
                  ? "var(--accent-soft)"
                  : "transparent",
                color: artifactOpen ? "var(--accent)" : "var(--text-primary)",
                borderRadius: "var(--radius-control)",
              }}
              aria-label={`Kanvas (${sessionArtifacts.length})`}
            >
              {artifactOpen ? (
                <PanelRightClose className="h-3.5 w-3.5" />
              ) : (
                <PanelRightOpen className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">
                Kanvas ({sessionArtifacts.length})
              </span>
              <span className="sm:hidden">{sessionArtifacts.length}</span>
            </button>
          ) : null}

          {messages.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                if (activeSession) onUpdateSessionMessages(activeSession.id, []);
                setArtifactOpen(false);
                setCustomArtifact(null);
                setErrorBanner(null);
              }}
              disabled={isStreaming}
              className="inline-flex min-h-[36px] items-center gap-1.5 border px-2 py-1 text-xs font-medium whitespace-nowrap hover:opacity-80 disabled:opacity-45 sm:min-h-[34px] sm:px-2.5"
              style={{
                borderColor: "var(--border-subtle)",
                borderRadius: "var(--radius-control)",
              }}
              aria-label="Bersihkan percakapan ini"
              title="Bersihkan percakapan ini"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Bersihkan</span>
            </button>
          ) : null}

          <ThemeToggleTabs isDark={isDark} onChangeMode={onChangeThemeMode} />
        </div>
      </header>

      {/* Main Split: Home / Conversation + Optional Right Kanvas */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col">
          {messages.length === 0 ? (
            <div className="claude-hero-atmosphere flex flex-1 flex-col items-center justify-start overflow-y-auto px-3.5 py-6 sm:justify-center sm:px-4 sm:py-8">
              <div className="claude-enter w-full max-w-2xl space-y-5 sm:space-y-6">
                {/* Prominent Brand Logo Hero Showcase + Editorial Greeting */}
                <div className="flex flex-col items-center text-center">
                  <div className="mb-3">
                    <HelperBrandLogo size="xl" showWordmark layout="stacked" />
                  </div>

                  <h1 className="headline-balance font-editorial text-2xl font-medium tracking-tight sm:text-4xl">
                    {greetingHeadline}
                  </h1>
                  <p
                    className="mt-2 max-w-lg text-xs leading-relaxed sm:text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Asisten koding, visual 3D, dan agen Google Workspace dengan kuota{" "}
                    <span className="font-mono font-semibold tabular-nums">
                      100 Juta
                    </span>{" "}
                    kredit &amp; Mode Ultra Hemat otomatis.
                  </p>
                </div>

                {renderComposer(true)}

                {!googleUserEmail ? (
                  <div
                    className="space-y-2.5 border px-3.5 py-3 sm:px-4"
                    style={{
                      backgroundColor: "var(--bg-surface)",
                      borderColor: "var(--border-subtle)",
                      borderRadius: "var(--radius-control)",
                    }}
                  >
                    <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                      <p
                        className="text-xs leading-relaxed"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {isCloudSynced && activeUserEmail
                          ? `Tersinkron cloud sebagai ${activeUserEmail}. Tautkan Google Workspace bila ingin akses Calendar, Gmail, Tasks, dan Drive.`
                          : "Masuk dengan akun Anda untuk menyimpan riwayat chat & 100 Juta kredit di semua perangkat, atau tautkan Google Workspace."}
                      </p>
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        {!isCloudSynced ? (
                          <button
                            type="button"
                            onClick={onOpenAuthModal}
                            className="inline-flex min-h-[40px] items-center gap-2 px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-opacity hover:opacity-90"
                            style={{
                              background: "var(--accent-gradient)",
                              backgroundColor: "var(--accent)",
                              color: "var(--accent-contrast)",
                              borderRadius: "var(--radius-control)",
                            }}
                          >
                            <LogIn className="h-3.5 w-3.5" />
                            <span>Masuk / Daftar</span>
                          </button>
                        ) : null}
                        <GoogleSignInButton
                          loading={googleAuthLoading}
                          onClick={onSignInGoogle}
                        />
                      </div>
                    </div>

                    {googleAuthError ? (
                      <div
                        className="flex items-start gap-2 border-t pt-2.5 text-xs leading-relaxed text-rose-600 dark:text-rose-400"
                        style={{ borderColor: "var(--border-subtle)" }}
                        role="alert"
                      >
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>{googleAuthError}</span>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {errorBanner ? (
                  <div
                    className="flex items-start gap-2 border px-3.5 py-2.5 text-xs"
                    style={{
                      backgroundColor: "var(--bg-surface-muted)",
                      borderColor: "var(--border-strong)",
                      borderRadius: "var(--radius-control)",
                    }}
                    role="alert"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                    <span>{errorBanner}</span>
                  </div>
                ) : null}

                {/* Quick-Start Capability Cards (Always accessible for a vibrant home) */}
                <section className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h2
                      className="text-xs font-semibold"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Mulai cepat hari ini
                    </h2>
                    <span
                      className="font-mono text-[11px] tabular-nums"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {isUltraSaver ? "Hemat 0,25× Kredit" : "Tarif Standar 1×"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {quickStartCards.map((card, idx) => {
                      const Icon = card.icon;
                      const iconPalette = [
                        {
                          bg: "linear-gradient(135deg, rgba(220, 38, 38, 0.16), rgba(217, 119, 87, 0.20))",
                          fg: "#dc2626",
                        },
                        {
                          bg: "linear-gradient(135deg, rgba(16, 185, 129, 0.16), rgba(15, 118, 110, 0.18))",
                          fg: "#10b981",
                        },
                        {
                          bg: "linear-gradient(135deg, rgba(217, 119, 87, 0.16), rgba(180, 83, 9, 0.18))",
                          fg: "#d97757",
                        },
                        {
                          bg: "linear-gradient(135deg, rgba(220, 38, 38, 0.14), rgba(99, 102, 241, 0.16))",
                          fg: "#e11d48",
                        },
                      ][idx % 4];
                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={isStreaming}
                          onClick={() => void sendMessage(card.prompt)}
                          className="claude-card-hover flex items-start gap-3 border px-3.5 py-3 text-left disabled:opacity-50"
                          style={{
                            backgroundColor: "var(--bg-surface)",
                            borderColor: "var(--border-subtle)",
                            borderRadius: "var(--radius-control)",
                          }}
                        >
                          <span
                            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                            style={{
                              background: iconPalette.bg,
                              color: iconPalette.fg,
                            }}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold">
                              {card.title}
                            </div>
                            <p
                              className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              {card.prompt}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* Recent Artifacts Section (matching Claude Desktop Screenshot) */}
                {recentArtifacts.length > 0 ? (
                  <section className="space-y-3 pt-1">
                    <div className="flex items-center justify-between">
                      <h2
                        className="text-xs font-semibold"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Artefak terbaru
                      </h2>
                      <button
                        type="button"
                        onClick={onOpenArtifactsGallery}
                        className="inline-flex items-center gap-1 text-xs font-medium hover:underline"
                        style={{ color: "var(--text-muted)" }}
                      >
                        <span>Lihat semua</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {recentArtifacts.slice(0, 4).map((entry) => (
                        <ArtifactPreviewCard
                          key={`${entry.sessionId}-${entry.artifact.id}`}
                          entry={entry}
                          onSelect={onOpenArtifactEntry}
                        />
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
                <div className="mx-auto max-w-3xl space-y-6">
                  {messages.map((msg) => {
                    const isUser = msg.role === "user";
                    if (isUser) {
                      return (
                        <div key={msg.id} className="claude-enter flex justify-end">
                          <div
                            className="max-w-[82%] border px-4 py-2.5 text-[15px] leading-relaxed"
                            style={{
                              backgroundColor: "var(--bg-surface-muted)",
                              borderColor: "var(--border-subtle)",
                              color: "var(--text-primary)",
                              borderRadius: "var(--radius-card)",
                            }}
                          >
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={msg.id} className="claude-enter flex items-start gap-3.5">
                        <div className="mt-0.5 shrink-0" aria-hidden="true">
                          <HelperBrandLogo size="xs" />
                        </div>

                        <div className="min-w-0 flex-1 space-y-2.5">
                          {msg.agentSteps && msg.agentSteps.length > 0 ? (
                            <div
                              className="space-y-1 border-b pb-2 text-xs"
                              style={{
                                borderColor: "var(--border-subtle)",
                                color: "var(--text-secondary)",
                              }}
                            >
                              {msg.agentSteps.map((step, idx) => (
                                <div key={idx} className="font-medium">
                                  • {step}
                                </div>
                              ))}
                            </div>
                          ) : null}

                          {msg.toolSummary && msg.toolSummary.length > 0 ? (
                            <div
                              className="border-b pb-2 text-xs font-medium"
                              style={{
                                borderColor: "var(--border-subtle)",
                                color: "var(--accent)",
                              }}
                            >
                              {msg.toolSummary.map((item, idx) => (
                                <div key={idx}>{item}</div>
                              ))}
                            </div>
                          ) : null}

                          {msg.text ? (
                            <MarkdownMessage
                              text={msg.text}
                              messageId={msg.id}
                              onOpenArtifact={handleOpenArtifact}
                            />
                          ) : (
                            <span
                              className="text-xs"
                              style={{ color: "var(--text-muted)" }}
                            >
                              {msg.agentSteps && msg.agentSteps.length > 0
                                ? "Memproses data Workspace..."
                                : "Menyiapkan jawaban..."}
                            </span>
                          )}

                          {msg.pendingActions && msg.pendingActions.length > 0 ? (
                            <div className="space-y-2.5 pt-1">
                              {msg.pendingActions.map((act) => {
                                const isBusy = executingActionId === act.id;
                                return (
                                  <div
                                    key={act.id}
                                    className="space-y-2.5 border p-4"
                                    style={{
                                      backgroundColor: "var(--bg-surface)",
                                      borderColor: "var(--border-strong)",
                                      borderRadius: "var(--radius-control)",
                                    }}
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0">
                                        <div
                                          className="text-[11px] font-semibold uppercase tracking-wider"
                                          style={{ color: "var(--accent)" }}
                                        >
                                          Konfirmasi {act.serviceLabel}
                                        </div>
                                        <div className="mt-0.5 text-sm font-bold">
                                          {act.title}
                                        </div>
                                        <p
                                          className="mt-0.5 text-xs leading-relaxed"
                                          style={{ color: "var(--text-secondary)" }}
                                        >
                                          {act.summary}
                                        </p>
                                      </div>

                                      {act.status === "pending" ? (
                                        <ShieldAlert
                                          className="h-4 w-4 shrink-0"
                                          style={{ color: "var(--accent)" }}
                                        />
                                      ) : act.status === "executed" ? (
                                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                                      ) : (
                                        <XCircle className="h-4 w-4 shrink-0 text-rose-500" />
                                      )}
                                    </div>

                                    {act.payload.body ? (
                                      <pre
                                        className="max-h-36 overflow-y-auto whitespace-pre-wrap border p-2.5 font-sans text-xs"
                                        style={{
                                          backgroundColor: "var(--bg-canvas)",
                                          borderColor: "var(--border-subtle)",
                                          borderRadius: "var(--radius-control)",
                                        }}
                                      >
                                        {act.payload.body}
                                      </pre>
                                    ) : null}

                                    {act.status === "pending" ? (
                                      <div className="flex flex-wrap items-center gap-2">
                                        <button
                                          type="button"
                                          disabled={isBusy}
                                          onClick={() =>
                                            void handleApproveAction(msg.id, act)
                                          }
                                          className="inline-flex min-h-[34px] items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap hover:opacity-90 disabled:opacity-50"
                                          style={{
                                            backgroundColor: "var(--accent)",
                                            color: "var(--accent-contrast)",
                                            borderRadius: "var(--radius-control)",
                                          }}
                                        >
                                          <span>
                                            {isBusy
                                              ? "Menjalankan..."
                                              : "Setujui & Jalankan"}
                                          </span>
                                        </button>

                                        <button
                                          type="button"
                                          disabled={isBusy}
                                          onClick={() =>
                                            handleCancelAction(msg.id, act.id)
                                          }
                                          className="inline-flex min-h-[34px] items-center border px-3 py-1.5 text-xs font-medium whitespace-nowrap hover:opacity-80 disabled:opacity-50"
                                          style={{
                                            borderColor: "var(--border-strong)",
                                            borderRadius: "var(--radius-control)",
                                          }}
                                        >
                                          Batalkan
                                        </button>
                                      </div>
                                    ) : (
                                      <div
                                        className="text-xs font-medium"
                                        style={{
                                          color:
                                            act.status === "executed"
                                              ? "var(--accent)"
                                              : "var(--text-secondary)",
                                        }}
                                      >
                                        {act.resultMessage}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : null}

                          {msg.text && (msg.modelUsed || msg.usage) ? (
                            <div
                              className="font-mono text-[11px] tabular-nums"
                              style={{ color: "var(--text-muted)" }}
                            >
                              {msg.modelUsed}
                              {msg.thinkingUsed
                                ? ` · Thinking: ${msg.thinkingUsed}`
                                : ""}
                              {msg.usage?.totalTokens
                                ? ` · ${msg.usage.totalTokens.toLocaleString("id-ID")} token`
                                : ""}
                              {typeof msg.usage?.creditsCharged === "number"
                                ? ` · -${msg.usage.creditsCharged.toLocaleString("id-ID")} kredit`
                                : ""}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
              </div>

              {errorBanner ? (
                <div className="mx-auto w-full max-w-3xl px-4 pb-2">
                  <div
                    className="flex items-start gap-2 border px-3.5 py-2.5 text-xs"
                    style={{
                      backgroundColor: "var(--bg-surface-muted)",
                      borderColor: "var(--border-strong)",
                      borderRadius: "var(--radius-control)",
                    }}
                    role="alert"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                    <span>{errorBanner}</span>
                  </div>
                </div>
              ) : null}

              <div className="mx-auto w-full max-w-3xl px-3 pb-3 pt-1 sm:px-4 sm:pb-4">
                {renderComposer(false)}
              </div>
            </>
          )}
        </div>

        {/* Right Side-by-Side Kanvas on Desktop / Full-Screen Sheet on Mobile & Tablet */}
        {artifactOpen && sessionArtifacts.length > 0 ? (
          <div className="fixed inset-0 z-50 bg-black/55 p-2 sm:p-4 lg:static lg:z-auto lg:w-[45%] lg:min-w-[380px] lg:shrink-0 lg:bg-transparent lg:p-3 lg:pl-0">
            <ArtifactPanel
              artifacts={sessionArtifacts}
              activeArtifactId={activeArtifactId}
              onSelectArtifact={setActiveArtifactId}
              onSaveToNote={handleSaveArtifactToNote}
              onClose={() => setArtifactOpen(false)}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
