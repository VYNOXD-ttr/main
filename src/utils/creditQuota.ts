import type { ChatMessage, TokenUsageStats } from "../types/app";

export const CREDIT_LIMIT_PER_USER = 100_000_000;
export const ULTRA_SAVER_CREDIT_RATE = 0.25;
export const STANDARD_CREDIT_RATE = 1;

export function createEmptyCreditStats(): TokenUsageStats {
  return {
    sessionPromptTokens: 0,
    sessionOutputTokens: 0,
    sessionTotalTokens: 0,
    sessionRequests: 0,
    allTimeTotalTokens: 0,
    allTimeRequests: 0,
    creditLimit: CREDIT_LIMIT_PER_USER,
    creditsUsed: 0,
    sessionCreditsUsed: 0,
    creditsSavedEstimated: 0,
  };
}

export function getCreditStorageKey(googleEmail: string | null): string {
  const normalized = (googleEmail || "guest")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9@._-]/g, "_");
  return `helperid_credit_wallet_v2_${normalized}`;
}

export function loadCreditStatsForUser(
  googleEmail: string | null,
): TokenUsageStats {
  const empty = createEmptyCreditStats();
  try {
    const raw = window.localStorage.getItem(getCreditStorageKey(googleEmail));
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<TokenUsageStats>;
    return {
      sessionPromptTokens: 0,
      sessionOutputTokens: 0,
      sessionTotalTokens: 0,
      sessionRequests: 0,
      allTimeTotalTokens: Math.max(0, Number(parsed.allTimeTotalTokens) || 0),
      allTimeRequests: Math.max(0, Number(parsed.allTimeRequests) || 0),
      creditLimit: CREDIT_LIMIT_PER_USER,
      creditsUsed: Math.max(0, Number(parsed.creditsUsed) || 0),
      sessionCreditsUsed: 0,
      creditsSavedEstimated: Math.max(
        0,
        Number(parsed.creditsSavedEstimated) || 0,
      ),
      lastUpdatedAt: parsed.lastUpdatedAt,
    };
  } catch {
    return empty;
  }
}

export function saveCreditStatsForUser(
  googleEmail: string | null,
  stats: TokenUsageStats,
): void {
  try {
    window.localStorage.setItem(
      getCreditStorageKey(googleEmail),
      JSON.stringify({
        allTimeTotalTokens: stats.allTimeTotalTokens,
        allTimeRequests: stats.allTimeRequests,
        creditLimit: CREDIT_LIMIT_PER_USER,
        creditsUsed: stats.creditsUsed,
        creditsSavedEstimated: stats.creditsSavedEstimated,
        lastUpdatedAt: stats.lastUpdatedAt,
      }),
    );
  } catch {
    // Ignore storage quota errors
  }
}

export function computeCreditCharge(
  totalTokens: number,
  ultraSaverMode: boolean,
): { creditsCharged: number; creditsSaved: number } {
  const safeTokens = Math.max(0, Math.round(totalTokens || 0));
  if (safeTokens === 0) {
    return { creditsCharged: 0, creditsSaved: 0 };
  }
  if (ultraSaverMode) {
    const creditsCharged = Math.max(
      1,
      Math.ceil(safeTokens * ULTRA_SAVER_CREDIT_RATE),
    );
    const creditsSaved = Math.max(0, safeTokens - creditsCharged);
    return { creditsCharged, creditsSaved };
  }
  return { creditsCharged: safeTokens, creditsSaved: 0 };
}

export function formatCompactCredits(amount: number): string {
  const safe = Math.max(0, Math.floor(amount));
  if (safe >= 1_000_000) {
    const millions = safe / 1_000_000;
    return `${millions.toLocaleString("id-ID", {
      minimumFractionDigits: millions >= 100 ? 0 : 2,
      maximumFractionDigits: 2,
    })} JT`;
  }
  if (safe >= 10_000) {
    return `${(safe / 1_000).toLocaleString("id-ID", {
      maximumFractionDigits: 1,
    })} RB`;
  }
  return safe.toLocaleString("id-ID");
}

function summarizeHistoricalAssistantText(text: string): string {
  const withoutLargeCode = text.replace(
    /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g,
    (full, lang: string, body: string) => {
      if (body.length <= 220) return full;
      const label = lang ? lang.toUpperCase() : "kode";
      return `\n[Blok ${label} (${body.length} karakter) sudah dibuat sebelumnya & diringkas untuk hemat kredit]\n`;
    },
  );
  if (withoutLargeCode.length > 900) {
    return `${withoutLargeCode.slice(0, 860)}\n... [ringkasan riwayat hemat kredit]`;
  }
  return withoutLargeCode;
}

export function trimMessagesForRequest(
  messages: ChatMessage[],
  ultraSaverMode: boolean,
  tokenSaverMode: boolean,
): Array<{ role: "user" | "model"; text: string }> {
  const historyLimit = ultraSaverMode ? 4 : tokenSaverMode ? 6 : 14;
  const sliced = messages.slice(-historyLimit);
  const lastIdx = sliced.length - 1;

  return sliced.map((msg, idx) => {
    const isLatestTurn = idx >= lastIdx - 1;
    if (ultraSaverMode && msg.role === "model" && !isLatestTurn) {
      return {
        role: "model",
        text: summarizeHistoricalAssistantText(msg.text),
      };
    }
    return {
      role: msg.role,
      text: msg.text,
    };
  });
}
