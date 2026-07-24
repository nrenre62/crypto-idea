import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const announce = require("../../functions/announcement.js");

// ADMIN-5 — the site announcement banner's server-side sanitise / merge / publish.

describe("announcement.sanitize", () => {
  it("coerces a valid object through unchanged (trimmed)", () => {
    expect(announce.sanitize({ text: "  Hello  ", level: "warning", active: true }))
      .toEqual({ text: "Hello", level: "warning", active: true });
  });

  it("defaults an unknown level to info", () => {
    expect(announce.sanitize({ text: "x", level: "boom", active: true }).level).toBe("info");
  });

  it("FORCES active:false when the text is empty — an empty banner can never be on", () => {
    expect(announce.sanitize({ text: "", active: true })).toEqual({ text: "", level: "info", active: false });
    expect(announce.sanitize({ text: "   ", active: true }).active).toBe(false);
  });

  it("caps the text length", () => {
    const long = "a".repeat(500);
    expect(announce.sanitize({ text: long, active: true }).text.length).toBe(announce.TEXT_MAX);
  });

  it("never throws on junk input", () => {
    expect(announce.sanitize(null)).toEqual({ text: "", level: "info", active: false });
    expect(announce.sanitize(undefined)).toEqual({ text: "", level: "info", active: false });
    expect(announce.sanitize("nope")).toEqual({ text: "", level: "info", active: false });
    expect(announce.sanitize({ text: 42, level: 7, active: "yes" })).toEqual({ text: "42", level: "info", active: true });
  });
});

describe("announcement.cleanAnnouncement (saveConfig merge rule)", () => {
  it("KEEPS the stored announcement when the payload omits it (undefined/null)", () => {
    const existing = { text: "kept", level: "critical", active: true };
    expect(announce.cleanAnnouncement(undefined, existing)).toEqual(existing);
    expect(announce.cleanAnnouncement(null, existing)).toEqual(existing);
  });

  it("replaces (sanitised) when a value IS provided", () => {
    const existing = { text: "old", level: "info", active: true };
    expect(announce.cleanAnnouncement({ text: "new", level: "warning", active: true }, existing))
      .toEqual({ text: "new", level: "warning", active: true });
  });

  it("an explicit clear (empty text) turns it off, even over an active stored one", () => {
    const existing = { text: "old", level: "info", active: true };
    expect(announce.cleanAnnouncement({ text: "", active: true }, existing).active).toBe(false);
  });
});

describe("announcement.publicAnnouncement (/api/config)", () => {
  it("returns {text, level} ONLY when active", () => {
    expect(announce.publicAnnouncement({ announcement: { text: "hi", level: "warning", active: true } }))
      .toEqual({ text: "hi", level: "warning" });
  });

  it("returns null for a drafted (inactive) banner — a draft is never broadcast", () => {
    expect(announce.publicAnnouncement({ announcement: { text: "draft", level: "info", active: false } })).toBeNull();
  });

  it("returns null when there is no announcement at all", () => {
    expect(announce.publicAnnouncement({})).toBeNull();
    expect(announce.publicAnnouncement(null)).toBeNull();
  });

  it("never leaks the text field of an inactive banner", () => {
    const out = announce.publicAnnouncement({ announcement: { text: "secret plan", level: "critical", active: false } });
    expect(out).toBeNull();
  });
});
