import { describe, it, expect, vi } from "vitest";
import { smtpConfigOf, sendMail } from "../../functions/sendMail.js";

/**
 * ADMIN-6 PR2 — the outbound-email seam. Pure `smtpConfigOf` extracts DreamHost SMTP
 * settings from config/app.email (or null when incomplete); `sendMail` is a seam that
 * LOGS the link in dev / when no SMTP is configured (returning {logged:true}) and only
 * lazy-requires nodemailer on the real send path — so this suite never needs nodemailer
 * installed and the dev path never loads it.
 */

describe("sendMail.smtpConfigOf (pure SMTP config extraction)", () => {
  it("returns null when the SMTP config is incomplete", () => {
    expect(smtpConfigOf({})).toBeNull();
    expect(smtpConfigOf(null)).toBeNull();
    expect(smtpConfigOf({ email: { smtpHost: "mail.dreamhost.com" } })).toBeNull();        // no user/pass/from
    expect(smtpConfigOf({ email: { smtpHost: "h", smtpUser: "u", smtpPass: "", fromEmail: "f@x.com" } })).toBeNull(); // blank pass
    expect(smtpConfigOf({ email: { smtpHost: "h", smtpUser: "u", smtpPass: "p", fromEmail: "" } })).toBeNull();        // no from
  });
  it("returns a complete config when every required field is present", () => {
    const c = smtpConfigOf({ email: { smtpHost: "mail.dreamhost.com", smtpUser: "me@cryptoidea.app", smtpPass: "secret", fromEmail: "me@cryptoidea.app", smtpPort: 587 } });
    expect(c).toMatchObject({ host: "mail.dreamhost.com", user: "me@cryptoidea.app", pass: "secret", from: "me@cryptoidea.app", port: 587 });
  });
  it("defaults the port to 587 and derives `secure` from port 465", () => {
    const c465 = smtpConfigOf({ email: { smtpHost: "h", smtpUser: "u", smtpPass: "p", fromEmail: "f@x.com", smtpPort: 465 } });
    expect(c465.secure).toBe(true);
    const cDefault = smtpConfigOf({ email: { smtpHost: "h", smtpUser: "u", smtpPass: "p", fromEmail: "f@x.com" } });
    expect(cDefault.port).toBe(587);
    expect(cDefault.secure).toBe(false);
  });
});

describe("sendMail.sendMail (seam)", () => {
  it("under the emulator, logs the full message incl. the link and returns {logged:true}", async () => {
    const prev = process.env.FUNCTIONS_EMULATOR;
    process.env.FUNCTIONS_EMULATOR = "true";
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      const res = await sendMail({ to: "owner@cryptoidea.app", subject: "Reset", text: "https://cryptoidea.app/admin?reset=THE-TOKEN" }, {});
      expect(res).toEqual({ logged: true });
      expect(spy.mock.calls.flat().join(" ")).toContain("THE-TOKEN");   // dev needs the link to complete the flow
    } finally {
      if (prev === undefined) delete process.env.FUNCTIONS_EMULATOR; else process.env.FUNCTIONS_EMULATOR = prev;
      spy.mockRestore();
    }
  });

  // SEC-review #1: in a DEPLOYED env with no SMTP configured, the reset TOKEN must never
  // reach the logs — a redacted marker only.
  it("in deployed prod with NO SMTP, does NOT log the token and reports notConfigured", async () => {
    const prev = process.env.FUNCTIONS_EMULATOR;
    delete process.env.FUNCTIONS_EMULATOR;
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const res = await sendMail({ to: "owner@cryptoidea.app", subject: "Reset", text: "https://cryptoidea.app/admin?reset=SECRET-TOKEN" }, {});
      expect(res).toMatchObject({ logged: true, notConfigured: true });
      const allOutput = [...logSpy.mock.calls, ...warnSpy.mock.calls].flat().join(" ");
      expect(allOutput).not.toContain("SECRET-TOKEN");
    } finally {
      if (prev === undefined) delete process.env.FUNCTIONS_EMULATOR; else process.env.FUNCTIONS_EMULATOR = prev;
      logSpy.mockRestore(); warnSpy.mockRestore();
    }
  });
});
