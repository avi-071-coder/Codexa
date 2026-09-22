// Repository Engine — §4.7 of the implementation plan.

import type { NormalizedSubmission } from "../adapters/types";
import { buildProblemPath, nextSolutionFilename } from "./pathBuilder";
import { categorize } from "./categorizer";
import { renderProblemReadme, renderRootReadme, commitMessage } from "./readme";
import { snapshot } from "../analytics/snapshot";
import * as github from "../github/commit";
import * as store from "../state/store";

// Apply a submission — build the file map and commit to GitHub.
export async function apply(submission: NormalizedSubmission): Promise<void> {
  const settings = await store.getSettings();
  const category = categorize(submission);
  const dir = buildProblemPath(submission.platform, category, submission.slug);

  // Check for existing files in this problem's directory
  const existing = await github
    .listDir(settings.repoOwner, settings.repoName, dir)
    .catch(() => null);

  const filename = nextSolutionFilename(existing, submission.language);

  // Get analytics for the root README
  const analyticsData = await snapshot();

  // Build the file map — only touch files inside `dir` plus the root README
  const files: Record<string, string> = {
    [`${dir}/${filename}`]: submission.code,
    [`${dir}/README.md`]: renderProblemReadme(dir, submission, existing),
    ["README.md"]: renderRootReadme(analyticsData),
  };

  const message = commitMessage(submission);

  // Commit all files atomically
  await github.commitFiles(files, message);
}
