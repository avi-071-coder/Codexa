// Secure error message sanitizer.

const SECRET_PATTERNS = [
  /gh[pousr]_[A-Za-z0-9]{36,}/g,          // GitHub token patterns (PAT, OAuth, etc.)
  /github_pat_[A-Za-z0-9_]{22,}/g,        // Fine-grained PATs
  /Bearer\s+\S+/gi,                        // Authorization headers
  /token\s+[A-Za-z0-9_\-\.]+/gi,          // Generic "token <value>" patterns
  /access_token=[A-Za-z0-9_\-\.]+/gi,     // Query string tokens
  /authorization:\s*\S+/gi,               // Authorization header values
];

// Sanitize an error for safe storage/display.
export function safeErrorMessage(err: unknown): string {
  let msg: string;

  if (err instanceof Error) {
    msg = err.message;
  } else if (typeof err === "string") {
    msg = err;
  } else {
    try {
      msg = JSON.stringify(err);
    } catch {
      msg = String(err);
    }
  }

  for (const pattern of SECRET_PATTERNS) {
    // Reset lastIndex for global regexes
    pattern.lastIndex = 0;
    msg = msg.replace(pattern, "[redacted]");
  }

  // Truncate overly long messages (e.g., full response bodies)
  if (msg.length > 500) {
    msg = msg.slice(0, 500) + "… [truncated]";
  }

  return msg;
}

// Wrap an async operation with safe error handling.
export async function safeAsync<T>(
  fn: () => Promise<T>
): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
  try {
    const value = await fn();
    return { ok: true, value };
  } catch (err) {
    return { ok: false, error: safeErrorMessage(err) };
  }
}
