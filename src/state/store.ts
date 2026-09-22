// State Store — chrome.storage wrapper for SyncRecords.

import type { SyncRecord, SyncStatus, NormalizedSubmission, UserSettings } from "../adapters/types";

const STORAGE_KEY = "codexa_state";
const SETTINGS_KEY = "codexa_settings";

interface StateData {
  records: Record<string, SyncRecord>;
}

// Read the full state from chrome.storage.local.
async function getState(): Promise<StateData> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return (result[STORAGE_KEY] as StateData | undefined) ?? { records: {} };
}

// Write the full state to chrome.storage.local.
async function setState(state: StateData): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
}

// Check if a submission fingerprint is already known (queued or synced).
export async function isKnown(key: string): Promise<boolean> {
  const state = await getState();
  return key in state.records;
}

// Mark a submission as pending sync.
export async function markPending(
  key: string,
  data: NormalizedSubmission
): Promise<void> {
  const state = await getState();
  state.records[key] = {
    key,
    status: "pending",
    data,
    retryCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await setState(state);
}

// Update the status of a sync record.
export async function setStatus(
  key: string,
  status: SyncStatus,
  extra?: { retryable?: boolean; message?: string; files?: Record<string, string>; commitMessage?: string }
): Promise<void> {
  const state = await getState();
  const record = state.records[key];
  if (!record) return;

  record.status = status;
  record.updatedAt = Date.now();

  if (extra?.retryable !== undefined) record.retryable = extra.retryable;
  if (extra?.message !== undefined) record.lastError = extra.message;
  if (extra?.files !== undefined) record.files = extra.files;
  if (extra?.commitMessage !== undefined) record.commitMessage = extra.commitMessage;
  if (status === "failed") {
    record.retryCount = (record.retryCount ?? 0) + 1;
  }

  await setState(state);
}

// Get the next pending record for sync processing.
export async function nextPending(): Promise<SyncRecord | null> {
  const state = await getState();
  const pending = Object.values(state.records)
    .filter((r) => r.status === "pending")
    .sort((a, b) => a.createdAt - b.createdAt);
  return pending[0] ?? null;
}

// Get all records with "synced" status.
export async function listAllSynced(): Promise<NormalizedSubmission[]> {
  const state = await getState();
  return Object.values(state.records)
    .filter((r) => r.status === "synced")
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((r) => r.data);
}

// Get all records regardless of status.
export async function listAll(): Promise<SyncRecord[]> {
  const state = await getState();
  return Object.values(state.records).sort(
    (a, b) => b.createdAt - a.createdAt
  );
}

// Get failed + retryable records.
export async function listRetryable(): Promise<SyncRecord[]> {
  const state = await getState();
  return Object.values(state.records)
    .filter((r) => r.status === "failed" && r.retryable)
    .sort((a, b) => a.createdAt - b.createdAt);
}

// Clear all auth-dependent queue items when disconnecting.
export async function clearAuthDependentQueue(): Promise<void> {
  const state = await getState();
  for (const record of Object.values(state.records)) {
    if (record.status === "pending" || record.status === "syncing") {
      record.status = "failed";
      record.retryable = true;
      record.lastError = "GitHub disconnected — will retry after reconnecting";
      record.updatedAt = Date.now();
    }
  }
  await setState(state);
}

// Get sync status summary for UI display.
export async function getSyncSummary(): Promise<{
  pending: number;
  syncing: number;
  synced: number;
  failed: number;
  total: number;
  lastSyncedAt: number | null;
}> {
  const state = await getState();
  const records = Object.values(state.records);

  const counts = { pending: 0, syncing: 0, synced: 0, failed: 0 };
  let lastSyncedAt: number | null = null;

  for (const r of records) {
    counts[r.status]++;
    if (r.status === "synced" && (lastSyncedAt === null || r.updatedAt > lastSyncedAt)) {
      lastSyncedAt = r.updatedAt;
    }
  }

  return {
    ...counts,
    total: records.length,
    lastSyncedAt,
  };
}

// --- Settings ---

// Get user settings.
export async function getSettings(): Promise<UserSettings> {
  const result = await chrome.storage.local.get(SETTINGS_KEY);
  return (result[SETTINGS_KEY] as UserSettings | undefined) ?? {
    repoName: "competitive-programming",
    repoOwner: "",
    autoSync: true,
  };
}

// Save user settings.
export async function saveSettings(settings: Partial<UserSettings>): Promise<void> {
  const current = await getSettings();
  await chrome.storage.local.set({
    [SETTINGS_KEY]: { ...current, ...settings },
  });
}
