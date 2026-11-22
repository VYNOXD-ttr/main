import { PanelLeftOpen, SquarePen } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AccountAuthModal } from "./components/AccountAuthModal";
import type { SessionArtifactEntry } from "./components/ArtifactPreviewCard";
import { ArtifactsGallerySection } from "./components/ArtifactsGallerySection";
import { ChatSandboxSection } from "./components/ChatSandboxSection";
import { ThemeToggleTabs } from "./components/ClaudeMark";
import { DailyTasksSection } from "./components/DailyTasksSection";
import { GptSidebar } from "./components/GptSidebar";
import { extractArtifactsFromText } from "./components/MarkdownMessage";
import { SettingsSection } from "./components/SettingsSection";
import { ASSISTANT_PRESETS, THEME_PRESETS } from "./data/presetsAndProviders";
import type {
  AssistantConfig,
  ChatMessage,
  ChatSession,
  DailyTask,
  NavTab,
  QuickNote,
  SettingsTabId,
  ThemePreferences,
  ThinkingLevelOption,
  TokenUsageStats,
  TokenUsageSummary,
} from "./types/app";
import {
  computeCreditCharge,
  createEmptyCreditStats,
  CREDIT_LIMIT_PER_USER,
  loadCreditStatsForUser,
  saveCreditStatsForUser,
} from "./utils/creditQuota";
import {
  formatGoogleAuthError,
  initWorkspaceAuth,
  signInGoogleWorkspace,
  signOutGoogleWorkspace,
} from "./utils/googleWorkspace";
import {
  loadActiveLocalSession,
  loginLocalAccount,
  logoutLocalAccount,
  registerLocalAccount,
  type LocalAppAccountSession,
} from "./utils/localAccounts";

const STORAGE_KEYS = {
  theme: "helperid_theme_v3",
  assistant: "helperid_assistant_v3",
  sessions: "helperid_sessions_v1",
  tasks: "helperid_daily_tasks_v1",
  notes: "helperid_quick_notes_v1",
};

const DEFAULT_THEME: ThemePreferences = {
  preset: "warm-paper",
  accent: "crimson-terracotta",
  fontScale: "standard",
  radius: "balanced",
};

const DEFAULT_ASSISTANT: AssistantConfig = {
  ...ASSISTANT_PRESETS[0].config,
  model: "gemini-4-hydrogen",
  thinkingLevel: "LOW",
  ultraSaverMode: true,
};

function sanitizeThinkingLevel(val: unknown): ThinkingLevelOption {
  if (val === "LOW" || val === "MEDIUM" || val === "HIGH" || val === "XHIGH") {
    return val;
  }
  return "LOW";
}

function loadAssistantConfig(): AssistantConfig {
  const merged = readStorage<AssistantConfig>(
    STORAGE_KEYS.assistant,
    DEFAULT_ASSISTANT,
  );
  return {
    ...merged,
    model: "gemini-4-hydrogen",
    thinkingLevel: sanitizeThinkingLevel(merged.thinkingLevel),
    tokenSaverMode:
      typeof merged.tokenSaverMode === "boolean" ? merged.tokenSaverMode : true,
    ultraSaverMode:
      typeof merged.ultraSaverMode === "boolean" ? merged.ultraSaverMode : true,
    agentWebSearchEnabled:
      typeof merged.agentWebSearchEnabled === "boolean"
        ? merged.agentWebSearchEnabled
        : false,
  };
}

function createEmptySession(): ChatSession {
  return {
    id: `s-${Date.now()}`,
    title: "Obrolan Baru",
    messages: [],
    pinned: false,
    updatedAt: Date.now(),
  };
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...(JSON.parse(raw) as Partial<T>) };
  } catch {
    return fallback;
  }
}

function readArrayStorage<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

const TAB_LABELS: Record<NavTab, string> = {
  sandbox: "Asisten Chat",
  tasks: "Tugas & Proyek",
  artifacts: "Artefak",
  settings: "Pengaturan",
};

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>("sandbox");
  const [settingsSubTab, setSettingsSubTab] =
    useState<SettingsTabId>("workspace");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth >= 1024 : true,
  );
  const [queuedPrompt, setQueuedPrompt] = useState<string | null>(null);
  const [requestedArtifactId, setRequestedArtifactId] = useState<string | null>(
    null,
  );

  const [googleUserEmail, setGoogleUserEmail] = useState<string | null>(null);
  const [googleUserName, setGoogleUserName] = useState<string | null>(null);
  const [googleAuthLoading, setGoogleAuthLoading] = useState(false);
  const [googleAuthError, setGoogleAuthError] = useState<string | null>(null);
  const [localAccount, setLocalAccount] =
    useState<LocalAppAccountSession | null>(() => loadActiveLocalSession());
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "register">(
    "login",
  );

  const activeUserEmail = googleUserEmail || localAccount?.email || null;
  const activeUserName = googleUserName || localAccount?.displayName || null;

  const [themePreferences, setThemePreferences] = useState<ThemePreferences>(() =>
    readStorage(STORAGE_KEYS.theme, DEFAULT_THEME),
  );

  const [assistantConfig, setAssistantConfig] = useState<AssistantConfig>(() =>
    loadAssistantConfig(),
  );

  const [tokenUsage, setTokenUsage] = useState<TokenUsageStats>(() =>
    loadCreditStatsForUser(loadActiveLocalSession()?.email || null),
  );

  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = readArrayStorage<ChatSession>(STORAGE_KEYS.sessions, []);
    return saved.length > 0 ? saved : [createEmptySession()];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(
    () => sessions[0]?.id || "",
  );

  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>(() =>
    readArrayStorage<DailyTask>(STORAGE_KEYS.tasks, []),
  );

  const [quickNotes, setQuickNotes] = useState<QuickNote[]>(() =>
    readArrayStorage<QuickNote>(STORAGE_KEYS.notes, []),
  );

  const isCurrentDark =
    THEME_PRESETS.find((t) => t.id === themePreferences.preset)?.isDark ?? false;

  const allArtifacts = useMemo<SessionArtifactEntry[]>(() => {
    const collected: SessionArtifactEntry[] = [];
    for (const session of sessions) {
      for (const msg of session.messages) {
        if (msg.role !== "model" || !msg.text) continue;
        const extracted = extractArtifactsFromText(msg.text, msg.id);
        for (const artifact of extracted) {
          collected.push({
            artifact,
            sessionId: session.id,
            sessionTitle: session.title,
            timestamp: msg.timestamp || session.updatedAt,
          });
        }
      }
    }
    return collected.sort((a, b) => b.timestamp - a.timestamp);
  }, [sessions]);

  useEffect(() => {
    const unsubscribe = initWorkspaceAuth(
      (user) => {
        setGoogleUserEmail(user.email);
        setGoogleUserName(user.displayName);
      },
      () => {
        setGoogleUserEmail(null);
        setGoogleUserName(null);
      },
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const presetMeta = THEME_PRESETS.find((t) => t.id === themePreferences.preset);
    const isDark = presetMeta?.isDark ?? false;

    root.classList.toggle("dark", isDark);
    root.setAttribute("data-theme", themePreferences.preset);
    root.setAttribute("data-accent", themePreferences.accent);
    root.setAttribute("data-font-scale", themePreferences.fontScale);
    root.setAttribute("data-radius", themePreferences.radius);

    try {
      window.localStorage.setItem(
        STORAGE_KEYS.theme,
        JSON.stringify(themePreferences),
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [themePreferences]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEYS.assistant,
        JSON.stringify(assistantConfig),
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [assistantConfig]);

  const loadedCreditAccountRef = useRef<string>(
    loadActiveLocalSession()?.email || "guest",
  );

  useEffect(() => {
    const targetAccount = activeUserEmail || "guest";
    if (loadedCreditAccountRef.current !== targetAccount) {
      loadedCreditAccountRef.current = targetAccount;
      setTokenUsage((prev) => {
        const stored = loadCreditStatsForUser(activeUserEmail);
        return {
          ...stored,
          sessionPromptTokens: prev.sessionPromptTokens,
          sessionOutputTokens: prev.sessionOutputTokens,
          sessionTotalTokens: prev.sessionTotalTokens,
          sessionRequests: prev.sessionRequests,
          sessionCreditsUsed: prev.sessionCreditsUsed,
        };
      });
      return;
    }
    saveCreditStatsForUser(activeUserEmail, tokenUsage);
  }, [activeUserEmail, tokenUsage]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          STORAGE_KEYS.sessions,
          JSON.stringify(sessions.slice(0, 20)),
        );
      } catch {
        // Ignore storage quota errors
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [sessions]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEYS.tasks,
        JSON.stringify(dailyTasks.slice(0, 100)),
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [dailyTasks]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEYS.notes,
        JSON.stringify(quickNotes.slice(0, 50)),
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [quickNotes]);

  const handleChangeThemeMode = (mode: "light" | "dark") => {
    setThemePreferences((prev) => ({
      ...prev,
      preset:
        mode === "light"
          ? prev.preset === "light-clean"
            ? "light-clean"
            : "warm-paper"
          : prev.preset === "ocean-slate"
            ? "ocean-slate"
            : "dark-studio",
    }));
  };

  const handleSignInGoogle = async () => {
    setGoogleAuthError(null);
    setGoogleAuthLoading(true);
    try {
      const { user } = await signInGoogleWorkspace();
      setGoogleUserEmail(user.email);
      setGoogleUserName(user.displayName);
      setAuthModalOpen(false);
    } catch (err) {
      const msg = formatGoogleAuthError(err);
      setGoogleAuthError(msg);
    } finally {
      setGoogleAuthLoading(false);
    }
  };

  const handleSignOutGoogle = async () => {
    setGoogleAuthError(null);
    setGoogleAuthLoading(true);
    try {
      await signOutGoogleWorkspace();
      setGoogleUserEmail(null);
      setGoogleUserName(null);
    } catch (err) {
      const msg = formatGoogleAuthError(err);
      setGoogleAuthError(msg);
    } finally {
      setGoogleAuthLoading(false);
    }
  };

  const handleLoginLocal = async (email: string, password: string) => {
    const session = await loginLocalAccount({ email, password });
    setLocalAccount(session);
  };

  const handleRegisterLocal = async (
    displayName: string,
    email: string,
    password: string,
  ) => {
    const session = await registerLocalAccount({
      displayName,
      email,
      password,
    });
    setLocalAccount(session);
  };

  const handleLogoutLocal = () => {
    logoutLocalAccount();
    setLocalAccount(null);
  };

  const openAuthModal = (mode: "login" | "register" = "login") => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const handleRecordUsage = (usage: TokenUsageSummary) => {
    const isUltra = assistantConfig.ultraSaverMode !== false;
    const computed =
      typeof usage.creditsCharged === "number"
        ? {
            creditsCharged: usage.creditsCharged,
            creditsSaved: usage.creditsSaved || 0,
          }
        : computeCreditCharge(usage.totalTokens || 0, isUltra);

    setTokenUsage((prev) => ({
      sessionPromptTokens: prev.sessionPromptTokens + (usage.promptTokens || 0),
      sessionOutputTokens: prev.sessionOutputTokens + (usage.outputTokens || 0),
      sessionTotalTokens: prev.sessionTotalTokens + (usage.totalTokens || 0),
      sessionRequests: prev.sessionRequests + 1,
      allTimeTotalTokens: prev.allTimeTotalTokens + (usage.totalTokens || 0),
      allTimeRequests: prev.allTimeRequests + 1,
      creditLimit: prev.creditLimit || CREDIT_LIMIT_PER_USER,
      creditsUsed: (prev.creditsUsed || 0) + computed.creditsCharged,
      sessionCreditsUsed: (prev.sessionCreditsUsed || 0) + computed.creditsCharged,
      creditsSavedEstimated:
        (prev.creditsSavedEstimated || 0) + computed.creditsSaved,
      lastUpdatedAt: Date.now(),
    }));
  };

  const handleResetTokenUsage = () => {
    setTokenUsage({ ...createEmptyCreditStats(), lastUpdatedAt: Date.now() });
  };

  const handleCreateSession = () => {
    const fresh = createEmptySession();
    setSessions((prev) => [fresh, ...prev]);
    setActiveSessionId(fresh.id);
    setActiveTab("sandbox");
  };

  const handleTogglePinSession = (sessionId: string) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId ? { ...s, pinned: !s.pinned } : s,
      ),
    );
  };

  const handleDeleteSession = (sessionId: string) => {
    setSessions((prev) => {
      const remaining = prev.filter((s) => s.id !== sessionId);
      if (remaining.length === 0) {
        const fresh = createEmptySession();
        setActiveSessionId(fresh.id);
        return [fresh];
      }
      if (activeSessionId === sessionId) {
        setActiveSessionId(remaining[0].id);
      }
      return remaining;
    });
  };

  const handleUpdateSessionMessages = (
    sessionId: string,
    nextMessages: ChatMessage[],
  ) => {
    setSessions((prev) =>
      prev.map((session) => {
        if (session.id !== sessionId) return session;
        const firstUserText = nextMessages.find((m) => m.role === "user")?.text;
        const autoTitle =
          firstUserText && session.title === "Obrolan Baru"
            ? firstUserText.slice(0, 42) + (firstUserText.length > 42 ? "..." : "")
            : nextMessages.length === 0
              ? "Obrolan Baru"
              : session.title;
        return {
          ...session,
          title: autoTitle,
          messages: nextMessages.slice(-40),
          updatedAt: Date.now(),
        };
      }),
    );
  };

  const handleOpenArtifactEntry = (entry: SessionArtifactEntry) => {
    setActiveSessionId(entry.sessionId);
    setRequestedArtifactId(entry.artifact.id);
    setActiveTab("sandbox");
  };

  const handleStartPromptInChat = (prompt: string) => {
    const fresh = createEmptySession();
    setSessions((prev) => [fresh, ...prev]);
    setActiveSessionId(fresh.id);
    setQueuedPrompt(prompt);
    setActiveTab("sandbox");
  };

  const activeSession =
    sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const pendingTaskCount = dailyTasks.filter((t) => !t.done).length;
  const creditsRemaining = Math.max(
    0,
    (tokenUsage.creditLimit || CREDIT_LIMIT_PER_USER) -
      (tokenUsage.creditsUsed || 0),
  );
  const isUltraSaver = assistantConfig.ultraSaverMode !== false;

  return (
    <div
      className="flex h-screen overflow-hidden transition-colors duration-150"
      style={{
        backgroundColor: "var(--bg-canvas)",
        color: "var(--text-primary)",
      }}
    >
      <GptSidebar
        open={sidebarOpen}
        activeTab={activeTab}
        sessions={sessions}
        activeSessionId={activeSession?.id || ""}
        pendingTaskCount={pendingTaskCount}
        artifactCount={allArtifacts.length}
        isStreaming={false}
        activeUserEmail={activeUserEmail}
        activeUserName={activeUserName}
        isGoogleConnected={Boolean(googleUserEmail)}
        tokenSaverMode={assistantConfig.tokenSaverMode}
        ultraSaverMode={isUltraSaver}
        creditsRemaining={creditsRemaining}
        onClose={() => setSidebarOpen(false)}
        onSelectTab={setActiveTab}
        onCreateSession={handleCreateSession}
        onSelectSession={setActiveSessionId}
        onTogglePinSession={handleTogglePinSession}
        onDeleteSession={handleDeleteSession}
        onOpenAuthModal={() => openAuthModal("login")}
      />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {activeTab === "sandbox" && activeSession ? (
          <ChatSandboxSection
            sidebarOpen={sidebarOpen}
            isDark={isCurrentDark}
            config={assistantConfig}
            activeSession={activeSession}
            dailyTasks={dailyTasks}
            quickNotes={quickNotes}
            queuedPrompt={queuedPrompt}
            requestedArtifactId={requestedArtifactId}
            recentArtifacts={allArtifacts.slice(0, 4)}
            activeUserEmail={activeUserEmail}
            activeUserName={activeUserName}
            googleUserEmail={googleUserEmail}
            googleUserName={googleUserName}
            googleAuthLoading={googleAuthLoading}
            googleAuthError={googleAuthError}
            creditStats={tokenUsage}
            onChangeThemeMode={handleChangeThemeMode}
            onConsumeQueuedPrompt={() => setQueuedPrompt(null)}
            onConsumeRequestedArtifact={() => setRequestedArtifactId(null)}
            onOpenSidebar={() => setSidebarOpen(true)}
            onCreateSession={handleCreateSession}
            onChangeConfig={setAssistantConfig}
            onUpdateSessionMessages={handleUpdateSessionMessages}
            onUpdateDailyTasks={setDailyTasks}
            onUpdateQuickNotes={setQuickNotes}
            onOpenTasks={() => setActiveTab("tasks")}
            onOpenArtifactsGallery={() => setActiveTab("artifacts")}
            onOpenArtifactEntry={handleOpenArtifactEntry}
            onEditStudio={() => {
              setSettingsSubTab("studio");
              setActiveTab("settings");
            }}
            onOpenGoogleSettings={() => {
              setSettingsSubTab("workspace");
              setActiveTab("settings");
            }}
            onOpenCreditSettings={() => {
              setSettingsSubTab("workspace");
              setActiveTab("settings");
            }}
            onOpenAuthModal={() => openAuthModal("login")}
            onSignInGoogle={() => void handleSignInGoogle()}
            onRecordUsage={handleRecordUsage}
          />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <header
              className="flex h-14 shrink-0 items-center justify-between gap-3 border-b px-4"
              style={{
                backgroundColor: "var(--bg-canvas)",
                borderColor: "var(--border-subtle)",
              }}
            >
              <div className="flex items-center gap-2.5">
                {!sidebarOpen ? (
                  <button
                    type="button"
                    onClick={() => setSidebarOpen(true)}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center border hover:opacity-80"
                    style={{
                      borderColor: "var(--border-subtle)",
                      borderRadius: "var(--radius-control)",
                    }}
                    aria-label="Buka sidebar"
                  >
                    <PanelLeftOpen className="h-4 w-4" />
                  </button>
                ) : null}
                <h1 className="font-display text-sm font-bold">
                  {TAB_LABELS[activeTab]}
                </h1>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCreateSession}
                  className="inline-flex min-h-[34px] items-center gap-1.5 border px-3 py-1.5 text-xs font-semibold whitespace-nowrap hover:opacity-80"
                  style={{
                    borderColor: "var(--border-strong)",
                    borderRadius: "var(--radius-control)",
                  }}
                >
                  <SquarePen className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Obrolan Baru</span>
                </button>

                <ThemeToggleTabs
                  isDark={isCurrentDark}
                  onChangeMode={handleChangeThemeMode}
                />
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
              <div className="mx-auto max-w-6xl">
                {activeTab === "tasks" ? (
                  <DailyTasksSection
                    dailyTasks={dailyTasks}
                    quickNotes={quickNotes}
                    onUpdateDailyTasks={setDailyTasks}
                    onUpdateQuickNotes={setQuickNotes}
                    onPrioritizeWithAi={() => {
                      setQueuedPrompt(
                        "Berdasarkan daftar tugas saya saat ini, tolong bantu susunkan prioritas dan langkah paling realistis untuk hari ini.",
                      );
                      setActiveTab("sandbox");
                    }}
                  />
                ) : null}

                {activeTab === "artifacts" ? (
                  <ArtifactsGallerySection
                    entries={allArtifacts}
                    onOpenArtifactEntry={handleOpenArtifactEntry}
                    onStartPromptInChat={handleStartPromptInChat}
                  />
                ) : null}

                {activeTab === "settings" ? (
                  <SettingsSection
                    activeSubTab={settingsSubTab}
                    onSelectSubTab={setSettingsSubTab}
                    assistantConfig={assistantConfig}
                    onChangeAssistantConfig={setAssistantConfig}
                    themePreferences={themePreferences}
                    onChangeThemePreferences={setThemePreferences}
                    onResetTheme={() => setThemePreferences(DEFAULT_THEME)}
                    onBackToChat={() => setActiveTab("sandbox")}
                    activeUserEmail={activeUserEmail}
                    activeUserName={activeUserName}
                    localAccount={localAccount}
                    googleUserEmail={googleUserEmail}
                    googleUserName={googleUserName}
                    googleAuthLoading={googleAuthLoading}
                    googleAuthError={googleAuthError}
                    onOpenAuthModal={() => openAuthModal("login")}
                    onLogoutLocal={handleLogoutLocal}
                    onSignInGoogle={() => void handleSignInGoogle()}
                    onSignOutGoogle={() => void handleSignOutGoogle()}
                    tokenUsage={tokenUsage}
                    onResetTokenUsage={handleResetTokenUsage}
                  />
                ) : null}
              </div>
            </div>
          </div>
        )}
      </main>

      <AccountAuthModal
        open={authModalOpen}
        initialMode={authModalMode}
        googleAuthLoading={googleAuthLoading}
        googleAuthError={googleAuthError}
        onClose={() => setAuthModalOpen(false)}
        onLoginLocal={handleLoginLocal}
        onRegisterLocal={handleRegisterLocal}
        onSignInGoogle={handleSignInGoogle}
      />
    </div>
  );
}
