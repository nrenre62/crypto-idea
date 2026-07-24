import { describe, it, expect } from "vitest";
import { dismissKey, isDismissed, dismiss } from "../../src/utils/announcement.js";

// ADMIN-5 — client dismiss state for the announcement banner (keyed to the message).
function fakeStorage() {
  const map = new Map();
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)) };
}

describe("announcement dismiss", () => {
  it("a message is not dismissed until dismiss() is called", () => {
    const s = fakeStorage();
    expect(isDismissed("Hello", s)).toBe(false);
    dismiss("Hello", s);
    expect(isDismissed("Hello", s)).toBe(true);
  });

  it("CHANGING the message re-shows the banner (a new notice is new)", () => {
    const s = fakeStorage();
    dismiss("Old message", s);
    expect(isDismissed("Old message", s)).toBe(true);
    // Admin edits the wording → different key → not dismissed.
    expect(isDismissed("New message", s)).toBe(false);
  });

  it("distinct messages hash to distinct keys", () => {
    expect(dismissKey("a")).not.toBe(dismissKey("b"));
    expect(dismissKey("same")).toBe(dismissKey("same"));
  });

  it("empty text is never considered dismissed", () => {
    const s = fakeStorage();
    dismiss("", s);
    expect(isDismissed("", s)).toBe(false);
  });
});
