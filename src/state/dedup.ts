// Deduplication — §4.5 of the implementation plan.

import type { NormalizedSubmission } from "../adapters/types";
import { sha256 } from "../lib/crypto";
import * as store from "./store";

// Compute a fingerprint for a submission.
export async function fingerprint(s: NormalizedSubmission): Promise<string> {
  if (s.submissionId) {
    return `${s.platform}:${s.submissionId}`;
  }
  const codeHash = await sha256(s.code);
  return `${s.platform}:${s.slug}:${s.language}:${codeHash}`;
}

// Check for duplicates and queue the submission if it's new.
export async function dedupAndQueue(s: NormalizedSubmission): Promise<boolean> {
  const key = await fingerprint(s);

  if (await store.isKnown(key)) {
    console.log(`[Codexa] Duplicate detected, skipping: ${key}`);
    return false;
  }

  await store.markPending(key, s);
  console.log(`[Codexa] Queued new submission: ${key}`);
  return true;
}
