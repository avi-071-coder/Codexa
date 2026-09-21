// Sync Queue — §4.9 of the implementation plan.

import * as store from "../state/store";
import * as repositoryEngine from "../repository/repositoryEngine";
import { isRateLimited, type RateLimitError } from "../github/commit";
import { safeErrorMessage } from "../lib/safeError";

const SYNC_ALARM_NAME = "codexa-sync";
const SYNC_INTERVAL_MINUTES = 1; // Check every minute
const MAX_RETRIES = 5;

// Track rate limit backoff
let backoffUntilMs = 0;

// Initialize the sync queue alarm.
export function initSyncAlarm(): void {
  // Create a periodic alarm to process the queue
  chrome.alarms.create(SYNC_ALARM_NAME, {
    delayInMinutes: 0.1, // Start quickly
    periodInMinutes: SYNC_INTERVAL_MINUTES,
  });

  console.log("[Codexa] Sync alarm initialized");
}

// Process the next pending item in the queue.
export async function processNext(): Promise<void> {
  // Check if we're in a rate-limit backoff period
  if (Date.now() < backoffUntilMs) {
    console.log(
      `[Codexa] Rate-limit backoff until ${new Date(backoffUntilMs).toISOString()}`
    );
    return;
  }

  const item = await store.nextPending();
  if (!item) return; // Nothing to process

  // Check if we've exceeded max retries
  if ((item.retryCount ?? 0) >= MAX_RETRIES) {
    await store.setStatus(item.key, "failed", {
      retryable: false,
      message: `Exceeded max retries (${MAX_RETRIES})`,
    });
    return;
  }

  await store.setStatus(item.key, "syncing");

  try {
    await repositoryEngine.apply(item.data);
    await store.setStatus(item.key, "synced");
    console.log(`[Codexa] Synced: ${item.data.title}`);
  } catch (err) {
    if (isRateLimited(err)) {
      backoffUntilMs = (err as RateLimitError).resetAt;
      console.log(
        `[Codexa] Rate limited. Backing off until ${new Date(backoffUntilMs).toISOString()}`
      );
      // Put it back to pending so it can be retried
      await store.setStatus(item.key, "pending");
    } else {
      await store.setStatus(item.key, "failed", {
        retryable: true,
        message: safeErrorMessage(err),
      });
      console.error(`[Codexa] Sync failed: ${safeErrorMessage(err)}`);
    }
  }
}

// Retry all failed + retryable items by resetting them to pending.
export async function retryFailed(): Promise<number> {
  const failed = await store.listRetryable();
  let count = 0;

  for (const record of failed) {
    await store.setStatus(record.key, "pending");
    count++;
  }

  console.log(`[Codexa] Retried ${count} failed items`);
  return count;
}

// Alarm listener — called by chrome.alarms.onAlarm.
export function handleAlarm(alarm: chrome.alarms.Alarm): void {
  if (alarm.name === SYNC_ALARM_NAME) {
    processNext().catch((err) => {
      console.error(`[Codexa] Queue processing error: ${safeErrorMessage(err)}`);
    });
  }
}
