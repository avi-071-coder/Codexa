// Analytics Snapshot — §4.12 of the implementation plan.

import type { NormalizedSubmission, AnalyticsSnapshot } from "../adapters/types";
import * as store from "../state/store";
import { computeStreak } from "./streak";

// Count items by a key function.
function countBy<T>(items: T[], keyFn: (item: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const key = keyFn(item);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

// Bucket submissions by ISO week (YYYY-Www).
function bucketByWeek(items: NormalizedSubmission[]): Array<{ week: string; count: number }> {
  const buckets: Record<string, number> = {};

  for (const item of items) {
    const date = new Date(item.submittedAt);
    if (isNaN(date.getTime())) continue;

    // Get ISO week string
    const year = date.getFullYear();
    const jan1 = new Date(year, 0, 1);
    const dayOfYear = Math.floor((date.getTime() - jan1.getTime()) / 86400000) + 1;
    const weekNum = Math.ceil(dayOfYear / 7);
    const week = `${year}-W${String(weekNum).padStart(2, "0")}`;
    buckets[week] = (buckets[week] ?? 0) + 1;
  }

  return Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12) // Last 12 weeks
    .map(([week, count]) => ({ week, count }));
}

// Generate a full analytics snapshot from all synced submissions.
export async function snapshot(): Promise<AnalyticsSnapshot> {
  const all = await store.listAllSynced();

  const dates = all
    .map((s) => s.submittedAt)
    .filter((d) => !isNaN(new Date(d).getTime()));

  const streakData = computeStreak(dates);

  return {
    total: all.length,
    byPlatform: countBy(all, (s) => s.platform),
    byDifficulty: countBy(all, (s) => s.difficulty),
    byTopic: countBy(all, (s) => s.category),
    byLanguage: countBy(all, (s) => s.language),
    streak: streakData,
    weekly: bucketByWeek(all),
    recentSubmissions: all.slice(0, 10).map((s) => ({
      title: s.title,
      platform: s.platform,
      difficulty: s.difficulty,
      language: s.language,
      submittedAt: s.submittedAt,
    })),
    contests: all.some((s) => s.contest)
      ? {
          total: all.filter((s) => s.contest).length,
          platforms: countBy(
            all.filter((s) => s.contest),
            (s) => s.platform
          ),
        }
      : undefined,
  };
}
