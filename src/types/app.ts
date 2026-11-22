export type NavTab = "sandbox" | "tasks" | "artifacts" | "settings";

export type SettingsTabId =
  | "workspace"
  | "studio"
  | "guide"
  | "compare"
  | "appearance";

export type ThemePresetId =
  | "light-clean"
  | "dark-studio"
  | "warm-paper"
  | "ocean-slate";

export type AccentId =
  | "crimson-terracotta"
  | "terracotta"
  | "teal"
  | "cobalt"
  | "indigo"
  | "amber"
  | "coral";

export type FontScaleId = "compact" | "standard" | "relaxed";

export type RadiusScaleId = "sharp" | "balanced" | "soft";

export interface ThemePreferences {
  preset: ThemePresetId;
  accent: AccentId;
  fontScale: FontScaleId;
  radius: RadiusScaleId;
}

export type GeminiModelId = "gemini-4-hydrogen";

export type ThinkingLevelOption = "LOW" | "MEDIUM" | "HIGH" | "XHIGH";

export type OutputFormatId = "conversational" | "structured-bullet" | "code-focused";

export interface AssistantConfig {
  presetId: string;
  name: string;
  role: string;
  tone: string;
  language: string;
  codingSkillEnabled: boolean;
  threejsSkillEnabled: boolean;
  dailyToolsEnabled: boolean;
  tokenSaverMode: boolean;
  ultraSaverMode?: boolean;
  agentWebSearchEnabled: boolean;
  rules: string[];
  outputFormat: OutputFormatId;
  model: GeminiModelId;
  thinkingLevel: ThinkingLevelOption;
  starterPrompts: string[];
}

export interface AssistantPreset {
  id: string;
  label: string;
  summary: string;
  config: Omit<AssistantConfig, "model" | "thinkingLevel">;
}

export interface DailyTask {
  id: string;
  title: string;
  timeLabel?: string;
  priority: "tinggi" | "normal" | "santai";
  done: boolean;
  createdAt: number;
}

export interface QuickNote {
  id: string;
  title: string;
  content: string;
  createdAt: number;
}

export interface ArtifactItem {
  id: string;
  title: string;
  language: string;
  code: string;
  isPreviewableHtml: boolean;
}

export type ToolActionEvent =
  | {
      type: "add_daily_task";
      title: string;
      timeLabel?: string;
      priority: "tinggi" | "normal" | "santai";
    }
  | {
      type: "complete_daily_task";
      query: string;
    }
  | {
      type: "save_quick_note";
      title: string;
      content: string;
    };

export type PendingAgentActionType =
  | "create_calendar_event"
  | "create_gmail_draft"
  | "send_gmail_message"
  | "create_google_task"
  | "complete_google_task"
  | "create_drive_doc";

export interface PendingAgentAction {
  id: string;
  type: PendingAgentActionType;
  serviceLabel: string;
  title: string;
  summary: string;
  payload: Record<string, string>;
  status: "pending" | "executed" | "cancelled" | "failed";
  resultMessage?: string;
}

export interface TokenUsageSummary {
  promptTokens: number;
  outputTokens: number;
  totalTokens: number;
  creditsCharged?: number;
  creditsSaved?: number;
}

export interface TokenUsageStats {
  sessionPromptTokens: number;
  sessionOutputTokens: number;
  sessionTotalTokens: number;
  sessionRequests: number;
  allTimeTotalTokens: number;
  allTimeRequests: number;
  creditLimit: number;
  creditsUsed: number;
  sessionCreditsUsed: number;
  creditsSavedEstimated: number;
  lastUpdatedAt?: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  modelUsed?: string;
  thinkingUsed?: ThinkingLevelOption;
  toolSummary?: string[];
  agentSteps?: string[];
  pendingActions?: PendingAgentAction[];
  usage?: TokenUsageSummary;
  timestamp: number;
  error?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  pinned?: boolean;
  updatedAt: number;
}

export type PipelineNodeId = "client" | "server" | "gemini";

export interface PipelineNodeSpec {
  id: PipelineNodeId;
  stepNumber: string;
  title: string;
  shortLabel: string;
  summary: string;
  responsibilities: string[];
  securityNote: string;
  codePreview: string;
}

export interface ProviderCatalogItem {
  id: string;
  name: string;
  category: "first-party" | "inference" | "paid-reference";
  recommended?: boolean;
  freeTierAvailable: boolean;
  creditCardRequired: boolean;
  openAiCompatible: boolean;
  codingRating: string;
  rateLimitLabel: string;
  costSummary: string;
  bestFor: string;
  caveat: string;
  starterModel: string;
  envVarName: string;
  docsUrl: string;
}
