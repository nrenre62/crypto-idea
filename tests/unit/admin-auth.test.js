import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * ADMIN-6 PR3 — the admin login "Forgot password?" flow. Resets the admin LOGIN password
 * (NOT the Settings password) for BOTH owner and manager, via Firebase-native
 * sendPasswordResetEmail on the isolated admin auth instance. It must reveal nothing about
 * whether an email is an admin (no enumeration): a not-found reports the same success.
 */

const sendPasswordResetEmail = vi.fn(() => Promise.resolve());
vi.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
  EmailAuthProvider: { credential: vi.fn() },
  reauthenticateWithCredential: vi.fn(),
  sendPasswordResetEmail: (...a) => sendPasswordResetEmail(...a),
}));
vi.mock("../../src/api/firebase.admin.config.js", () => ({ adminAuth: { __tag: "adminAuth" } }));

import { adminResetPassword } from "../../src/api/admin-auth.js";

describe("adminResetPassword (PR3 — admin login reset, both roles)", () => {
  beforeEach(() => { sendPasswordResetEmail.mockReset(); sendPasswordResetEmail.mockResolvedValue(); });

  it("sends a reset email on the ADMIN instance for a valid address (lower-cased)", async () => {
    const res = await adminResetPassword("Owner@Test.com");
    expect(res.success).toBe(true);
    expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    const [inst, email] = sendPasswordResetEmail.mock.calls[0];
    expect(inst).toEqual({ __tag: "adminAuth" });   // isolated admin instance, not the user app's
    expect(email).toBe("owner@test.com");
  });

  it("rejects an invalid email without calling Firebase", async () => {
    const res = await adminResetPassword("not-an-email");
    expect(res.success).toBe(false);
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("does NOT leak whether the email is an admin — a user-not-found still reports success", async () => {
    sendPasswordResetEmail.mockRejectedValueOnce({ code: "auth/user-not-found" });
    const res = await adminResetPassword("ghost@test.com");
    expect(res.success).toBe(true);
  });

  it("surfaces a genuine non-enumeration error (e.g. too-many-requests)", async () => {
    sendPasswordResetEmail.mockRejectedValueOnce({ code: "auth/too-many-requests" });
    const res = await adminResetPassword("owner@test.com");
    expect(res.success).toBe(false);
    expect(res.error).toBeTruthy();
  });
});
