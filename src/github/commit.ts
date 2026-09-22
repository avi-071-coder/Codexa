// GitHub Commit — the ONLY file that ever calls getToken().

import { getToken } from "../background/githubAuth";
import * as storeModule from "../state/store";
import { safeErrorMessage } from "../lib/safeError";

const API_BASE = "https://api.github.com";

// Rate limit error with reset time.
export class RateLimitError extends Error {
  resetAt: number;

  constructor(resetAt: number) {
    super(`GitHub rate limit exceeded. Resets at ${new Date(resetAt).toISOString()}`);
    this.name = "RateLimitError";
    this.resetAt = resetAt;
  }
}

// Check if an error is a rate limit error.
export function isRateLimited(err: unknown): err is RateLimitError {
  return err instanceof RateLimitError;
}

// Make an authenticated GitHub API request.
async function githubFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getToken();

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  // Check for rate limiting
  if (response.status === 403 || response.status === 429) {
    const resetHeader = response.headers.get("X-RateLimit-Reset");
    const resetAt = resetHeader ? parseInt(resetHeader, 10) * 1000 : Date.now() + 60_000;
    throw new RateLimitError(resetAt);
  }

  return response;
}

// Ensure the target repository exists. Creates it if it doesn't.
export async function ensureRepo(owner: string, repo: string): Promise<void> {
  const response = await githubFetch(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);

  if (response.ok) return; // Repo exists

  if (response.status === 404) {
    // Create the repository
    const createResponse = await githubFetch("/user/repos", {
      method: "POST",
      body: JSON.stringify({
        name: repo,
        description: "🏆 Competitive programming solutions — auto-synced by Codexa",
        private: false,
        auto_init: true,
        has_issues: false,
        has_wiki: false,
      }),
    });

    if (!createResponse.ok) {
      const errBody = await createResponse.text().catch(() => "");
      throw new Error(`Failed to create repo: ${createResponse.status} ${safeErrorMessage(errBody)}`);
    }

    console.log(`[Codexa] Created repository ${owner}/${repo}`);
    return;
  }

  throw new Error(`Failed to check repo: ${response.status}`);
}

// List files in a directory of the repo.
export async function listDir(
  owner: string,
  repo: string,
  path: string
): Promise<string[]> {
  const response = await githubFetch(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}`
  );

  if (!response.ok) return [];

  const data = await response.json();

  if (!Array.isArray(data)) return [];

  return data.map((item: { name: string }) => item.name);
}

// Get the SHA of a file (needed for updates).
export async function getFileSha(
  owner: string,
  repo: string,
  path: string
): Promise<string | null> {
  const response = await githubFetch(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}`
  );

  if (!response.ok) return null;

  const data = await response.json();
  return data.sha ?? null;
}

// Get the latest commit SHA of the default branch.
async function getLatestCommitSha(owner: string, repo: string): Promise<string> {
  const response = await githubFetch(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/refs/heads/main`
  );

  if (!response.ok) {
    // Try 'master' as fallback
    const masterResponse = await githubFetch(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/refs/heads/master`
    );
    if (!masterResponse.ok) {
      throw new Error("Could not find default branch (main or master)");
    }
    const masterData = await masterResponse.json();
    return masterData.object.sha;
  }

  const data = await response.json();
  return data.object.sha;
}

// Get the tree SHA from a commit.
async function getTreeSha(owner: string, repo: string, commitSha: string): Promise<string> {
  const response = await githubFetch(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/commits/${commitSha}`
  );

  if (!response.ok) {
    throw new Error(`Failed to get commit tree: ${response.status}`);
  }

  const data = await response.json();
  return data.tree.sha;
}

// Commit multiple files atomically using the Git Trees API.
export async function commitFiles(
  files: Record<string, string>,
  message: string
): Promise<void> {
  const settings = await storeModule.getSettings();
  const owner = settings.repoOwner;
  const repo = settings.repoName;

  if (!owner || !repo) {
    throw new Error("Repository not configured. Please connect GitHub first.");
  }

  // Ensure repo exists
  await ensureRepo(owner, repo);

  // Get latest commit
  const latestCommitSha = await getLatestCommitSha(owner, repo);
  const baseTreeSha = await getTreeSha(owner, repo, latestCommitSha);

  // Create blobs for each file
  const treeItems = await Promise.all(
    Object.entries(files).map(async ([path, content]) => {
      const blobResponse = await githubFetch(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/blobs`,
        {
          method: "POST",
          body: JSON.stringify({
            content,
            encoding: "utf-8",
          }),
        }
      );

      if (!blobResponse.ok) {
        throw new Error(`Failed to create blob for ${path}: ${blobResponse.status}`);
      }

      const blob = await blobResponse.json();
      return {
        path,
        mode: "100644" as const,
        type: "blob" as const,
        sha: blob.sha,
      };
    })
  );

  // Create a new tree
  const treeResponse = await githubFetch(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees`,
    {
      method: "POST",
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: treeItems,
      }),
    }
  );

  if (!treeResponse.ok) {
    throw new Error(`Failed to create tree: ${treeResponse.status}`);
  }

  const tree = await treeResponse.json();

  // Create a new commit
  const commitResponse = await githubFetch(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/commits`,
    {
      method: "POST",
      body: JSON.stringify({
        message,
        tree: tree.sha,
        parents: [latestCommitSha],
      }),
    }
  );

  if (!commitResponse.ok) {
    throw new Error(`Failed to create commit: ${commitResponse.status}`);
  }

  const commit = await commitResponse.json();

  // Update the reference
  const refResponse = await githubFetch(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/refs/heads/main`,
    {
      method: "PATCH",
      body: JSON.stringify({
        sha: commit.sha,
      }),
    }
  );

  if (!refResponse.ok) {
    // Try master branch
    const masterRefResponse = await githubFetch(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/refs/heads/master`,
      {
        method: "PATCH",
        body: JSON.stringify({
          sha: commit.sha,
        }),
      }
    );

    if (!masterRefResponse.ok) {
      throw new Error(`Failed to update ref: ${refResponse.status}`);
    }
  }

  console.log(`[Codexa] Committed ${Object.keys(files).length} files: ${message}`);
}
