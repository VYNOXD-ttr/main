import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type Auth,
  type User,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Firestore,
  type Unsubscribe,
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import type {
  ChatMessage,
  ChatSession,
  DailyTask,
  QuickNote,
  TokenUsageStats,
} from "../types/app";
import { CREDIT_LIMIT_PER_USER, createEmptyCreditStats } from "./creditQuota";

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: Array<{
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }>;
  };
}

const resolvedFirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    firebaseConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfig.appId,
  measurementId:
    import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ||
    firebaseConfig.measurementId ||
    "G-LCD95QYS76",
};

export const firebaseApp: FirebaseApp =
  getApps().length > 0 ? getApp() : initializeApp(resolvedFirebaseConfig);

export let firebaseAnalytics: Analytics | null = null;
if (typeof window !== "undefined") {
  void isSupported()
    .then((supported) => {
      if (supported && resolvedFirebaseConfig.measurementId) {
        firebaseAnalytics = getAnalytics(firebaseApp);
      }
    })
    .catch(() => {
      // Ignore analytics errors when blocked by privacy extensions or unsupported browsers
    });
}

export const firebaseAuth: Auth = getAuth(firebaseApp);

// Keep login session persisted forever across browser restarts & tab reloads
void setPersistence(firebaseAuth, browserLocalPersistence).catch(() => {
  // Ignore persistence errors in restricted private browsing modes
});

export const firestoreDb: Firestore = getFirestore(
  firebaseApp,
  firebaseConfig.firestoreDatabaseId || "(default)",
);

let connectionTested = false;
export async function testFirestoreConnection(): Promise<void> {
  if (connectionTested) return;
  connectionTested = true;
  try {
    await getDocFromServer(doc(firestoreDb, "test", "connection"));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("the client is offline")
    ) {
      console.error(
        "Koneksi Cloud Firestore offline. Periksa konfigurasi Firebase Anda.",
      );
    }
  }
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
): never {
  const user = firebaseAuth.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: user?.uid,
      email: user?.email,
      emailVerified: user?.emailVerified,
      isAnonymous: user?.isAnonymous,
      tenantId: user?.tenantId,
      providerInfo:
        user?.providerData.map((provider) => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL,
        })) || [],
    },
  };
  console.error("Firestore Error:", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function formatFirebaseAuthError(err: unknown): string {
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code?: unknown }).code || "")
      : "";
  const rawMessage = err instanceof Error ? err.message : String(err || "");

  if (code === "auth/operation-not-allowed") {
    return "Login Email/Kata Sandi belum diaktifkan di Firebase Console. Aktifkan di Firebase Console → Authentication → Sign-in method → Email/Password, atau gunakan tombol Masuk dengan Google / Tamu.";
  }
  if (code === "auth/email-already-in-use") {
    return "Email ini sudah terdaftar. Silakan pindah ke tab Masuk atau gunakan Masuk dengan Google.";
  }
  if (
    code === "auth/invalid-credential" ||
    code === "auth/wrong-password" ||
    code === "auth/user-not-found"
  ) {
    return "Email atau kata sandi tidak cocok. Periksa kembali lalu coba lagi.";
  }
  if (code === "auth/invalid-email") {
    return "Format alamat email tidak valid.";
  }
  if (code === "auth/weak-password") {
    return "Kata sandi terlalu lemah. Gunakan minimal 6 karakter.";
  }
  if (code === "auth/too-many-requests") {
    return "Terlalu banyak percobaan gagal. Tunggu sebentar lalu coba lagi.";
  }
  if (code === "auth/network-request-failed") {
    return "Koneksi internet terputus. Periksa jaringan Anda lalu coba lagi.";
  }
  return rawMessage || "Gagal memproses autentikasi akun.";
}

export async function loginWithEmailPassword(
  email: string,
  password: string,
): Promise<User> {
  try {
    await setPersistence(firebaseAuth, browserLocalPersistence);
    const cred = await signInWithEmailAndPassword(
      firebaseAuth,
      email.trim().toLowerCase(),
      password,
    );
    return cred.user;
  } catch (err) {
    throw new Error(formatFirebaseAuthError(err));
  }
}

export async function registerWithEmailPassword(
  displayName: string,
  email: string,
  password: string,
): Promise<User> {
  const cleanName = displayName.trim();
  if (cleanName.length < 2) {
    throw new Error("Nama tampilan minimal 2 karakter.");
  }
  if (password.length < 6) {
    throw new Error("Kata sandi minimal 6 karakter.");
  }
  try {
    await setPersistence(firebaseAuth, browserLocalPersistence);
    const cred = await createUserWithEmailAndPassword(
      firebaseAuth,
      email.trim().toLowerCase(),
      password,
    );
    await updateProfile(cred.user, {
      displayName: cleanName.slice(0, 100),
    });
    return cred.user;
  } catch (err) {
    throw new Error(formatFirebaseAuthError(err));
  }
}

export async function signOutFirebaseAccount(): Promise<void> {
  await signOut(firebaseAuth);
}

// ---------- Firestore Sync Helpers (strictly matching firestore.rules) ----------

function sanitizeDocId(rawId: string, prefix: string): string {
  const clean = rawId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 120);
  if (!clean) return `${prefix}-${Date.now()}`;
  return clean;
}

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        out[k] = stripUndefinedDeep(v);
      }
    }
    return out as T;
  }
  return value;
}

function safeUserStrings(user: User): { email: string; displayName: string } {
  const email = (user.email || `${user.uid}@helper.ai`).trim().slice(0, 200);
  const fallbackName = email.split("@")[0] || "Pengguna";
  const displayName = (user.displayName || fallbackName).trim().slice(0, 100);
  return {
    email: email.length >= 1 ? email : `${user.uid}@helper.ai`,
    displayName: displayName.length >= 1 ? displayName : "Pengguna",
  };
}

export async function ensureUserWorkspaceProfile(user: User): Promise<void> {
  const path = `users/${user.uid}`;
  const ref = doc(firestoreDb, "users", user.uid);
  const { email, displayName } = safeUserStrings(user);

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: user.uid,
        email,
        displayName,
        creditLimit: CREDIT_LIMIT_PER_USER,
        creditsUsed: 0,
        creditsSavedEstimated: 0,
        allTimeTotalTokens: 0,
        allTimeRequests: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const existing = snap.data() as Partial<{
        email: string;
        displayName: string;
      }>;
      if (existing.email !== email || existing.displayName !== displayName) {
        await updateDoc(ref, {
          email,
          displayName,
          updatedAt: serverTimestamp(),
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncCreditStatsToFirestore(
  user: User,
  stats: TokenUsageStats,
): Promise<void> {
  const path = `users/${user.uid}`;
  const ref = doc(firestoreDb, "users", user.uid);
  const { email, displayName } = safeUserStrings(user);
  const creditsUsed = Math.min(
    CREDIT_LIMIT_PER_USER,
    Math.max(0, Math.round(stats.creditsUsed || 0)),
  );
  const creditsSavedEstimated = Math.max(
    0,
    Math.round(stats.creditsSavedEstimated || 0),
  );
  const allTimeTotalTokens = Math.max(
    0,
    Math.round(stats.allTimeTotalTokens || 0),
  );
  const allTimeRequests = Math.max(0, Math.round(stats.allTimeRequests || 0));

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: user.uid,
        email,
        displayName,
        creditLimit: CREDIT_LIMIT_PER_USER,
        creditsUsed,
        creditsSavedEstimated,
        allTimeTotalTokens,
        allTimeRequests,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        email,
        displayName,
        creditsUsed,
        creditsSavedEstimated,
        allTimeTotalTokens,
        allTimeRequests,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function upsertSessionToFirestore(
  uid: string,
  session: ChatSession,
): Promise<void> {
  const safeId = sanitizeDocId(session.id, "s");
  const path = `users/${uid}/sessions/${safeId}`;
  const ref = doc(firestoreDb, "users", uid, "sessions", safeId);

  const sanitizedMessages = stripUndefinedDeep(session.messages.slice(-40)).map(
    (m) => {
      const cleanMsg: ChatMessage = {
        id: String(m.id || `m-${Date.now()}`),
        role: m.role === "user" ? "user" : "model",
        text: String(m.text || ""),
        timestamp: Math.max(0, Math.floor(Number(m.timestamp) || Date.now())),
      };
      if (m.modelUsed) cleanMsg.modelUsed = m.modelUsed;
      if (m.thinkingUsed) cleanMsg.thinkingUsed = m.thinkingUsed;
      if (m.toolSummary && m.toolSummary.length > 0)
        cleanMsg.toolSummary = m.toolSummary;
      if (m.agentSteps && m.agentSteps.length > 0)
        cleanMsg.agentSteps = m.agentSteps;
      if (m.pendingActions && m.pendingActions.length > 0)
        cleanMsg.pendingActions = m.pendingActions;
      if (m.usage) cleanMsg.usage = m.usage;
      if (m.error) cleanMsg.error = m.error;
      return cleanMsg;
    },
  );

  const payload = {
    uid,
    id: safeId,
    title: (session.title || "Obrolan Baru").trim().slice(0, 160) || "Obrolan Baru",
    pinned: Boolean(session.pinned),
    updatedAtMs: Math.max(0, Math.floor(session.updatedAt || Date.now())),
    messages: sanitizedMessages,
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(ref, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteSessionFromFirestore(
  uid: string,
  sessionId: string,
): Promise<void> {
  const safeId = sanitizeDocId(sessionId, "s");
  const path = `users/${uid}/sessions/${safeId}`;
  try {
    await deleteDoc(doc(firestoreDb, "users", uid, "sessions", safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function upsertTaskToFirestore(
  uid: string,
  task: DailyTask,
): Promise<void> {
  const safeId = sanitizeDocId(task.id, "t");
  const path = `users/${uid}/tasks/${safeId}`;
  const ref = doc(firestoreDb, "users", uid, "tasks", safeId);

  const payload: Record<string, unknown> = {
    uid,
    id: safeId,
    title: (task.title || "Tugas").trim().slice(0, 240) || "Tugas",
    priority:
      task.priority === "tinggi" || task.priority === "santai"
        ? task.priority
        : "normal",
    done: Boolean(task.done),
    createdAtMs: Math.max(0, Math.floor(task.createdAt || Date.now())),
    updatedAt: serverTimestamp(),
  };

  const trimmedTime = task.timeLabel?.trim();
  if (trimmedTime) {
    payload.timeLabel = trimmedTime.slice(0, 64);
  }

  try {
    await setDoc(ref, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteTaskFromFirestore(
  uid: string,
  taskId: string,
): Promise<void> {
  const safeId = sanitizeDocId(taskId, "t");
  const path = `users/${uid}/tasks/${safeId}`;
  try {
    await deleteDoc(doc(firestoreDb, "users", uid, "tasks", safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function upsertNoteToFirestore(
  uid: string,
  note: QuickNote,
): Promise<void> {
  const safeId = sanitizeDocId(note.id, "n");
  const path = `users/${uid}/notes/${safeId}`;
  const ref = doc(firestoreDb, "users", uid, "notes", safeId);

  const payload = {
    uid,
    id: safeId,
    title: (note.title || "Catatan Cepat").trim().slice(0, 160) || "Catatan Cepat",
    content: String(note.content || "").slice(0, 12000),
    createdAtMs: Math.max(0, Math.floor(note.createdAt || Date.now())),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(ref, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteNoteFromFirestore(
  uid: string,
  noteId: string,
): Promise<void> {
  const safeId = sanitizeDocId(noteId, "n");
  const path = `users/${uid}/notes/${safeId}`;
  try {
    await deleteDoc(doc(firestoreDb, "users", uid, "notes", safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export interface WorkspaceSnapshotHandlers {
  onCreditProfile: (stats: Partial<TokenUsageStats>) => void;
  onSessions: (sessions: ChatSession[]) => void;
  onTasks: (tasks: DailyTask[]) => void;
  onNotes: (notes: QuickNote[]) => void;
}

export function subscribeUserWorkspace(
  uid: string,
  handlers: WorkspaceSnapshotHandlers,
): Unsubscribe {
  const userPath = `users/${uid}`;
  const sessionsPath = `users/${uid}/sessions`;
  const tasksPath = `users/${uid}/tasks`;
  const notesPath = `users/${uid}/notes`;

  const unsubUser = onSnapshot(
    doc(firestoreDb, "users", uid),
    (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as Record<string, unknown>;
      const base = createEmptyCreditStats();
      handlers.onCreditProfile({
        creditLimit: Number(data.creditLimit) || base.creditLimit,
        creditsUsed: Math.max(0, Number(data.creditsUsed) || 0),
        creditsSavedEstimated: Math.max(
          0,
          Number(data.creditsSavedEstimated) || 0,
        ),
        allTimeTotalTokens: Math.max(0, Number(data.allTimeTotalTokens) || 0),
        allTimeRequests: Math.max(0, Number(data.allTimeRequests) || 0),
      });
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, userPath);
    },
  );

  const unsubSessions = onSnapshot(
    query(
      collection(firestoreDb, "users", uid, "sessions"),
      where("uid", "==", uid),
    ),
    (snap) => {
      const list: ChatSession[] = snap.docs
        .map((d) => {
          const data = d.data() as Record<string, unknown>;
          return {
            id: String(data.id || d.id),
            title: String(data.title || "Obrolan Baru"),
            pinned: Boolean(data.pinned),
            updatedAt: Number(data.updatedAtMs) || Date.now(),
            messages: Array.isArray(data.messages)
              ? (data.messages as ChatMessage[])
              : [],
          };
        })
        .sort((a, b) => b.updatedAt - a.updatedAt);
      handlers.onSessions(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, sessionsPath);
    },
  );

  const unsubTasks = onSnapshot(
    query(
      collection(firestoreDb, "users", uid, "tasks"),
      where("uid", "==", uid),
    ),
    (snap) => {
      const list: DailyTask[] = snap.docs
        .map((d): DailyTask => {
          const data = d.data() as Record<string, unknown>;
          const priority: DailyTask["priority"] =
            data.priority === "tinggi" || data.priority === "santai"
              ? data.priority
              : "normal";
          return {
            id: String(data.id || d.id),
            title: String(data.title || "Tugas"),
            timeLabel:
              typeof data.timeLabel === "string" ? data.timeLabel : undefined,
            priority,
            done: Boolean(data.done),
            createdAt: Number(data.createdAtMs) || Date.now(),
          };
        })
        .sort((a, b) => b.createdAt - a.createdAt);
      handlers.onTasks(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, tasksPath);
    },
  );

  const unsubNotes = onSnapshot(
    query(
      collection(firestoreDb, "users", uid, "notes"),
      where("uid", "==", uid),
    ),
    (snap) => {
      const list: QuickNote[] = snap.docs
        .map((d) => {
          const data = d.data() as Record<string, unknown>;
          return {
            id: String(data.id || d.id),
            title: String(data.title || "Catatan Cepat"),
            content: String(data.content || ""),
            createdAt: Number(data.createdAtMs) || Date.now(),
          };
        })
        .sort((a, b) => b.createdAt - a.createdAt);
      handlers.onNotes(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, notesPath);
    },
  );

  return () => {
    unsubUser();
    unsubSessions();
    unsubTasks();
    unsubNotes();
  };
}
