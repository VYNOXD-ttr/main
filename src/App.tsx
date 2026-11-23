import type { User } from "firebase/auth";
import {
  FolderKanban,
  Layers,
  MessageSquare,
  PanelLeftOpen,
  SlidersHorizontal,
  SquarePen,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AccountAuthModal } from "./components/AccountAuthModal";
import type { SessionArtifactEntry } from "./components/ArtifactPreviewCard";
import { ArtifactsGallerySection } from "./components/ArtifactsGallerySection";
import { AuthWelcomeScreen } from "./components/AuthWelcomeScreen";
import { ChatSandboxSection } from "./components/ChatSandboxSection";
import { HelperBrandLogo, ThemeToggleTabs } from "./components/ClaudeMark";
import { DailyTasksSection } from "./components/DailyTasksSection";
import { GptSidebar } from "./components/GptSidebar";
import { extractArtifactsFromText } from "./components/MarkdownMessage";
import { OfflineStatusBanner } from "./components/PWAInstallBanner";
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
  deleteNoteFromFirestore,
  deleteSessionFromFirestore,
  deleteTaskFromFirestore,
  ensureUserWorkspaceProfile,
  loginWithEmailPassword,
  registerWithEmailPassword,
  subscribeUserWorkspace,
  syncCreditStatsToFirestore,
  testFirestoreConnection,
  upsertNoteToFirestore,
  upsertSessionToFirestore,
  upsertTaskToFirestore,
} from "./utils/firebaseClient";
import {
  formatGoogleAuthError,
  initWorkspaceAuth,
  signInGoogleAccount,
  signInGoogleWorkspace,
  signOutGoogleWorkspace,
} from "./utils/googleWorkspace";

const STORAGE_KEYS = {
  theme: "helperid_theme_v3",
  assistant: "helperid_assistant_v3",
  sessions: "helperid_sessions_v1",
  tasks: "helperid_daily_tasks_v1",
  notes: "helperid_quick_notes_v1",
  guestSessionFlag: "helperid_guest_mode_v1",
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
    id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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

function readGuestModeFlag(): boolean {
  try {
    return window.sessionStorage.getItem(STORAGE_KEYS.guestSessionFlag) === "1";
  } catch {
    return false;
  }
}

const TAB_LABELS: Record<NavTab, string> = {
  sandbox: "Asisten Chat",
  tasks: "Tugas & Proyek",
  artifacts: "Artefak",
  settings: "Pengaturan",
};

const MOBILE_NAV_ITEMS: Array<{
  id: NavTab;
  label: string;
  icon: typeof MessageSquare;
}> = [
  { id: "sandbox", label: "Chat", icon: MessageSquare },
  { id: "tasks", label: "Tugas", icon: FolderKanban },
  { id: "artifacts", label: "Artefak", icon: Layers },
  { id: "settings", label: "Pengaturan", icon: SlidersHorizontal },
];

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

  // Firebase Auth + Guest Gate state
  const [authResolved, setAuthResolved] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [workspaceOAuthToken, setWorkspaceOAuthToken] = useState<string | null>(
    null,
  );
  const [guestModeAccepted, setGuestModeAccepted] = useState<boolean>(() =>
    readGuestModeFlag(),
  );
  const [googleAuthLoading, setGoogleAuthLoading] = useState(false);
  const [googleAuthError, setGoogleAuthError] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "register">(
    "login",
  );

  const activeUserEmail = firebaseUser?.email || null;
  const activeUserName =
    firebaseUser?.displayName ||
    (firebaseUser?.email ? firebaseUser.email.split("@")[0] : null);
  const googleWorkspaceEmail = workspaceOAuthToken
    ? firebaseUser?.email || null
    : null;

  const [themePreferences, setThemePreferences] = useState<ThemePreferences>(() =>
    readStorage(STORAGE_KEYS.theme, DEFAULT_THEME),
  );

  const [assistantConfig, setAssistantConfig] = useState<AssistantConfig>(() =>
    loadAssistantConfig(),
  );

  const [tokenUsage, setTokenUsage] = useState<TokenUsageStats>(() =>
    loadCreditStatsForUser(null),
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

  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;
  const tasksRef = useRef(dailyTasks);
  tasksRef.current = dailyTasks;
  const notesRef = useRef(quickNotes);
  notesRef.current = quickNotes;
  const tokenUsageRef = useRef(tokenUsage);
  tokenUsageRef.current = tokenUsage;
  const sessionSyncTimersRef = useRef<Record<string, number>>({});

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

  // Verify Firestore connection once on startup
  useEffect(() => {
    void testFirestoreConnection();
  }, []);

  // Listen for Firebase Auth state (persisted forever via browserLocalPersistence)
  useEffect(() => {
    const unsubscribe = initWorkspaceAuth((user, token) => {
      setFirebaseUser(user);
      setWorkspaceOAuthToken(token);
      setAuthResolved(true);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to Cloud Firestore workspace when signed in
  useEffect(() => {
    if (!firebaseUser) return;

    let cancelled = false;
    let unsubWorkspace: (() => void) | null = null;
    let seededInitialSession = false;

    const startSync = async () => {
      await ensureUserWorkspaceProfile(firebaseUser);
      if (cancelled) return;

      unsubWorkspace = subscribeUserWorkspace(firebaseUser.uid, {
        onCreditProfile: (partial) => {
          setTokenUsage((prev) => ({
            ...prev,
            creditLimit: partial.creditLimit || CREDIT_LIMIT_PER_USER,
            creditsUsed: partial.creditsUsed ?? prev.creditsUsed,
            creditsSavedEstimated:
              partial.creditsSavedEstimated ?? prev.creditsSavedEstimated,
            allTimeTotalTokens:
              partial.allTimeTotalTokens ?? prev.allTimeTotalTokens,
            allTimeRequests: partial.allTimeRequests ?? prev.allTimeRequests,
          }));
        },
        onSessions: (cloudSessions) => {
          if (cloudSessions.length === 0) {
            if (!seededInitialSession) {
              seededInitialSession = true;
              const fresh = createEmptySession();
              setSessions([fresh]);
              setActiveSessionId(fresh.id);
              void upsertSessionToFirestore(firebaseUser.uid, fresh);
            }
            return;
          }
          setSessions(cloudSessions);
          setActiveSessionId((prevId) =>
            cloudSessions.some((s) => s.id === prevId)
              ? prevId
              : cloudSessions[0].id,
          );
        },
        onTasks: (cloudTasks) => {
          setDailyTasks(cloudTasks);
        },
        onNotes: (cloudNotes) => {
          setQuickNotes(cloudNotes);
        },
      });
    };

    void startSync();

    return () => {
      cancelled = true;
      unsubWorkspace?.();
      for (const timerId of Object.values(sessionSyncTimersRef.current)) {
        window.clearTimeout(timerId);
      }
      sessionSyncTimersRef.current = {};
    };
  }, [firebaseUser?.uid]);

  // Apply theme CSS attributes
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

  // Guest-mode localStorage persistence (only when NOT signed into Firebase Cloud)
  useEffect(() => {
    if (firebaseUser) return;
    saveCreditStatsForUser(null, tokenUsage);
  }, [firebaseUser, tokenUsage]);

  useEffect(() => {
    if (firebaseUser) return;
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
  }, [firebaseUser, sessions]);

  useEffect(() => {
    if (firebaseUser) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEYS.tasks,
        JSON.stringify(dailyTasks.slice(0, 100)),
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [firebaseUser, dailyTasks]);

  useEffect(() => {
    if (firebaseUser) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEYS.notes,
        JSON.stringify(quickNotes.slice(0, 50)),
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [firebaseUser, quickNotes]);

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

  const handleContinueAsGuest = () => {
    setGuestModeAccepted(true);
    try {
      window.sessionStorage.setItem(STORAGE_KEYS.guestSessionFlag, "1");
    } catch {
      // Ignore storage errors
    }
  };

  const handleSignInGoogleAccount = async () => {
    setGoogleAuthError(null);
    setGoogleAuthLoading(true);
    try {
      const { user } = await signInGoogleAccount();
      setFirebaseUser(user);
      setWorkspaceOAuthToken(null);
      setAuthModalOpen(false);
    } catch (err) {
      const msg = formatGoogleAuthError(err);
      setGoogleAuthError(msg);
    } finally {
      setGoogleAuthLoading(false);
    }
  };

  const handleLinkGoogleWorkspace = async () => {
    setGoogleAuthError(null);
    setGoogleAuthLoading(true);
    try {
      const { user, accessToken } = await signInGoogleWorkspace();
      setFirebaseUser(user);
      setWorkspaceOAuthToken(accessToken);
      setAuthModalOpen(false);
    } catch (err) {
      const msg = formatGoogleAuthError(err);
      setGoogleAuthError(msg);
    } finally {
      setGoogleAuthLoading(false);
    }
  };

  const handleLoginEmail = async (email: string, password: string) => {
    const user = await loginWithEmailPassword(email, password);
    setFirebaseUser(user);
    setAuthModalOpen(false);
  };

  const handleRegisterEmail = async (
    displayName: string,
    email: string,
    password: string,
  ) => {
    const user = await registerWithEmailPassword(displayName, email, password);
    setFirebaseUser(user);
    setAuthModalOpen(false);
  };

  const handleSignOutToWelcome = async () => {
    setGoogleAuthError(null);
    setGoogleAuthLoading(true);
    try {
      await signOutGoogleWorkspace();
      setFirebaseUser(null);
      setWorkspaceOAuthToken(null);
      setGuestModeAccepted(false);
      try {
        window.sessionStorage.removeItem(STORAGE_KEYS.guestSessionFlag);
      } catch {
        // Ignore storage errors
      }
      // Restore clean guest state so cloud account data never remains in UI
      const localSessions = readArrayStorage<ChatSession>(
        STORAGE_KEYS.sessions,
        [],
      );
      const nextSessions =
        localSessions.length > 0 ? localSessions : [createEmptySession()];
      setSessions(nextSessions);
      setActiveSessionId(nextSessions[0].id);
      setDailyTasks(readArrayStorage<DailyTask>(STORAGE_KEYS.tasks, []));
      setQuickNotes(readArrayStorage<QuickNote>(STORAGE_KEYS.notes, []));
      setTokenUsage(loadCreditStatsForUser(null));
      setActiveTab("sandbox");
    } catch (err) {
      setGoogleAuthError(formatGoogleAuthError(err));
    } finally {
      setGoogleAuthLoading(false);
    }
  };

  const openAuthModal = (mode: "login" | "register" = "login") => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const scheduleSessionSync = (uid: string, updatedSession: ChatSession) => {
    const existingTimer = sessionSyncTimersRef.current[updatedSession.id];
    if (existingTimer) {
      window.clearTimeout(existingTimer);
    }
    sessionSyncTimersRef.current[updatedSession.id] = window.setTimeout(() => {
      delete sessionSyncTimersRef.current[updatedSession.id];
      const latest =
        sessionsRef.current.find((s) => s.id === updatedSession.id) ||
        updatedSession;
      void upsertSessionToFirestore(uid, latest);
    }, 650);
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

    const prev = tokenUsageRef.current;
    const nextStats: TokenUsageStats = {
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
    };
    setTokenUsage(nextStats);
    if (firebaseUser) {
      void syncCreditStatsToFirestore(firebaseUser, nextStats);
    }
  };

  const handleResetTokenUsage = () => {
    const nextStats: TokenUsageStats = {
      ...createEmptyCreditStats(),
      lastUpdatedAt: Date.now(),
    };
    setTokenUsage(nextStats);
    if (firebaseUser) {
      void syncCreditStatsToFirestore(firebaseUser, nextStats);
    }
  };

  const handleCreateSession = () => {
    const fresh = createEmptySession();
    setSessions((prev) => [fresh, ...prev]);
    setActiveSessionId(fresh.id);
    setActiveTab("sandbox");
    if (firebaseUser) {
      void upsertSessionToFirestore(firebaseUser.uid, fresh);
    }
  };

  const handleTogglePinSession = (sessionId: string) => {
    let targetUpdated: ChatSession | null = null;
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== sessionId) return s;
        targetUpdated = { ...s, pinned: !s.pinned };
        return targetUpdated;
      }),
    );
    if (firebaseUser && targetUpdated) {
      void upsertSessionToFirestore(firebaseUser.uid, targetUpdated);
    }
  };

  const handleDeleteSession = (sessionId: string) => {
    const prev = sessionsRef.current;
    const remaining = prev.filter((s) => s.id !== sessionId);
    if (remaining.length === 0) {
      const fresh = createEmptySession();
      setSessions([fresh]);
      setActiveSessionId(fresh.id);
      if (firebaseUser) {
        void deleteSessionFromFirestore(firebaseUser.uid, sessionId);
        void upsertSessionToFirestore(firebaseUser.uid, fresh);
      }
      return;
    }
    if (activeSessionId === sessionId) {
      setActiveSessionId(remaining[0].id);
    }
    setSessions(remaining);
    if (firebaseUser) {
      void deleteSessionFromFirestore(firebaseUser.uid, sessionId);
    }
  };

  const handleUpdateSessionMessages = (
    sessionId: string,
    nextMessages: ChatMessage[],
  ) => {
    let updatedSession: ChatSession | null = null;
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
        updatedSession = {
          ...session,
          title: autoTitle,
          messages: nextMessages.slice(-40),
          updatedAt: Date.now(),
        };
        return updatedSession;
      }),
    );
    if (firebaseUser && updatedSession) {
      scheduleSessionSync(firebaseUser.uid, updatedSession);
    }
  };

  const handleUpdateDailyTasks = (
    updater: (prev: DailyTask[]) => DailyTask[],
  ) => {
    const prev = tasksRef.current;
    const next = updater(prev);
    tasksRef.current = next;
    setDailyTasks(next);

    if (firebaseUser) {
      const prevMap = new Map<string, DailyTask>(prev.map((t) => [t.id, t]));
      const nextIds = new Set(next.map((t) => t.id));
      for (const task of next) {
        const old = prevMap.get(task.id);
        if (
          !old ||
          old.title !== task.title ||
          old.done !== task.done ||
          old.timeLabel !== task.timeLabel ||
          old.priority !== task.priority
        ) {
          void upsertTaskToFirestore(firebaseUser.uid, task);
        }
      }
      for (const old of prev) {
        if (!nextIds.has(old.id)) {
          void deleteTaskFromFirestore(firebaseUser.uid, old.id);
        }
      }
    }
  };

  const handleUpdateQuickNotes = (
    updater: (prev: QuickNote[]) => QuickNote[],
  ) => {
    const prev = notesRef.current;
    const next = updater(prev);
    notesRef.current = next;
    setQuickNotes(next);

    if (firebaseUser) {
      const prevMap = new Map<string, QuickNote>(prev.map((n) => [n.id, n]));
      const nextIds = new Set(next.map((n) => n.id));
      for (const note of next) {
        const old = prevMap.get(note.id);
        if (!old || old.title !== note.title || old.content !== note.content) {
          void upsertNoteToFirestore(firebaseUser.uid, note);
        }
      }
      for (const old of prev) {
        if (!nextIds.has(old.id)) {
          void deleteNoteFromFirestore(firebaseUser.uid, old.id);
        }
      }
    }
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
    if (firebaseUser) {
      void upsertSessionToFirestore(firebaseUser.uid, fresh);
    }
  };

  // Loading state while Firebase Auth checks saved browser session
  if (!authResolved) {
    return (
      <div
        className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 p-6"
        style={{
          backgroundColor: "var(--bg-canvas)",
          color: "var(--text-primary)",
        }}
      >
        <HelperBrandLogo size="lg" showWordmark layout="stacked" />
        <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
          Memeriksa sesi akun Anda...
        </p>
      </div>
    );
  }

  // First-screen Auth Welcome Gate when neither signed in nor Guest mode chosen
  if (!firebaseUser && !guestModeAccepted) {
    return (
      <AuthWelcomeScreen
        isDark={isCurrentDark}
        onChangeThemeMode={handleChangeThemeMode}
        googleAuthLoading={googleAuthLoading}
        googleAuthError={googleAuthError}
        onLoginEmail={handleLoginEmail}
        onRegisterEmail={handleRegisterEmail}
        onSignInGoogle={handleSignInGoogleAccount}
        onContinueAsGuest={handleContinueAsGuest}
      />
    );
  }

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
      className="flex h-[100dvh] w-full overflow-hidden transition-colors duration-150"
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
        isCloudSynced={Boolean(firebaseUser)}
        isGoogleConnected={Boolean(googleWorkspaceEmail)}
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
        onSignOut={() => void handleSignOutToWelcome()}
      />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <OfflineStatusBanner />

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
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
              isCloudSynced={Boolean(firebaseUser)}
              googleUserEmail={googleWorkspaceEmail}
              googleUserName={firebaseUser?.displayName || null}
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
              onUpdateDailyTasks={handleUpdateDailyTasks}
              onUpdateQuickNotes={handleUpdateQuickNotes}
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
              onSignInGoogle={() => void handleSignInGoogleAccount()}
              onRecordUsage={handleRecordUsage}
            />
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <header
                className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-3 sm:px-4"
                style={{
                  backgroundColor: "var(--bg-canvas)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                <div className="flex min-w-0 items-center gap-2">
                  {!sidebarOpen ? (
                    <button
                      type="button"
                      onClick={() => setSidebarOpen(true)}
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center border hover:opacity-80 sm:h-8 sm:w-8"
                      style={{
                        borderColor: "var(--border-subtle)",
                        borderRadius: "var(--radius-control)",
                      }}
                      aria-label="Buka sidebar"
                    >
                      <PanelLeftOpen className="h-4 w-4" />
                    </button>
                  ) : null}
                  <h1 className="truncate font-display text-sm font-bold">
                    {TAB_LABELS[activeTab]}
                  </h1>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCreateSession}
                    className="inline-flex min-h-[36px] items-center gap-1.5 border px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap hover:opacity-80 sm:px-3"
                    style={{
                      borderColor: "var(--border-strong)",
                      borderRadius: "var(--radius-control)",
                    }}
                    aria-label="Obrolan Baru"
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

              <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-8 sm:py-6">
                <div className="mx-auto max-w-6xl">
                  {activeTab === "tasks" ? (
                    <DailyTasksSection
                      dailyTasks={dailyTasks}
                      quickNotes={quickNotes}
                      onUpdateDailyTasks={handleUpdateDailyTasks}
                      onUpdateQuickNotes={handleUpdateQuickNotes}
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
                      isCloudSynced={Boolean(firebaseUser)}
                      googleUserEmail={googleWorkspaceEmail}
                      googleUserName={firebaseUser?.displayName || null}
                      googleAuthLoading={googleAuthLoading}
                      googleAuthError={googleAuthError}
                      onOpenAuthModal={() => openAuthModal("login")}
                      onSignOutAll={() => void handleSignOutToWelcome()}
                      onSignInGoogle={() => void handleSignInGoogleAccount()}
                      onLinkGoogleWorkspace={() => void handleLinkGoogleWorkspace()}
                      tokenUsage={tokenUsage}
                      onResetTokenUsage={handleResetTokenUsage}
                    />
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Bottom Navigation Bar (< 768px) */}
        <nav
          aria-label="Navigasi Utama Mobile"
          className="grid shrink-0 grid-cols-4 border-t pb-safe md:hidden"
          style={{
            backgroundColor: "var(--bg-surface)",
            borderColor: "var(--border-subtle)",
          }}
        >
          {MOBILE_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            const badge =
              item.id === "tasks" && pendingTaskCount > 0
                ? pendingTaskCount
                : item.id === "artifacts" && allArtifacts.length > 0
                  ? allArtifacts.length
                  : null;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className="relative flex min-h-[52px] flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[11px] font-semibold transition-colors"
                style={{
                  color: active ? "var(--accent)" : "var(--text-muted)",
                }}
              >
                {active ? (
                  <span
                    className="absolute top-0 left-1/4 right-1/4 h-[2px]"
                    style={{ background: "var(--accent-gradient)" }}
                    aria-hidden="true"
                  />
                ) : null}
                <div className="relative">
                  <Icon className="h-4 w-4" />
                  {badge !== null ? (
                    <span
                      className="absolute -top-1.5 -right-2.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full px-1 font-mono text-[9px] font-bold"
                      style={{
                        backgroundColor: "var(--accent)",
                        color: "var(--accent-contrast)",
                      }}
                    >
                      {badge > 99 ? "99+" : badge}
                    </span>
                  ) : null}
                </div>
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </main>

      <AccountAuthModal
        open={authModalOpen}
        initialMode={authModalMode}
        googleAuthLoading={googleAuthLoading}
        googleAuthError={googleAuthError}
        onClose={() => setAuthModalOpen(false)}
        onLoginEmail={handleLoginEmail}
        onRegisterEmail={handleRegisterEmail}
        onSignInGoogle={handleSignInGoogleAccount}
      />
    </div>
  );
}
