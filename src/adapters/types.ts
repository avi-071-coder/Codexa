// Normalized submission — the canonical shape every adapter must produce.
export interface NormalizedSubmission {
  platform: string;
  problemId: string;
  slug: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard" | "Unknown";
  category: string;
  tags: string[];
  language: string;
  code: string;
  status: "Accepted" | "Other";
  submissionId?: string;
  submittedAt: string;
  contest?: string;
}

// Raw submission message sent from content scripts to the service worker.
export interface RawSubmissionMessage {
  type: "RAW_SUBMISSION";
  platform: string;
  payload: Record<string, unknown>;
}

// All allowed message types that the service worker will accept.
export type AllowedMessageType =
  | "RAW_SUBMISSION"
  | "CONNECT_GITHUB"
  | "DISCONNECT_GITHUB"
  | "GET_CONNECTION_STATUS"
  | "GET_ANALYTICS"
  | "GET_SYNC_STATUS"
  | "GET_RECENT_SUBMISSIONS";

export const ALLOWED_TYPES = new Set<AllowedMessageType>([
  "RAW_SUBMISSION",
  "CONNECT_GITHUB",
  "DISCONNECT_GITHUB",
  "GET_CONNECTION_STATUS",
  "GET_ANALYTICS",
  "GET_SYNC_STATUS",
  "GET_RECENT_SUBMISSIONS",
]);

export const SUPPORTED_PLATFORMS = new Set<string>([
  "leetcode",
  "codeforces",
  "codechef",
]);

// Extension file mapping for supported languages.
export const LANG_EXTENSIONS: Record<string, string> = {
  python: "py",
  python3: "py",
  javascript: "js",
  typescript: "ts",
  java: "java",
  "c++": "cpp",
  cpp: "cpp",
  c: "c",
  csharp: "cs",
  "c#": "cs",
  go: "go",
  golang: "go",
  rust: "rs",
  ruby: "rb",
  swift: "swift",
  kotlin: "kt",
  scala: "scala",
  php: "php",
  dart: "dart",
  racket: "rkt",
  elixir: "ex",
  erlang: "erl",
};

// Sync record — tracks the lifecycle of a submission from detection to sync.
export type SyncStatus = "pending" | "syncing" | "synced" | "failed";

export interface SyncRecord {
  key: string;
  status: SyncStatus;
  data: NormalizedSubmission;
  files?: Record<string, string>;
  commitMessage?: string;
  retryable?: boolean;
  retryCount?: number;
  lastError?: string;
  createdAt: number;
  updatedAt: number;
}

// GitHub auth state — lives only in chrome.storage.local, read only by githubAuth.ts.
export interface GhAuth {
  token: string;
  scope: string;
  login: string;
  connectedAt: number;
}

// Connection status — the safe, token-free subset of GhAuth
export interface ConnectionStatus {
  connected: boolean;
  login?: string;
  connectedAt?: number;
  repo?: string;
}

// User settings stored in chrome.storage.local.
export interface UserSettings {
  repoName: string;
  repoOwner: string;
  autoSync: boolean;
}

// Analytics snapshot — fully derived, recomputed on demand,
export interface AnalyticsSnapshot {
  total: number;
  byPlatform: Record<string, number>;
  byDifficulty: Record<string, number>;
  byTopic: Record<string, number>;
  byLanguage: Record<string, number>;
  streak: {
    current: number;
    longest: number;
    lastActiveDate: string | null;
  };
  weekly: Array<{ week: string; count: number }>;
  recentSubmissions: Array<{
    title: string;
    platform: string;
    difficulty: string;
    language: string;
    submittedAt: string;
  }>;
  contests?: {
    total: number;
    platforms: Record<string, number>;
  };
}
