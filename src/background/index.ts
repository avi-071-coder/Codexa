// Service Worker Entry Point — background/index.ts

import {
  isValidRawSubmission,
  isAllowedMessage,
  isValidSender,
} from "./messageValidator";
import { handle } from "./submissionEngine";
import { initSyncAlarm, handleAlarm, retryFailed } from "./syncQueue";
import {
  getConnectionStatus,
  disconnect,
  connectWithToken,
} from "./githubAuth";
import { snapshot } from "../analytics/snapshot";
import { getSyncSummary, listAllSynced } from "../state/store";
import { safeErrorMessage } from "../lib/safeError";
import type { AllowedMessageType } from "../adapters/types";

// Main message listener.
chrome.runtime.onMessage.addListener(
  (msg: unknown, sender: chrome.runtime.MessageSender, sendResponse) => {
    // Step 1: Validate message shape
    if (!isAllowedMessage(msg)) {
      console.warn("[Codexa] Rejected unknown message type");
      return false;
    }

    // Step 2: Validate sender
    if (!isValidSender(sender, msg.type)) {
      console.warn("[Codexa] Rejected message from invalid sender", sender.url);
      return false;
    }

    // Step 3: Dispatch by type
    handleMessage(msg as { type: AllowedMessageType; [key: string]: unknown }, sendResponse)
      .catch((err) => {
        console.error(`[Codexa] Message handler error: ${safeErrorMessage(err)}`);
        sendResponse({ error: safeErrorMessage(err) });
      });

    // Return true to indicate async response
    return true;
  }
);

// Dispatch validated messages to their handlers.
async function handleMessage(
  msg: { type: AllowedMessageType; [key: string]: unknown },
  sendResponse: (response?: unknown) => void
): Promise<void> {
  switch (msg.type) {
    case "RAW_SUBMISSION": {
      if (isValidRawSubmission(msg)) {
        await handle(msg);
        sendResponse({ ok: true });
      } else {
        sendResponse({ error: "Invalid submission format" });
      }
      break;
    }

    case "GET_CONNECTION_STATUS": {
      // Returns ONLY non-secret metadata — never the token
      const status = await getConnectionStatus();
      sendResponse(status);
      break;
    }

    case "CONNECT_GITHUB": {
      try {
        const token = msg.token as string;
        const repoUrl = msg.repoUrl as string;

        if (!token || !repoUrl) {
          sendResponse({ error: "Token and repo URL are required." });
          break;
        }

        // connectWithToken validates the token, verifies repo access,
        // and stores auth securely. Token never leaves the service worker.
        const result = await connectWithToken(token, repoUrl);
        sendResponse({ ok: true, login: result.login, repo: result.repo });
      } catch (err) {
        sendResponse({ error: safeErrorMessage(err) });
      }
      break;
    }

    case "DISCONNECT_GITHUB": {
      await disconnect();
      sendResponse({ ok: true });
      break;
    }

    case "GET_ANALYTICS": {
      const data = await snapshot();
      sendResponse(data);
      break;
    }

    case "GET_SYNC_STATUS": {
      const summary = await getSyncSummary();
      sendResponse(summary);
      break;
    }

    case "GET_RECENT_SUBMISSIONS": {
      const submissions = await listAllSynced();
      sendResponse(
        submissions.slice(0, 20).map((s) => ({
          title: s.title,
          platform: s.platform,
          difficulty: s.difficulty,
          language: s.language,
          submittedAt: s.submittedAt,
          slug: s.slug,
        }))
      );
      break;
    }

    default: {
      sendResponse({ error: "Unknown message type" });
    }
  }
}

// Alarm listener — drives the sync queue.
chrome.alarms.onAlarm.addListener(handleAlarm);

// Extension install/update handler.
chrome.runtime.onInstalled.addListener((details) => {
  console.log(`[Codexa] Extension ${details.reason}: ${chrome.runtime.getManifest().version}`);

  // Initialize the sync alarm
  initSyncAlarm();

  // Retry failed items on extension update
  if (details.reason === "update") {
    retryFailed().catch(console.error);
  }
});

// Service worker startup — ensure alarm is running.
chrome.runtime.onStartup.addListener(() => {
  console.log("[Codexa] Service worker started");
  initSyncAlarm();
});

// Initialize alarm immediately in case this is a fresh load
initSyncAlarm();

console.log("[Codexa] Service worker loaded");
