// Message Validator — §4.2 of the implementation plan.

import {
  ALLOWED_TYPES,
  SUPPORTED_PLATFORMS,
  type RawSubmissionMessage,
  type AllowedMessageType,
} from "../adapters/types";

// URL patterns for supported competitive programming platforms.
const PLATFORM_URL_PATTERNS: RegExp[] = [
  /^https:\/\/(www\.)?leetcode\.com\//,
  /^https:\/\/(www\.)?codeforces\.com\//,
  /^https:\/\/(www\.)?codechef\.com\//,
];

// Check if a URL belongs to a supported platform.
export function isSupportedPlatformUrl(url: string | undefined): boolean {
  if (!url) return false;
  return PLATFORM_URL_PATTERNS.some((pattern) => pattern.test(url));
}

// Validate that a message is a well-formed RawSubmissionMessage.
export function isValidRawSubmission(
  msg: unknown
): msg is RawSubmissionMessage {
  return (
    typeof msg === "object" &&
    msg !== null &&
    ALLOWED_TYPES.has((msg as Record<string, unknown>).type as AllowedMessageType) &&
    (msg as Record<string, unknown>).type === "RAW_SUBMISSION" &&
    typeof (msg as Record<string, unknown>).platform === "string" &&
    SUPPORTED_PLATFORMS.has((msg as Record<string, unknown>).platform as string) &&
    typeof (msg as Record<string, unknown>).payload === "object" &&
    (msg as Record<string, unknown>).payload !== null
  );
}

// Validate that a message has an allowed type (for non-submission messages).
export function isAllowedMessage(
  msg: unknown
): msg is { type: AllowedMessageType } {
  return (
    typeof msg === "object" &&
    msg !== null &&
    ALLOWED_TYPES.has((msg as Record<string, unknown>).type as AllowedMessageType)
  );
}

// Determine if a sender is a legitimate content script or extension page.
export function isValidSender(
  sender: chrome.runtime.MessageSender,
  messageType: AllowedMessageType
): boolean {
  // Messages from extension pages (popup, options) are always valid for non-submission types
  if (sender.id === chrome.runtime.id && !sender.tab) {
    return messageType !== "RAW_SUBMISSION";
  }

  // RAW_SUBMISSION must come from a content script on a supported platform page
  if (messageType === "RAW_SUBMISSION") {
    return !!sender.tab && isSupportedPlatformUrl(sender.url);
  }

  // Other messages from extension pages are fine
  return sender.id === chrome.runtime.id;
}
