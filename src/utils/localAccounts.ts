export interface LocalAppAccountSession {
  email: string;
  displayName: string;
  createdAt: number;
}

interface StoredLocalAccount {
  email: string;
  displayName: string;
  saltHex: string;
  hashHex: string;
  createdAt: number;
}

const ACCOUNTS_KEY = "helperai_accounts_v1";
const SESSION_KEY = "helperai_active_account_v1";

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.length % 2 === 0 ? hex : `0${hex}`;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16) || 0;
  }
  return out;
}

async function hashPassword(password: string, saltHex: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error("Browser ini tidak mendukung enkripsi Web Crypto untuk login akun.");
  }
  const enc = new TextEncoder();
  const baseKey = await subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const saltBytes = hexToBytes(saltHex);
  const bits = await subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBytes.buffer.slice(
        saltBytes.byteOffset,
        saltBytes.byteOffset + saltBytes.byteLength,
      ) as ArrayBuffer,
      iterations: 100_000,
      hash: "SHA-256",
    },
    baseKey,
    256,
  );
  return bytesToHex(new Uint8Array(bits));
}

function readStoredAccounts(): StoredLocalAccount[] {
  try {
    const raw = window.localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredLocalAccount[]) : [];
  } catch {
    return [];
  }
}

function writeStoredAccounts(accounts: StoredLocalAccount[]): void {
  try {
    window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {
    throw new Error("Gagal menyimpan data akun di penyimpanan browser.");
  }
}

export function loadActiveLocalSession(): LocalAppAccountSession | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LocalAppAccountSession>;
    if (!parsed.email || !parsed.displayName) return null;
    return {
      email: normalizeEmail(parsed.email),
      displayName: parsed.displayName.trim(),
      createdAt: Number(parsed.createdAt) || Date.now(),
    };
  } catch {
    return null;
  }
}

export function saveActiveLocalSession(
  session: LocalAppAccountSession | null,
): void {
  try {
    if (!session) {
      window.localStorage.removeItem(SESSION_KEY);
    } else {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
  } catch {
    // Ignore storage quota errors
  }
}

export async function registerLocalAccount(params: {
  displayName: string;
  email: string;
  password: string;
}): Promise<LocalAppAccountSession> {
  const email = normalizeEmail(params.email);
  const displayName = params.displayName.trim();
  const password = params.password;

  if (displayName.length < 2) {
    throw new Error("Nama tampilan minimal 2 karakter.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Format email tidak valid.");
  }
  if (password.length < 6) {
    throw new Error("Kata sandi minimal 6 karakter.");
  }

  const accounts = readStoredAccounts();
  if (accounts.some((acc) => normalizeEmail(acc.email) === email)) {
    throw new Error(
      `Email "${email}" sudah terdaftar. Silakan pindah ke tab Masuk untuk login.`,
    );
  }

  const salt = new Uint8Array(16);
  globalThis.crypto.getRandomValues(salt);
  const saltHex = bytesToHex(salt);
  const hashHex = await hashPassword(password, saltHex);

  const created: StoredLocalAccount = {
    email,
    displayName,
    saltHex,
    hashHex,
    createdAt: Date.now(),
  };

  writeStoredAccounts([...accounts, created]);
  const session: LocalAppAccountSession = {
    email: created.email,
    displayName: created.displayName,
    createdAt: created.createdAt,
  };
  saveActiveLocalSession(session);
  return session;
}

export async function loginLocalAccount(params: {
  email: string;
  password: string;
}): Promise<LocalAppAccountSession> {
  const email = normalizeEmail(params.email);
  const password = params.password;

  if (!email || !password) {
    throw new Error("Email dan kata sandi wajib diisi.");
  }

  const accounts = readStoredAccounts();
  const found = accounts.find((acc) => normalizeEmail(acc.email) === email);
  if (!found) {
    throw new Error(
      `Akun "${email}" belum terdaftar di browser ini. Klik tab Daftar untuk membuat akun baru.`,
    );
  }

  const candidateHash = await hashPassword(password, found.saltHex);
  if (candidateHash !== found.hashHex) {
    throw new Error("Kata sandi salah. Silakan periksa kembali.");
  }

  const session: LocalAppAccountSession = {
    email: found.email,
    displayName: found.displayName,
    createdAt: found.createdAt,
  };
  saveActiveLocalSession(session);
  return session;
}

export function logoutLocalAccount(): void {
  saveActiveLocalSession(null);
}
