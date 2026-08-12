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

describe("sendMail.sendMail (dev / no-SMTP seam)", () => {
  it("logs the message (incl. the link) and returns {logged:true} without sending when no SMTP is configured", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const res = await sendMail({ to: "owner@cryptoidea.app", subject: "Reset", text: "https://cryptoidea.app/admin?reset=THE-TOKEN" }, {});
    expect(res).toEqual({ logged: true });
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls.flat().join(" ")).toContain("THE-TOKEN");
    spy.mockRestore();
  });
});
