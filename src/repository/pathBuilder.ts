// Path Builder / Sanitizer — §4.6 of the implementation plan.

import { LANG_EXTENSIONS } from "../adapters/types";

export class PathSecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PathSecurityError";
  }
}

// Sanitize a single path segment. Strip anything that isn't alnum/space/hyphen,
export function sanitizeSegment(input: string): string {
  return (
    input
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[^a-z0-9\- ]/g, "")   // strip anything not alnum/space/hyphen
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 60) || "misc"          // never produce an empty segment
  );
}

// Build a safe repository path for a problem's solution directory.
export function buildProblemPath(
  platform: string,
  category: string,
  slug: string
): string {
  const safe = [platform, category, slug].map(sanitizeSegment);
  const path = safe.join("/");

  // Defense-in-depth: even though sanitizeSegment strips dots, check anyway
  if (
    safe.some((seg) => seg === "." || seg === "..") ||
    path.includes("../")
  ) {
    throw new PathSecurityError(`Rejected unsafe path: ${path}`);
  }

  return path;
}

// Generate the filename for a solution file.
export function nextSolutionFilename(
  existingFiles: string[] | null,
  language: string
): string {
  const ext = LANG_EXTENSIONS[language.toLowerCase()] ?? "txt";
  const base = "solution";

  if (!existingFiles || existingFiles.length === 0) {
    return `${base}.${ext}`;
  }

  // Find existing solution files with this extension
  const pattern = new RegExp(`^${base}(\\d*)\\.${ext}$`);
  const existing = existingFiles
    .filter((f) => pattern.test(f))
    .map((f) => {
      const match = f.match(pattern);
      return match?.[1] ? parseInt(match[1], 10) : 1;
    });

  if (existing.length === 0) {
    return `${base}.${ext}`;
  }

  const maxNum = Math.max(...existing);
  return `${base}${maxNum + 1}.${ext}`;
}

// Build the full file path for a solution within the repo.
export function buildSolutionPath(
  platform: string,
  category: string,
  slug: string,
  filename: string
): string {
  const dir = buildProblemPath(platform, category, slug);
  return `${dir}/${filename}`;
}
