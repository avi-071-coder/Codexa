// GitHub Auth — §4.10 of the implementation plan (Simplified).

import * as store from "../state/store";

import type { GhAuth, ConnectionStatus } from "../adapters/types";

const AUTH_KEY = "codexa_ghAuth";

// Parse a GitHub repo URL into owner/repo.
export function parseRepoUrl(input: string): { owner: string; repo: string } | null {
  const trimmed = input.trim().replace(/\.git\s*$/, "");

  // Try full URL: https://github.com/owner/repo
  const urlMatch = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9\-_.]+)\/([a-zA-Z0-9\-_.]+)/
  );
  if (urlMatch) {
    return { owner: urlMatch[1], repo: urlMatch[2] };
  }

  // Try owner/repo format
  const shortMatch = trimmed.match(/^([a-zA-Z0-9\-_.]+)\/([a-zA-Z0-9\-_.]+)$/);
  if (shortMatch) {
    return { owner: shortMatch[1], repo: shortMatch[2] };
  }

  return null;
}

// Connect to GitHub using a Personal Access Token.
export async function connectWithToken(
  token: string,
  repoUrl: string
): Promise<{ login: string; repo: string }> {
  // Validate token format (basic check)
  const trimmedToken = token.trim();
  if (!trimmedToken) {
    throw new Error("Token cannot be empty.");
  }

  // Parse the repo URL
  const parsed = parseRepoUrl(repoUrl);
  if (!parsed) {
    throw new Error(
      "Invalid repo URL. Use format: https://github.com/username/repo-name"
    );
  }

  // Validate the token by calling GitHub API
  const userResponse = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${trimmedToken}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!userResponse.ok) {
    if (userResponse.status === 401) {
      throw new Error("Invalid token. Please check and try again.");
    }
    throw new Error(`GitHub API error: ${userResponse.status}`);
  }

  const user = await userResponse.json();

  // Verify the token has access to the repo
  const repoResponse = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}`,
    {
      headers: {
        Authorization: `Bearer ${trimmedToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );

  // If repo doesn't exist yet, that's okay — we'll create it on first sync
  if (repoResponse.status === 404) {
    console.log(
      `[Codexa] Repo ${parsed.owner}/${parsed.repo} not found — will be created on first sync`
    );
  } else if (!repoResponse.ok) {
    throw new Error(
      `Cannot access repo ${parsed.owner}/${parsed.repo}. Check your token permissions.`
    );
  }

  // Store auth (token lives ONLY here — never leaves this module)
  const auth: GhAuth = {
    token: trimmedToken,
    scope: "repo",
    login: user.login,
    connectedAt: Date.now(),
  };

  await chrome.storage.local.set({ [AUTH_KEY]: auth });

  // Save repo settings
  await store.saveSettings({
    repoOwner: parsed.owner,
    repoName: parsed.repo,
  });

  console.log(`[Codexa] Connected as ${user.login} → ${parsed.owner}/${parsed.repo}`);

  return {
    login: user.login,
    repo: `${parsed.owner}/${parsed.repo}`,
  };
}

// Get the stored GitHub token.
export async function getToken(): Promise<string> {
  const result = await chrome.storage.local.get(AUTH_KEY);
  const auth = result[AUTH_KEY] as GhAuth | undefined;

  if (!auth?.token) {
    throw new NotConnectedError();
  }

  return auth.token;
}

// Get the connection status — safe, token-free metadata for the UI.
export async function getConnectionStatus(): Promise<ConnectionStatus> {
  const result = await chrome.storage.local.get(AUTH_KEY);
  const auth = result[AUTH_KEY] as GhAuth | undefined;
  const settings = await store.getSettings();

  if (!auth?.token) {
    return { connected: false };
  }

  return {
    connected: true,
    login: auth.login,
    connectedAt: auth.connectedAt,
    repo: settings.repoName
      ? `${settings.repoOwner}/${settings.repoName}`
      : undefined,
  };
}

// Disconnect GitHub — remove the token and halt pending syncs.
export async function disconnect(): Promise<void> {
  await chrome.storage.local.remove(AUTH_KEY);
  await store.clearAuthDependentQueue();
  console.log("[Codexa] GitHub disconnected");
}

// Check if the stored token is still valid.
export async function validateToken(): Promise<boolean> {
  try {
    const token = await getToken();
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

export class NotConnectedError extends Error {
  constructor() {
    super("GitHub is not connected. Please connect your account.");
    this.name = "NotConnectedError";
  }
}
