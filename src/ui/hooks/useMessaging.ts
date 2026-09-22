// Messaging hooks — React hooks for communicating with the service worker.

import { useState, useEffect, useCallback } from "react";
import type {
  ConnectionStatus,
  AnalyticsSnapshot,
} from "../../adapters/types";

// Send a message to the service worker and get a typed response.
async function sendMessage<T>(msg: { type: string; [key: string]: unknown }): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(msg, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (response?.error) {
        reject(new Error(response.error));
        return;
      }
      resolve(response as T);
    });
  });
}

// Hook to get GitHub connection status (no token, just metadata).
export function useConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatus>({ connected: false });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const result = await sendMessage<ConnectionStatus>({
        type: "GET_CONNECTION_STATUS",
      });
      setStatus(result);
    } catch (err) {
      console.error("[Codexa] Failed to get connection status:", err);
      setStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { status, loading, refresh };
}

// Hook to get analytics snapshot.
export function useAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const result = await sendMessage<AnalyticsSnapshot>({
        type: "GET_ANALYTICS",
      });
      setAnalytics(result);
    } catch (err) {
      console.error("[Codexa] Failed to get analytics:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { analytics, loading, refresh };
}

// Hook to get sync status.
export function useSyncStatus() {
  const [syncStatus, setSyncStatus] = useState<{
    pending: number;
    syncing: number;
    synced: number;
    failed: number;
    total: number;
    lastSyncedAt: number | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const result = await sendMessage<typeof syncStatus>({
        type: "GET_SYNC_STATUS",
      });
      setSyncStatus(result);
    } catch (err) {
      console.error("[Codexa] Failed to get sync status:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    // Refresh every 10 seconds
    const interval = setInterval(refresh, 10_000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { syncStatus, loading, refresh };
}

// Hook to get recent submissions.
export function useRecentSubmissions() {
  const [submissions, setSubmissions] = useState<
    Array<{
      title: string;
      platform: string;
      difficulty: string;
      language: string;
      submittedAt: string;
      slug: string;
    }>
  >([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const result = await sendMessage<typeof submissions>({
        type: "GET_RECENT_SUBMISSIONS",
      });
      setSubmissions(result ?? []);
    } catch (err) {
      console.error("[Codexa] Failed to get submissions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { submissions, loading, refresh };
}

// GitHub auth actions — simple PAT-based connection.
export function useGitHubAuth() {
  const [authState, setAuthState] = useState<{
    status: "idle" | "connecting" | "connected" | "error";
    error?: string;
  }>({ status: "idle" });

  const connect = useCallback(async (token: string, repoUrl: string) => {
    setAuthState({ status: "connecting" });
    try {
      const result = await sendMessage<{
        ok: boolean;
        login: string;
        repo: string;
        error?: string;
      }>({
        type: "CONNECT_GITHUB",
        token,
        repoUrl,
      });

      if (result.error) {
        setAuthState({ status: "error", error: result.error });
      } else {
        setAuthState({ status: "connected" });
      }
    } catch (err) {
      setAuthState({
        status: "error",
        error: err instanceof Error ? err.message : "Failed to connect",
      });
    }
  }, []);

  const disconnectGithub = useCallback(async () => {
    try {
      await sendMessage({ type: "DISCONNECT_GITHUB" });
      setAuthState({ status: "idle" });
    } catch (err) {
      console.error("[Codexa] Disconnect failed:", err);
    }
  }, []);

  return { authState, connect, disconnect: disconnectGithub };
}

