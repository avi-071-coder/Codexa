// Submission Engine — §4.4 of the implementation plan.

import type { RawSubmissionMessage, NormalizedSubmission } from "../adapters/types";
import { isLeetCodeRaw, normalizeLeetCode } from "../adapters/leetcode";
import { dedupAndQueue } from "../state/dedup";

type AdapterNormalizer = (payload: unknown) => NormalizedSubmission | null;

// Platform adapter registry.
const adapters: Record<string, AdapterNormalizer> = {
  leetcode: (payload) => {
    if (!isLeetCodeRaw(payload)) return null;
    return normalizeLeetCode(payload);
  },
  // Future adapters:
  // codeforces: (payload) => { ... },
  // codechef: (payload) => { ... },
};

// Handle a raw submission message.
export async function handle(msg: RawSubmissionMessage): Promise<void> {
  const adapter = adapters[msg.platform];
  if (!adapter) {
    console.warn(`[Codexa] No adapter for platform: ${msg.platform}`);
    return;
  }

  const submission = adapter(msg.payload);
  if (!submission) {
    console.warn(`[Codexa] Adapter returned null for ${msg.platform} submission`);
    return;
  }

  // §4.4 Acceptance Gate — only "Accepted" submissions pass
  if (submission.status !== "Accepted") {
    console.log(`[Codexa] Dropped non-accepted submission: ${submission.status}`);
    return;
  }

  // §4.5 Dedup + Queue
  const queued = await dedupAndQueue(submission);
  if (queued) {
    console.log(`[Codexa] Submission queued: ${submission.title} (${submission.language})`);
  }
}
