import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  type User,
} from "firebase/auth";
import type { PendingAgentAction } from "../types/app";
import { firebaseAuth, signOutFirebaseAccount } from "./firebaseClient";

export const GOOGLE_WORKSPACE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/tasks",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/drive.file",
] as const;

const basicProvider = new GoogleAuthProvider();

const workspaceProvider = new GoogleAuthProvider();
for (const scope of GOOGLE_WORKSPACE_SCOPES) {
  workspaceProvider.addScope(scope);
}
workspaceProvider.setCustomParameters({
  prompt: "consent",
});

let isSigningIn = false;
// Store OAuth access token strictly in memory (never in localStorage or sessionStorage)
let cachedAccessToken: string | null = null;

export function formatGoogleAuthError(err: unknown): string {
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code?: unknown }).code || "")
      : "";
  const rawMessage = err instanceof Error ? err.message : String(err || "");
  const lowerMsg = rawMessage.toLowerCase();
  const host =
    typeof window !== "undefined" ? window.location.hostname : "domain ini";

  if (
    code === "auth/unauthorized-domain" ||
    rawMessage.includes("auth/unauthorized-domain")
  ) {
    return `Login Google diblokir karena domain "${host}" belum terdaftar di Firebase Authorized Domains. Tambahkan "${host}" di Firebase Console → Authentication → Settings → Authorized domains, lalu pastikan Redirect URI "https://helper-8d935.firebaseapp.com/__/auth/handler" terdaftar di Google Cloud OAuth Client.`;
  }
  if (
    lowerMsg.includes("access_denied") ||
    lowerMsg.includes("verification") ||
    lowerMsg.includes("disallowed_useragent")
  ) {
    return `Akses OAuth Google ditolak karena aplikasi berstatus Testing / belum diverifikasi Google. Tambahkan email Anda ke daftar Test users di Google Cloud Console → OAuth consent screen, atau masuk langsung menggunakan Email & Kata Sandi.`;
  }
  if (lowerMsg.includes("redirect_uri_mismatch")) {
    return `Redirect URI belum cocok di Google Cloud Console. Pastikan "https://helper-8d935.firebaseapp.com/__/auth/handler" ada di Authorized redirect URIs dan "https://${host}" ada di Authorized JavaScript origins.`;
  }
  if (code === "auth/popup-blocked" || rawMessage.includes("auth/popup-blocked")) {
    return "Popup login Google diblokir oleh browser Anda. Izinkan popup untuk situs ini lalu coba lagi.";
  }
  if (
    code === "auth/popup-closed-by-user" ||
    code === "auth/cancelled-popup-request"
  ) {
    return "Jendela login Google ditutup sebelum proses selesai.";
  }
  if (code === "auth/operation-not-supported-in-environment") {
    return "Lingkungan browser saat ini memblokir popup Google Auth. Buka situs langsung di tab browser biasa atau masuk menggunakan Email & Kata Sandi.";
  }
  return rawMessage || "Gagal menautkan akun Google.";
}

export function initWorkspaceAuth(
  onAuthChanged?: (user: User | null, token: string | null) => void,
) {
  return onAuthStateChanged(firebaseAuth, (user: User | null) => {
    if (!user && !isSigningIn) {
      cachedAccessToken = null;
    }
    onAuthChanged?.(user, user ? cachedAccessToken : null);
  });
}

/**
 * Basic Google Sign-In (only standard openid/profile/email scopes).
 * Does NOT request sensitive Gmail/Drive/Calendar scopes so login works smoothly without app verification blocks.
 */
export async function signInGoogleAccount(): Promise<{
  user: User;
}> {
  isSigningIn = true;
  try {
    const result = await signInWithPopup(firebaseAuth, basicProvider);
    cachedAccessToken = null;
    return { user: result.user };
  } catch (err) {
    throw new Error(formatGoogleAuthError(err));
  } finally {
    isSigningIn = false;
  }
}

/**
 * Full Google Workspace OAuth Sign-In (requests Calendar, Gmail, Tasks, Drive scopes).
 */
export async function signInGoogleWorkspace(): Promise<{
  user: User;
  accessToken: string | null;
}> {
  isSigningIn = true;
  try {
    const result = await signInWithPopup(firebaseAuth, workspaceProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    cachedAccessToken = credential?.accessToken || null;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (err) {
    throw new Error(formatGoogleAuthError(err));
  } finally {
    isSigningIn = false;
  }
}

export async function signOutGoogleWorkspace(): Promise<void> {
  cachedAccessToken = null;
  await signOutFirebaseAccount();
}

export function getWorkspaceAccessToken(): string | null {
  return cachedAccessToken;
}

function encodeBase64UrlUtf8(raw: string): string {
  const bytes = new TextEncoder().encode(raw);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function encodeMimeSubject(subject: string): string {
  const hasNonAscii = /[^\x20-\x7E]/.test(subject);
  if (!hasNonAscii) return subject;
  const bytes = new TextEncoder().encode(subject);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `=?UTF-8?B?${btoa(binary)}?=`;
}

function buildRawEmail(to: string, subject: string, body: string): string {
  const rfc2822 = [
    `To: ${to}`,
    `Subject: ${encodeMimeSubject(subject)}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "MIME-Version: 1.0",
    "",
    body,
  ].join("\r\n");
  return encodeBase64UrlUtf8(rfc2822);
}

export async function executeConfirmedWorkspaceAction(
  action: PendingAgentAction,
): Promise<string> {
  const token = cachedAccessToken;
  if (!token) {
    throw new Error(
      "Sesi Google Workspace Anda sudah kedaluwarsa. Silakan klik Masuk dengan Google lagi untuk memberikan izin sesi aktif.",
    );
  }

  const p = action.payload;

  if (action.type === "create_calendar_event") {
    const startIso = p.startIso;
    const endIso =
      p.endIso ||
      new Date(new Date(startIso).getTime() + 60 * 60 * 1000).toISOString();

    const res = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: p.summary || "Agenda Baru",
          description: p.description || "",
          location: p.location || undefined,
          start: { dateTime: startIso },
          end: { dateTime: endIso },
        }),
      },
    );
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gagal membuat acara Calendar (${res.status}): ${errText}`);
    }
    const created = (await res.json()) as { summary?: string };
    return `Acara "${created.summary || p.summary}" berhasil ditambahkan ke Google Calendar.`;
  }

  if (action.type === "create_gmail_draft") {
    const raw = buildRawEmail(p.to || "", p.subject || "(Tanpa Subjek)", p.body || "");
    const res = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/drafts",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: { raw } }),
      },
    );
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gagal menyimpan draf Gmail (${res.status}): ${errText}`);
    }
    return `Draf email ke "${p.to}" berhasil disimpan di Gmail Drafts.`;
  }

  if (action.type === "send_gmail_message") {
    const raw = buildRawEmail(p.to || "", p.subject || "(Tanpa Subjek)", p.body || "");
    const res = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw }),
      },
    );
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gagal mengirim email (${res.status}): ${errText}`);
    }
    return `Email ke "${p.to}" berhasil dikirim lewat Gmail.`;
  }

  if (action.type === "create_google_task") {
    const res = await fetch(
      "https://tasks.googleapis.com/tasks/v1/lists/@default/tasks",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: p.title || "Tugas Kerja",
          notes: p.notes || undefined,
          due: p.dueIso || undefined,
        }),
      },
    );
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gagal menambahkan Google Task (${res.status}): ${errText}`);
    }
    return `Tugas "${p.title}" berhasil ditambahkan ke Google Tasks.`;
  }

  if (action.type === "complete_google_task") {
    const taskId = p.taskId;
    if (!taskId) {
      throw new Error("ID tugas Google Tasks tidak ditemukan.");
    }
    const res = await fetch(
      `https://tasks.googleapis.com/tasks/v1/lists/@default/tasks/${encodeURIComponent(taskId)}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "completed" }),
      },
    );
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gagal menyelesaikan Google Task (${res.status}): ${errText}`);
    }
    return `Tugas "${p.title || taskId}" ditandai selesai di Google Tasks.`;
  }

  if (action.type === "create_drive_doc") {
    const boundary = `helperid_${Date.now()}`;
    const metadata = JSON.stringify({
      name: p.title || "Dokumen Kerja HELPER AI.",
      mimeType: "application/vnd.google-apps.document",
    });
    const multipartBody = [
      `--${boundary}`,
      "Content-Type: application/json; charset=UTF-8",
      "",
      metadata,
      `--${boundary}`,
      "Content-Type: text/plain; charset=UTF-8",
      "",
      p.content || "",
      `--${boundary}--`,
    ].join("\r\n");

    const res = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body: multipartBody,
      },
    );
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gagal membuat dokumen Drive (${res.status}): ${errText}`);
    }
    const created = (await res.json()) as { name?: string };
    return `Dokumen "${created.name || p.title}" berhasil disimpan di Google Drive.`;
  }

  throw new Error("Tipe aksi Google Workspace tidak dikenali.");
}
