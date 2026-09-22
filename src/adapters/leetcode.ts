// LeetCode adapter — converts raw scraped data into a NormalizedSubmission.

import type { NormalizedSubmission } from "./types";

export interface LeetCodeRaw {
  title: string;
  titleSlug: string;
  questionId: string;
  difficulty: string;
  topicTags: Array<{ name: string; slug?: string }>;
  lang: string;
  code: string;
  statusDisplay: string;
  submissionId?: string;
}

// Validate that the raw payload has the minimum required shape.
export function isLeetCodeRaw(payload: unknown): payload is LeetCodeRaw {
  if (typeof payload !== "object" || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return (
    typeof p.title === "string" &&
    typeof p.titleSlug === "string" &&
    typeof p.code === "string" &&
    typeof p.lang === "string" &&
    typeof p.statusDisplay === "string"
  );
}

// Normalize a validated LeetCode raw payload into the canonical submission shape.
export function normalizeLeetCode(raw: LeetCodeRaw): NormalizedSubmission {
  const tags = Array.isArray(raw.topicTags)
    ? raw.topicTags
        .filter((t) => typeof t === "object" && t !== null && typeof t.name === "string")
        .map((t) => t.name)
    : [];

  const difficultyMap: Record<string, NormalizedSubmission["difficulty"]> = {
    easy: "Easy",
    medium: "Medium",
    hard: "Hard",
  };

  const difficulty =
    difficultyMap[String(raw.difficulty).toLowerCase()] ?? "Unknown";

  return {
    platform: "leetcode",
    problemId: String(raw.questionId ?? raw.titleSlug),
    slug: String(raw.titleSlug),
    title: String(raw.title),
    difficulty,
    category: tags[0] ?? "Misc",
    tags,
    language: String(raw.lang).toLowerCase(),
    code: String(raw.code),
    status: raw.statusDisplay === "Accepted" ? "Accepted" : "Other",
    submissionId: raw.submissionId ? String(raw.submissionId) : undefined,
    submittedAt: new Date().toISOString(),
  };
}
