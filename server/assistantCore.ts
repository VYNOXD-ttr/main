import {
  GoogleGenAI,
  ThinkingLevel,
  Type,
  type Content,
  type FunctionCall,
  type FunctionDeclaration,
  type Part,
  type Tool,
} from "@google/genai";

export const ACTIVE_MODEL = "gemini-4-hydrogen";
export const FAST_FAILOVER_MODEL = "gemini-3.1-flash-lite";

export interface IncomingMessage {
  role: "user" | "model";
  text: string;
}

export interface DailyContextPayload {
  localDateTime?: string;
  tasks?: Array<{
    id: string;
    title: string;
    timeLabel?: string;
    priority: string;
    done: boolean;
  }>;
  notes?: Array<{
    title: string;
    content: string;
  }>;
}

export interface ChatRequestBody {
  messages?: IncomingMessage[];
  systemInstruction?: string;
  thinkingLevel?: "LOW" | "MEDIUM" | "HIGH" | "XHIGH";
  enableDailyTools?: boolean;
  tokenSaverMode?: boolean;
  ultraSaverMode?: boolean;
  agentWebSearchEnabled?: boolean;
  dailyContext?: DailyContextPayload;
}

export interface PendingAgentActionPayload {
  id: string;
  type:
    | "create_calendar_event"
    | "create_gmail_draft"
    | "send_gmail_message"
    | "create_google_task"
    | "complete_google_task"
    | "create_drive_doc";
  serviceLabel: string;
  title: string;
  summary: string;
  payload: Record<string, string>;
  status: "pending";
}

export interface GenericApiRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}

export interface GenericApiResponse {
  writableEnded?: boolean;
  status: (code: number) => GenericApiResponse;
  json: (data: unknown) => void;
  setHeader: (name: string, value: string) => void;
  write: (chunk: string) => boolean | void;
  end: () => void;
  flushHeaders?: () => void;
  on?: (event: string, listener: () => void) => void;
}

const DAILY_TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: "add_daily_task",
    description:
      "Tambahkan tugas atau jadwal baru ke daftar kegiatan harian lokal Helper.Id saat pengguna meminta dicatatkan tugas.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: {
          type: Type.STRING,
          description: "Judul tugas atau kegiatan yang singkat dan jelas.",
        },
        timeLabel: {
          type: Type.STRING,
          description: "Opsional, jam pelaksanaan, misalnya '09.00' atau '17.00 WIB'.",
        },
        priority: {
          type: Type.STRING,
          description: "Prioritas tugas: 'tinggi', 'normal', atau 'santai'.",
        },
      },
      required: ["title"],
    },
  },
  {
    name: "complete_daily_task",
    description: "Tandai tugas lokal di daftar harian Helper.Id sebagai selesai.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: "Kata kunci atau judul tugas yang sudah selesai.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "save_quick_note",
    description: "Simpan catatan cepat atau ringkasan ke panel Catatan Cepat lokal.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "Judul singkat catatan." },
        content: { type: Type.STRING, description: "Isi lengkap catatan." },
      },
      required: ["title", "content"],
    },
  },
];

const WORKSPACE_TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: "list_calendar_events",
    description:
      "Baca daftar acara atau jadwal rapat dari Google Calendar pengguna pada rentang waktu tertentu.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        timeMinIso: {
          type: Type.STRING,
          description: "Waktu awal ISO 8601 (opsional, default waktu sekarang).",
        },
        timeMaxIso: {
          type: Type.STRING,
          description: "Waktu akhir ISO 8601 (opsional, default 7 hari ke depan).",
        },
        maxResults: {
          type: Type.NUMBER,
          description: "Maksimal jumlah acara (default 10).",
        },
      },
    },
  },
  {
    name: "list_gmail_messages",
    description:
      "Baca daftar email masuk atau cari email di Gmail pengguna berdasarkan kueri pencarian.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: "Kueri pencarian Gmail, misalnya 'is:unread', 'from:budi', atau kata kunci.",
        },
        maxResults: {
          type: Type.NUMBER,
          description: "Maksimal email yang diambil (1-5, default 5).",
        },
      },
    },
  },
  {
    name: "list_google_tasks",
    description: "Baca daftar tugas kerja yang belum selesai dari Google Tasks pengguna.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        maxResults: {
          type: Type.NUMBER,
          description: "Jumlah maksimal tugas (default 12).",
        },
      },
    },
  },
  {
    name: "search_drive_files",
    description:
      "Cari file atau dokumen di Google Drive pengguna berdasarkan nama atau kata kunci.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: "Kata kunci nama/isi file yang dicari di Google Drive.",
        },
        maxResults: {
          type: Type.NUMBER,
          description: "Jumlah maksimal file (default 6).",
        },
      },
    },
  },
  {
    name: "read_drive_doc",
    description: "Baca isi teks dari file Google Docs atau file teks di Google Drive berdasarkan ID file.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        fileId: { type: Type.STRING, description: "ID file Google Drive." },
        mimeType: { type: Type.STRING, description: "MIME type file dari hasil search_drive_files." },
      },
      required: ["fileId"],
    },
  },
  {
    name: "propose_calendar_event",
    description:
      "Siapkan usulan pembuatan acara baru di Google Calendar (membutuhkan konfirmasi pengguna sebelum dijalankan).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING, description: "Judul acara atau rapat." },
        startIso: {
          type: Type.STRING,
          description: "Waktu mulai lengkap dalam format ISO 8601 dengan offset zona waktu, mis. '2026-11-18T09:00:00+07:00'.",
        },
        endIso: {
          type: Type.STRING,
          description: "Waktu selesai ISO 8601 dengan offset zona waktu.",
        },
        description: { type: Type.STRING, description: "Deskripsi singkat agenda." },
        location: { type: Type.STRING, description: "Lokasi atau tautan rapat (opsional)." },
      },
      required: ["summary", "startIso"],
    },
  },
  {
    name: "propose_gmail_draft",
    description:
      "Siapkan usulan penyimpanan draf email di Gmail (membutuhkan konfirmasi pengguna).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        to: { type: Type.STRING, description: "Alamat email penerima." },
        subject: { type: Type.STRING, description: "Subjek email." },
        body: { type: Type.STRING, description: "Isi lengkap email." },
      },
      required: ["to", "subject", "body"],
    },
  },
  {
    name: "propose_send_gmail",
    description:
      "Siapkan usulan pengiriman email langsung via Gmail (membutuhkan konfirmasi pengguna sebelum terkirim).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        to: { type: Type.STRING, description: "Alamat email penerima." },
        subject: { type: Type.STRING, description: "Subjek email." },
        body: { type: Type.STRING, description: "Isi lengkap email." },
      },
      required: ["to", "subject", "body"],
    },
  },
  {
    name: "propose_google_task",
    description:
      "Siapkan usulan penambahan tugas baru ke Google Tasks (membutuhkan konfirmasi pengguna).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "Judul tugas." },
        notes: { type: Type.STRING, description: "Catatan tambahan tugas (opsional)." },
        dueIso: { type: Type.STRING, description: "Batas waktu RFC3339 opsional." },
      },
      required: ["title"],
    },
  },
  {
    name: "propose_complete_google_task",
    description:
      "Siapkan usulan untuk menandai tugas di Google Tasks selesai (membutuhkan konfirmasi pengguna).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        taskId: { type: Type.STRING, description: "ID tugas dari list_google_tasks." },
        title: { type: Type.STRING, description: "Judul tugas agar mudah dikonfirmasi." },
      },
      required: ["taskId", "title"],
    },
  },
  {
    name: "propose_drive_doc",
    description:
      "Siapkan usulan pembuatan dokumen Google Docs baru di Google Drive pengguna (membutuhkan konfirmasi pengguna).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "Nama file dokumen." },
        content: { type: Type.STRING, description: "Isi teks dokumen." },
      },
      required: ["title", "content"],
    },
  },
];

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("MISSING_API_KEY");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function isFailoverEligible(err: unknown): boolean {
  const raw = err instanceof Error ? err.message : String(err);
  return /429|RESOURCE_EXHAUSTED|503|UNAVAILABLE|high demand|ECONNRESET|ETIMEDOUT|FIRST_CHUNK_TIMEOUT|REQUEST_TIMEOUT/i.test(
    raw,
  );
}

function formatErrorMessage(err: unknown): { code: string; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw === "MISSING_API_KEY") {
    return {
      code: "MISSING_API_KEY",
      message:
        "Kunci server GEMINI_API_KEY belum terpasang di Environment Variables hosting (Settings > Secrets atau Vercel Environment Variables).",
    };
  }
  if (/403|PERMISSION_DENIED|API_KEY_INVALID|400/i.test(raw)) {
    return {
      code: "AUTH_ERROR",
      message:
        "Konfigurasi kunci server AI ditolak atau belum memiliki izin untuk model ini.",
    };
  }
  if (/429|RESOURCE_EXHAUSTED|quota|rate limit/i.test(raw)) {
    return {
      code: "QUOTA_EXCEEDED",
      message:
        "Batas kecepatan permintaan server AI sementara sedang penuh (429). Tunggu beberapa detik lalu coba kirim ulang.",
    };
  }
  if (/503|UNAVAILABLE|high demand/i.test(raw)) {
    return {
      code: "SERVICE_UNAVAILABLE",
      message:
        "Server AI sedang mengalami lonjakan trafik sementara (503). Tunggu beberapa detik lalu coba kirim ulang.",
    };
  }
  if (/ABORT_ERR|aborted|timeout|ETIMEDOUT/i.test(raw)) {
    return {
      code: "TIMEOUT",
      message:
        "Permintaan ke server AI melebihi batas waktu. Coba kirim ulang dengan mode Kilat.",
    };
  }
  if (/404|NOT_FOUND/i.test(raw)) {
    return {
      code: "MODEL_NOT_FOUND",
      message:
        "Endpoint model AI sedang tidak tersedia untuk konfigurasi server saat ini.",
    };
  }
  return {
    code: "SERVER_ERROR",
    message: `Terjadi kendala saat menghubungi server AI: ${raw}`,
  };
}

function buildEffectiveSystemInstruction(
  baseInstruction: string,
  enableDailyTools: boolean,
  hasGoogleWorkspace: boolean,
  tokenSaverMode: boolean,
  ultraSaverMode: boolean,
  dailyContext?: DailyContextPayload,
): string {
  const sections: string[] = [];
  if (baseInstruction) sections.push(baseInstruction);

  if (dailyContext?.localDateTime) {
    sections.push(`Waktu lokal pengguna saat ini: ${dailyContext.localDateTime}`);
  }

  if (hasGoogleWorkspace) {
    sections.push(
      ultraSaverMode
        ? "Google Workspace aktif: gunakan tool baca untuk Calendar/Gmail/Tasks/Drive, dan wajib propose_* untuk aksi ubah/kirim."
        : [
            "Kemampuan AI Agent Google Workspace Aktif:",
            "- Anda dapat membaca Google Calendar, Gmail, Google Tasks, dan Google Drive menggunakan fungsi baca yang tersedia.",
            "- Untuk setiap aksi mengubah/membuat/mengirim data (acara kalender, draf/kirim email, tugas Google, dokumen Drive), WAJIB gunakan fungsi propose_* agar pengguna meninjau dan menyetujuinya lewat dialog konfirmasi.",
          ].join("\n"),
    );
  }

  if (enableDailyTools) {
    const allTasks = Array.isArray(dailyContext?.tasks) ? dailyContext.tasks : [];
    const taskCap = ultraSaverMode ? 4 : tokenSaverMode ? 6 : 12;
    const filteredTasks =
      ultraSaverMode || tokenSaverMode
        ? allTasks.filter((t) => !t.done).slice(0, taskCap)
        : allTasks.slice(0, taskCap);
    const allNotes = Array.isArray(dailyContext?.notes) ? dailyContext.notes : [];
    const noteCap = ultraSaverMode ? 2 : tokenSaverMode ? 3 : 6;
    const noteCharLimit = ultraSaverMode ? 75 : tokenSaverMode ? 120 : 300;
    const filteredNotes = allNotes.slice(0, noteCap);

    if (ultraSaverMode) {
      const compactTaskSummary =
        filteredTasks.length > 0
          ? filteredTasks
              .map((t) => `${t.title}${t.timeLabel ? ` (${t.timeLabel})` : ""}`)
              .join("; ")
          : "kosong";
      const compactNoteSummary =
        filteredNotes.length > 0
          ? filteredNotes
              .map((n) => `${n.title}: ${n.content.slice(0, noteCharLimit)}`)
              .join(" | ")
          : "kosong";
      sections.push(
        `Tugas aktif: ${compactTaskSummary}. Catatan: ${compactNoteSummary}. Pakai alat tugas/catatan hanya jika diminta.`,
      );
    } else {
      const taskLines =
        filteredTasks.length > 0
          ? filteredTasks
              .map(
                (t) =>
                  `- [${t.done ? "Selesai" : "Belum"}] ${t.title}${t.timeLabel ? ` (${t.timeLabel})` : ""} [prioritas: ${t.priority}]`,
              )
              .join("\n")
          : "(Belum ada tugas aktif)";

      const noteLines =
        filteredNotes.length > 0
          ? filteredNotes
              .map((n) => `- ${n.title}: ${n.content.slice(0, noteCharLimit)}`)
              .join("\n")
          : "(Belum ada catatan cepat)";

      sections.push(
        [
          "Konteks Tugas & Catatan Lokal:",
          taskLines,
          "Catatan:",
          noteLines,
          "Gunakan alat add_daily_task, complete_daily_task, atau save_quick_note hanya bila diminta mencatat/mengelola tugas atau catatan.",
        ].join("\n"),
      );
    }
  }

  return sections.join("\n\n");
}

async function callGoogleApiJson(
  url: string,
  accessToken: string,
): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Google API ${res.status}: ${errBody.slice(0, 240)}`);
  }
  return (await res.json()) as Record<string, unknown>;
}

async function executeReadOnlyWorkspaceTool(
  call: FunctionCall,
  accessToken: string,
): Promise<{ stepLabel: string; response: Record<string, unknown> }> {
  const args = (call.args || {}) as Record<string, unknown>;

  if (call.name === "list_calendar_events") {
    const now = new Date();
    const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const timeMin =
      typeof args.timeMinIso === "string" && args.timeMinIso.trim()
        ? args.timeMinIso.trim()
        : now.toISOString();
    const timeMax =
      typeof args.timeMaxIso === "string" && args.timeMaxIso.trim()
        ? args.timeMaxIso.trim()
        : weekLater.toISOString();
    const maxResults = Math.min(15, Math.max(1, Number(args.maxResults) || 10));

    const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("orderBy", "startTime");
    url.searchParams.set("timeMin", timeMin);
    url.searchParams.set("timeMax", timeMax);
    url.searchParams.set("maxResults", String(maxResults));

    const data = await callGoogleApiJson(url.toString(), accessToken);
    const items = Array.isArray(data.items) ? data.items : [];
    const simplified = items.map((ev: Record<string, unknown>) => ({
      id: ev.id,
      summary: ev.summary || "(Tanpa judul)",
      start: ev.start,
      end: ev.end,
      location: ev.location || undefined,
    }));
    return {
      stepLabel: `Membaca ${simplified.length} agenda dari Google Calendar`,
      response: { events: simplified },
    };
  }

  if (call.name === "list_gmail_messages") {
    const q = typeof args.query === "string" ? args.query.trim() : "";
    const maxResults = Math.min(5, Math.max(1, Number(args.maxResults) || 5));

    const listUrl = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
    listUrl.searchParams.set("maxResults", String(maxResults));
    if (q) listUrl.searchParams.set("q", q);

    const listData = await callGoogleApiJson(listUrl.toString(), accessToken);
    const messageRefs = Array.isArray(listData.messages)
      ? (listData.messages as Array<{ id?: string }>)
      : [];

    const details = await Promise.all(
      messageRefs.slice(0, 5).map(async (ref) => {
        if (!ref.id) return null;
        const msgUrl = new URL(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(ref.id)}`,
        );
        msgUrl.searchParams.set("format", "metadata");
        msgUrl.searchParams.append("metadataHeaders", "Subject");
        msgUrl.searchParams.append("metadataHeaders", "From");
        msgUrl.searchParams.append("metadataHeaders", "Date");
        const msg = await callGoogleApiJson(msgUrl.toString(), accessToken);
        const payload = (msg.payload || {}) as {
          headers?: Array<{ name?: string; value?: string }>;
        };
        const headers = Array.isArray(payload.headers) ? payload.headers : [];
        const getHeader = (name: string) =>
          headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || "";
        return {
          id: msg.id,
          subject: getHeader("Subject") || "(Tanpa subjek)",
          from: getHeader("From"),
          date: getHeader("Date"),
          snippet: msg.snippet || "",
        };
      }),
    );

    const validDetails = details.filter(Boolean);
    return {
      stepLabel: `Membaca ${validDetails.length} email dari Gmail`,
      response: { messages: validDetails },
    };
  }

  if (call.name === "list_google_tasks") {
    const maxResults = Math.min(20, Math.max(1, Number(args.maxResults) || 12));
    const url = new URL("https://tasks.googleapis.com/tasks/v1/lists/@default/tasks");
    url.searchParams.set("showCompleted", "false");
    url.searchParams.set("maxResults", String(maxResults));

    const data = await callGoogleApiJson(url.toString(), accessToken);
    const items = Array.isArray(data.items) ? data.items : [];
    const tasks = items.map((t: Record<string, unknown>) => ({
      id: t.id,
      title: t.title,
      notes: t.notes || undefined,
      due: t.due || undefined,
      status: t.status,
    }));
    return {
      stepLabel: `Memeriksa ${tasks.length} tugas aktif di Google Tasks`,
      response: { tasks },
    };
  }

  if (call.name === "search_drive_files") {
    const qText = typeof args.query === "string" ? args.query.trim() : "";
    const maxResults = Math.min(10, Math.max(1, Number(args.maxResults) || 6));
    const url = new URL("https://www.googleapis.com/drive/v3/files");
    url.searchParams.set("pageSize", String(maxResults));
    url.searchParams.set(
      "fields",
      "files(id,name,mimeType,modifiedTime,webViewLink)",
    );
    const safeEscaped = qText.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    url.searchParams.set(
      "q",
      qText
        ? `trashed = false and (name contains '${safeEscaped}' or fullText contains '${safeEscaped}')`
        : "trashed = false",
    );

    const data = await callGoogleApiJson(url.toString(), accessToken);
    const files = Array.isArray(data.files) ? data.files : [];
    return {
      stepLabel: `Mencari file di Google Drive (${files.length} ditemukan)`,
      response: { files },
    };
  }

  if (call.name === "read_drive_doc") {
    const fileId = String(args.fileId || "").trim();
    const mimeType = String(args.mimeType || "").trim();
    if (!fileId) {
      return {
        stepLabel: "Membaca dokumen Google Drive",
        response: { error: "fileId wajib diisi." },
      };
    }

    const isGoogleDoc = mimeType === "application/vnd.google-apps.document";
    const endpoint = isGoogleDoc
      ? `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export?mimeType=text/plain`
      : `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`;

    const res = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Google Drive ${res.status}: ${errBody.slice(0, 200)}`);
    }
    const text = await res.text();
    return {
      stepLabel: "Membaca isi dokumen dari Google Drive",
      response: { content: text.slice(0, 3500) },
    };
  }

  return {
    stepLabel: `Menjalankan alat ${call.name}`,
    response: { status: "ignored" },
  };
}

function buildPendingWorkspaceAction(
  call: FunctionCall,
): PendingAgentActionPayload | null {
  const args = (call.args || {}) as Record<string, unknown>;
  const id = `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  if (call.name === "propose_calendar_event") {
    const summary = String(args.summary || "Agenda Baru").trim();
    const startIso = String(args.startIso || "").trim();
    const endIso =
      typeof args.endIso === "string" && args.endIso.trim()
        ? args.endIso.trim()
        : startIso
          ? new Date(new Date(startIso).getTime() + 60 * 60 * 1000).toISOString()
          : "";
    const description = String(args.description || "").trim();
    const location = String(args.location || "").trim();
    return {
      id,
      type: "create_calendar_event",
      serviceLabel: "Google Calendar",
      title: `Buat Acara: ${summary}`,
      summary: `Mulai: ${startIso}${location ? ` · Lokasi: ${location}` : ""}`,
      payload: { summary, startIso, endIso, description, location },
      status: "pending",
    };
  }

  if (call.name === "propose_gmail_draft") {
    const to = String(args.to || "").trim();
    const subject = String(args.subject || "(Tanpa Subjek)").trim();
    const body = String(args.body || "").trim();
    return {
      id,
      type: "create_gmail_draft",
      serviceLabel: "Gmail",
      title: `Simpan Draf Email ke ${to}`,
      summary: `Subjek: ${subject}`,
      payload: { to, subject, body },
      status: "pending",
    };
  }

  if (call.name === "propose_send_gmail") {
    const to = String(args.to || "").trim();
    const subject = String(args.subject || "(Tanpa Subjek)").trim();
    const body = String(args.body || "").trim();
    return {
      id,
      type: "send_gmail_message",
      serviceLabel: "Gmail",
      title: `Kirim Email ke ${to}`,
      summary: `Subjek: ${subject}`,
      payload: { to, subject, body },
      status: "pending",
    };
  }

  if (call.name === "propose_google_task") {
    const title = String(args.title || "Tugas Baru").trim();
    const notes = String(args.notes || "").trim();
    const dueIso = String(args.dueIso || "").trim();
    return {
      id,
      type: "create_google_task",
      serviceLabel: "Google Tasks",
      title: `Tambah Tugas: ${title}`,
      summary: notes || "Simpan ke daftar Google Tasks utama",
      payload: { title, notes, dueIso },
      status: "pending",
    };
  }

  if (call.name === "propose_complete_google_task") {
    const taskId = String(args.taskId || "").trim();
    const title = String(args.title || taskId).trim();
    return {
      id,
      type: "complete_google_task",
      serviceLabel: "Google Tasks",
      title: `Selesaikan Tugas: ${title}`,
      summary: "Tandai tugas selesai di Google Tasks",
      payload: { taskId, title },
      status: "pending",
    };
  }

  if (call.name === "propose_drive_doc") {
    const title = String(args.title || "Dokumen Kerja").trim();
    const content = String(args.content || "").trim();
    return {
      id,
      type: "create_drive_doc",
      serviceLabel: "Google Drive",
      title: `Simpan Google Doc: ${title}`,
      summary: `Panjang isi: ${content.length} karakter`,
      payload: { title, content },
      status: "pending",
    };
  }

  return null;
}

export function handleHealthRequest(res: GenericApiResponse): void {
  res.status(200).json({
    ok: true,
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    supportedModels: [ACTIVE_MODEL, FAST_FAILOVER_MODEL],
  });
}

export async function handleAssistantChatRequest(
  req: GenericApiRequest,
  res: GenericApiResponse,
): Promise<void> {
  if (req.method && req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const parsedBody =
    typeof req.body === "string"
      ? (JSON.parse(req.body || "{}") as ChatRequestBody)
      : ((req.body || {}) as ChatRequestBody);

  const rawMessages = Array.isArray(parsedBody.messages) ? parsedBody.messages : [];
  const baseSystemInstruction =
    typeof parsedBody.systemInstruction === "string"
      ? parsedBody.systemInstruction.trim()
      : "";
  const tokenSaverMode = parsedBody.tokenSaverMode !== false;
  const ultraSaverMode = parsedBody.ultraSaverMode !== false;
  const enableDailyTools = parsedBody.enableDailyTools === true;
  const agentWebSearchEnabled = parsedBody.agentWebSearchEnabled === true;

  const rawAuth = req.headers.authorization || req.headers.Authorization;
  const authHeader = Array.isArray(rawAuth) ? rawAuth[0] : rawAuth;
  const googleAccessToken =
    typeof authHeader === "string" && authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : "";
  const hasGoogleWorkspace = googleAccessToken.length > 0;

  const resolvedThinkingOption =
    parsedBody.thinkingLevel === "XHIGH"
      ? "XHIGH"
      : parsedBody.thinkingLevel === "HIGH"
        ? "HIGH"
        : parsedBody.thinkingLevel === "MEDIUM"
          ? "MEDIUM"
          : "LOW";
  const primaryThinkingLevel =
    resolvedThinkingOption === "XHIGH"
      ? ThinkingLevel.XHIGH
      : resolvedThinkingOption === "HIGH"
        ? ThinkingLevel.HIGH
        : resolvedThinkingOption === "MEDIUM"
          ? ThinkingLevel.MEDIUM
          : ThinkingLevel.LOW;
  const failoverThinkingLevel =
    resolvedThinkingOption === "LOW"
      ? ThinkingLevel.MINIMAL
      : resolvedThinkingOption === "MEDIUM"
        ? ThinkingLevel.LOW
        : ThinkingLevel.MEDIUM;

  const historyLimit = ultraSaverMode ? 4 : tokenSaverMode ? 6 : 14;
  const validContents: Content[] = rawMessages
    .filter((m) => m && typeof m.text === "string" && m.text.trim().length > 0)
    .slice(-historyLimit)
    .map((m) => ({
      role: m.role === "model" ? "model" : "user",
      parts: [{ text: m.text }],
    }));

  if (validContents.length === 0) {
    res.status(400).json({ error: "Pesan tidak boleh kosong." });
    return;
  }

  const baseWithSpeed =
    ultraSaverMode || resolvedThinkingOption === "LOW" || tokenSaverMode
      ? [
          baseSystemInstruction,
          ultraSaverMode
            ? "Mode Ultra Hemat: Jawab sangat ringkas, langsung ke inti, tanpa basa-basi."
            : "Gaya Kecepatan & Hemat Token: Jawab langsung ke inti pertanyaan dengan jelas, padat, dan bebas basa-basi.",
        ]
          .filter(Boolean)
          .join("\n")
      : baseSystemInstruction;

  const effectiveSystemInstruction = buildEffectiveSystemInstruction(
    baseWithSpeed,
    enableDailyTools,
    hasGoogleWorkspace,
    tokenSaverMode,
    ultraSaverMode,
    parsedBody.dailyContext,
  );

  const startedAt = Date.now();
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const sendEvent = (payload: Record<string, unknown>) => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    }
  };

  let clientClosed = false;
  res.on?.("close", () => {
    if (!res.writableEnded) {
      clientClosed = true;
    }
  });

  const raceWithDeadline = <T>(
    promise: Promise<T>,
    ms: number,
    errCode: string,
  ): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(errCode)), ms);
      promise.then(
        (val) => {
          clearTimeout(timer);
          resolve(val);
        },
        (err) => {
          clearTimeout(timer);
          reject(err);
        },
      );
    });

  const functionDeclarations: FunctionDeclaration[] = [
    ...(enableDailyTools ? DAILY_TOOL_DECLARATIONS : []),
    ...(hasGoogleWorkspace ? WORKSPACE_TOOL_DECLARATIONS : []),
  ];

  const buildToolsForAttempt = (allowWebSearch: boolean): {
    tools: Tool[];
    useHybrid: boolean;
  } => {
    const tools: Tool[] = [];
    if (allowWebSearch) {
      tools.push({ googleSearch: {} });
    }
    if (functionDeclarations.length > 0) {
      tools.push({ functionDeclarations });
    }
    return {
      tools,
      useHybrid: allowWebSearch && functionDeclarations.length > 0,
    };
  };

  const openStreamWithFirstChunk = async (
    ai: GoogleGenAI,
    model: string,
    contents: Content[],
    thinkingLevel: ThinkingLevel,
    firstChunkTimeoutMs: number,
    allowWebSearch: boolean,
  ) => {
    const attemptStart = Date.now();
    const { tools, useHybrid } = buildToolsForAttempt(allowWebSearch);
    const stream = await raceWithDeadline(
      ai.models.generateContentStream({
        model,
        contents,
        config: {
          systemInstruction: effectiveSystemInstruction || undefined,
          thinkingConfig: { thinkingLevel },
          ...(tools.length > 0 ? { tools } : {}),
          ...(useHybrid
            ? { toolConfig: { includeServerSideToolInvocations: true } }
            : {}),
        },
      }),
      firstChunkTimeoutMs,
      "FIRST_CHUNK_TIMEOUT",
    );

    const remainingMs = Math.max(
      500,
      firstChunkTimeoutMs - (Date.now() - attemptStart),
    );
    const iterator = stream[Symbol.asyncIterator]();
    const firstResult = await raceWithDeadline(
      iterator.next(),
      remainingMs,
      "FIRST_CHUNK_TIMEOUT",
    );

    return { firstResult, iterator };
  };

  try {
    const ai = getGeminiClient();
    const primaryDeadlineMs = resolvedThinkingOption === "LOW" ? 3000 : 5500;
    let usedModel = ACTIVE_MODEL;
    let usedThinkingLevel = primaryThinkingLevel;
    let usedThinkingLabel = resolvedThinkingOption;
    let useWebSearchForTurn = agentWebSearchEnabled;

    const conversationContents: Content[] = [...validContents];
    let totalPromptTokens = 0;
    let totalOutputTokens = 0;
    let totalTokens = 0;
    let metaSent = false;

    const MAX_AGENT_STEPS = 4;
    for (let step = 0; step < MAX_AGENT_STEPS && !clientClosed; step++) {
      let opened: Awaited<ReturnType<typeof openStreamWithFirstChunk>>;
      if (step === 0) {
        try {
          opened = await openStreamWithFirstChunk(
            ai,
            ACTIVE_MODEL,
            conversationContents,
            primaryThinkingLevel,
            primaryDeadlineMs,
            useWebSearchForTurn,
          );
        } catch (primaryErr) {
          const primaryMsg =
            primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
          const isWebSearchQuotaOrUnsupported =
            useWebSearchForTurn &&
            /429|RESOURCE_EXHAUSTED|400|403|PERMISSION_DENIED|grounding|search/i.test(
              primaryMsg,
            );
          if (
            clientClosed ||
            (!isFailoverEligible(primaryErr) && !isWebSearchQuotaOrUnsupported)
          ) {
            throw primaryErr;
          }

          if (isWebSearchQuotaOrUnsupported) {
            useWebSearchForTurn = false;
            sendEvent({
              type: "agent_step",
              label:
                "Pencarian web sedang dibatasi kuota — menjawab langsung dengan AI",
            });
          }

          usedModel = FAST_FAILOVER_MODEL;
          usedThinkingLevel = failoverThinkingLevel;
          usedThinkingLabel = resolvedThinkingOption === "LOW" ? "LOW" : "MEDIUM";

          try {
            opened = await openStreamWithFirstChunk(
              ai,
              FAST_FAILOVER_MODEL,
              conversationContents,
              failoverThinkingLevel,
              12000,
              useWebSearchForTurn,
            );
          } catch (failoverErr) {
            const failoverMsg =
              failoverErr instanceof Error
                ? failoverErr.message
                : String(failoverErr);
            if (
              useWebSearchForTurn &&
              /429|RESOURCE_EXHAUSTED|400|403|PERMISSION_DENIED|grounding|search/i.test(
                failoverMsg,
              )
            ) {
              useWebSearchForTurn = false;
              sendEvent({
                type: "agent_step",
                label:
                  "Pencarian web sedang dibatasi kuota — menjawab langsung dengan AI",
              });
              opened = await openStreamWithFirstChunk(
                ai,
                FAST_FAILOVER_MODEL,
                conversationContents,
                failoverThinkingLevel,
                12000,
                false,
              );
            } else if (/429|RESOURCE_EXHAUSTED|503|UNAVAILABLE/i.test(failoverMsg)) {
              await new Promise((r) => setTimeout(r, 900));
              opened = await openStreamWithFirstChunk(
                ai,
                FAST_FAILOVER_MODEL,
                conversationContents,
                failoverThinkingLevel,
                12000,
                false,
              );
            } else {
              throw failoverErr;
            }
          }
        }
      } else {
        opened = await openStreamWithFirstChunk(
          ai,
          usedModel,
          conversationContents,
          usedThinkingLevel,
          12000,
          useWebSearchForTurn,
        );
      }

      if (!metaSent) {
        metaSent = true;
        sendEvent({
          type: "meta",
          modelUsed: usedModel,
          thinkingUsed: usedThinkingLabel,
        });
      }

      const collectedCalls: FunctionCall[] = [];
      const accumulatedModelParts: Part[] = [];
      let turnPromptTokens = 0;
      let turnOutputTokens = 0;
      let turnTotalTokens = 0;

      const handleChunk = (chunk: {
        text?: string;
        candidates?: Array<{ content?: { parts?: Part[] } }>;
        functionCalls?: FunctionCall[];
        usageMetadata?: {
          promptTokenCount?: number;
          candidatesTokenCount?: number;
          totalTokenCount?: number;
        };
      }) => {
        if (chunk.text) {
          sendEvent({ type: "delta", text: chunk.text });
        }
        const chunkParts = chunk.candidates?.[0]?.content?.parts;
        if (Array.isArray(chunkParts)) {
          for (const part of chunkParts) {
            accumulatedModelParts.push(part);
          }
        }
        if (
          Array.isArray(chunk.functionCalls) &&
          chunk.functionCalls.length > 0
        ) {
          collectedCalls.push(...chunk.functionCalls);
        }
        if (chunk.usageMetadata) {
          if (typeof chunk.usageMetadata.promptTokenCount === "number") {
            turnPromptTokens = chunk.usageMetadata.promptTokenCount;
          }
          if (typeof chunk.usageMetadata.candidatesTokenCount === "number") {
            turnOutputTokens = chunk.usageMetadata.candidatesTokenCount;
          }
          if (typeof chunk.usageMetadata.totalTokenCount === "number") {
            turnTotalTokens = chunk.usageMetadata.totalTokenCount;
          }
        }
      };

      if (!opened.firstResult.done && opened.firstResult.value) {
        handleChunk(opened.firstResult.value);
      }

      if (!opened.firstResult.done) {
        while (!clientClosed) {
          const next = await opened.iterator.next();
          if (next.done) break;
          if (next.value) {
            handleChunk(next.value);
          }
        }
      }

      totalPromptTokens += turnPromptTokens;
      totalOutputTokens += turnOutputTokens;
      totalTokens +=
        turnTotalTokens || turnPromptTokens + turnOutputTokens;

      if (clientClosed || collectedCalls.length === 0) {
        break;
      }

      const localActions: Array<Record<string, unknown>> = [];
      const pendingWorkspaceActions: PendingAgentActionPayload[] = [];
      const functionResponseParts: Part[] = [];

      for (const call of collectedCalls) {
        const args = (call.args || {}) as Record<string, unknown>;

        if (call.name === "add_daily_task") {
          const title = String(args.title || "").trim() || "Tugas Baru";
          const timeLabel = args.timeLabel
            ? String(args.timeLabel).trim()
            : undefined;
          const rawPriority = String(args.priority || "normal").toLowerCase();
          const priority =
            rawPriority === "tinggi" || rawPriority === "santai"
              ? rawPriority
              : "normal";
          localActions.push({
            type: "add_daily_task",
            title,
            timeLabel,
            priority,
          });
          sendEvent({
            type: "agent_step",
            label: `Menambahkan tugas lokal: ${title}`,
          });
          functionResponseParts.push({
            functionResponse: {
              id: call.id,
              name: call.name,
              response: {
                status: "success",
                message: `Tugas "${title}" berhasil ditambahkan.`,
              },
            },
          });
          continue;
        }

        if (call.name === "complete_daily_task") {
          const query = String(args.query || "").trim();
          localActions.push({ type: "complete_daily_task", query });
          sendEvent({
            type: "agent_step",
            label: `Menandai tugas lokal selesai: ${query}`,
          });
          functionResponseParts.push({
            functionResponse: {
              id: call.id,
              name: call.name,
              response: {
                status: "success",
                message: `Tugas "${query}" ditandai selesai.`,
              },
            },
          });
          continue;
        }

        if (call.name === "save_quick_note") {
          const title = String(args.title || "").trim() || "Catatan";
          const content = String(args.content || "").trim();
          localActions.push({ type: "save_quick_note", title, content });
          sendEvent({
            type: "agent_step",
            label: `Menyimpan catatan cepat: ${title}`,
          });
          functionResponseParts.push({
            functionResponse: {
              id: call.id,
              name: call.name,
              response: {
                status: "success",
                message: `Catatan "${title}" tersimpan.`,
              },
            },
          });
          continue;
        }

        if (
          call.name === "list_calendar_events" ||
          call.name === "list_gmail_messages" ||
          call.name === "list_google_tasks" ||
          call.name === "search_drive_files" ||
          call.name === "read_drive_doc"
        ) {
          if (!hasGoogleWorkspace) {
            functionResponseParts.push({
              functionResponse: {
                id: call.id,
                name: call.name,
                response: {
                  status: "auth_required",
                  message:
                    "Pengguna belum menautkan akun Google Workspace. Minta pengguna menekan Sign in with Google terlebih dahulu.",
                },
              },
            });
            continue;
          }
          try {
            const result = await executeReadOnlyWorkspaceTool(
              call,
              googleAccessToken,
            );
            sendEvent({ type: "agent_step", label: result.stepLabel });
            functionResponseParts.push({
              functionResponse: {
                id: call.id,
                name: call.name,
                response: result.response,
              },
            });
          } catch (toolErr) {
            const errMsg =
              toolErr instanceof Error ? toolErr.message : String(toolErr);
            sendEvent({
              type: "agent_step",
              label: `Gagal mengakses ${call.name}: ${errMsg}`,
            });
            functionResponseParts.push({
              functionResponse: {
                id: call.id,
                name: call.name,
                response: { status: "error", message: errMsg },
              },
            });
          }
          continue;
        }

        const proposal = buildPendingWorkspaceAction(call);
        if (proposal) {
          pendingWorkspaceActions.push(proposal);
          sendEvent({
            type: "agent_step",
            label: `Menyiapkan konfirmasi: ${proposal.title}`,
          });
          functionResponseParts.push({
            functionResponse: {
              id: call.id,
              name: call.name || "propose_action",
              response: {
                status: "awaiting_user_confirmation",
                message: `Usulan aksi "${proposal.title}" telah ditampilkan ke pengguna untuk dikonfirmasi sebelum dieksekusi.`,
              },
            },
          });
          continue;
        }

        functionResponseParts.push({
          functionResponse: {
            id: call.id,
            name: call.name || "unknown",
            response: { status: "ignored" },
          },
        });
      }

      if (localActions.length > 0) {
        sendEvent({ type: "tool_actions", actions: localActions });
      }
      if (pendingWorkspaceActions.length > 0) {
        sendEvent({
          type: "pending_actions",
          actions: pendingWorkspaceActions,
        });
      }

      conversationContents.push(
        { role: "model", parts: accumulatedModelParts },
        { role: "user", parts: functionResponseParts },
      );
    }

    if (!clientClosed) {
      sendEvent({
        type: "done",
        modelUsed: usedModel,
        thinkingUsed: usedThinkingLabel,
        latencyMs: Date.now() - startedAt,
        usage: {
          promptTokens: totalPromptTokens,
          outputTokens: totalOutputTokens,
          totalTokens,
        },
      });
      res.end();
    }
  } catch (err) {
    if (!clientClosed && !res.writableEnded) {
      const formatted = formatErrorMessage(err);
      sendEvent({
        type: "error",
        code: formatted.code,
        message: formatted.message,
        latencyMs: Date.now() - startedAt,
      });
      res.end();
    }
  }
}
