// LeetCode content script — untrusted zone.

interface LeetCodeScrapedData {
  title: string;
  titleSlug: string;
  questionId: string;
  difficulty: string;
  topicTags: Array<{ name: string; slug: string }>;
  lang: string;
  code: string;
  statusDisplay: string;
  submissionId: string;
}

// Scrape submission details from the LeetCode submission result page.
function scrapeLeetCodeSubmission(): LeetCodeScrapedData | null {
  try {
    // Try to get problem title and metadata from the page
    const titleEl = document.querySelector(
      '[data-cy="question-title"], .text-title-large a, a[href*="/problems/"]'
    );
    const title = titleEl?.textContent?.trim() ?? "Unknown Problem";

    // Extract slug from URL
    const urlMatch = window.location.pathname.match(
      /\/problems\/([^/]+)/
    );
    const titleSlug = urlMatch?.[1] ?? "unknown";

    // Try to get difficulty
    const difficultyEl = document.querySelector(
      '[diff], .text-difficulty-easy, .text-difficulty-medium, .text-difficulty-hard, [class*="difficulty"]'
    );
    let difficulty = "Unknown";
    const diffText = difficultyEl?.textContent?.trim().toLowerCase() ?? "";
    if (diffText.includes("easy")) difficulty = "Easy";
    else if (diffText.includes("medium")) difficulty = "Medium";
    else if (diffText.includes("hard")) difficulty = "Hard";

    // Try to get tags
    const tagElements = document.querySelectorAll(
      'a[href*="/tag/"], [class*="topic-tag"]'
    );
    const topicTags = Array.from(tagElements).map((el) => ({
      name: el.textContent?.trim() ?? "",
      slug:
        el.getAttribute("href")?.match(/\/tag\/([^/]+)/)?.[1] ?? "",
    }));

    // Try to get the code from the editor
    const codeLines = document.querySelectorAll(
      ".view-lines .view-line, .monaco-editor .view-line"
    );
    let code = "";
    if (codeLines.length > 0) {
      code = Array.from(codeLines)
        .map((line) => line.textContent ?? "")
        .join("\n");
    }

    // If no code found via Monaco, try CodeMirror or textarea
    if (!code) {
      const codeMirror = document.querySelector(".CodeMirror");
      if (codeMirror) {
        const cmInstance = (codeMirror as HTMLElement & { CodeMirror?: { getValue(): string } }).CodeMirror;
        code = cmInstance?.getValue() ?? "";
      }
    }

    // Try to get language from the language selector
    const langEl = document.querySelector(
      '[id*="lang"], button[class*="lang"], [class*="language"]'
    );
    const lang = langEl?.textContent?.trim().toLowerCase() ?? "unknown";

    // Try to get submission ID from URL or page
    const submissionMatch = window.location.pathname.match(
      /\/submissions\/(\d+)/
    );
    const submissionId = submissionMatch?.[1] ?? `lc-${Date.now()}`;

    // Get question ID if available (from URL or page metadata)
    const questionId = titleSlug; // Use slug as fallback ID

    return {
      title,
      titleSlug,
      questionId,
      difficulty,
      topicTags,
      lang,
      code,
      statusDisplay: "Accepted",
      submissionId,
    };
  } catch {
    console.error("[Codexa] Failed to scrape LeetCode submission");
    return null;
  }
}

// Observe the DOM for accepted submission results.
function initObserver(): void {
  let lastProcessedSubmission = "";

  const observer = new MutationObserver(() => {
    // Check for accepted verdict
    const verdict = document.querySelector(
      '[data-e2e-locator="submission-result"], [class*="success"], [class*="accepted"]'
    );

    const verdictText = verdict?.textContent?.trim() ?? "";

    if (
      verdictText.toLowerCase().includes("accepted") ||
      verdictText.toLowerCase().includes("success")
    ) {
      const currentUrl = window.location.href;
      // Avoid re-processing the same submission
      if (currentUrl === lastProcessedSubmission) return;
      lastProcessedSubmission = currentUrl;

      const data = scrapeLeetCodeSubmission();
      if (!data) return;

      chrome.runtime.sendMessage({
        type: "RAW_SUBMISSION" as const,
        platform: "leetcode",
        payload: data,
      });

      console.log("[Codexa] LeetCode submission detected and sent to background");
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  console.log("[Codexa] LeetCode observer initialized");
}

// Start observing when the page is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initObserver);
} else {
  initObserver();
}
