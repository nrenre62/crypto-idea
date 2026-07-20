import { describe, it, expect } from "vitest";
import { findEnvProblems, parseEnv, REQUIRED_KEYS } from "../../scripts/check-env.js";

// The deploy-time guard (scripts/check-env.js) blocks a deploy that would ship the
// DEMO Firebase config to production. The subtle case it exists for: a
// copied-but-unfilled .env holds TRUTHY placeholders, so the app's own
// `!!realConfig.apiKey` check passes and it initializes against a real project id
// with a garbage key. These lock the pure matcher's behaviour.
const good = {
  VITE_FIREBASE_API_KEY: "AIzaSyRealLookingKey123",
  VITE_FIREBASE_AUTH_DOMAIN: "crypto-idea.firebaseapp.com",
  VITE_FIREBASE_PROJECT_ID: "crypto-idea",
  VITE_FIREBASE_STORAGE_BUCKET: "crypto-idea.appspot.com",
  VITE_FIREBASE_MESSAGING_SENDER_ID: "123456789012",
  VITE_FIREBASE_APP_ID: "1:123456789012:web:abc123",
};

describe("env guard — findEnvProblems (B2)", () => {
  it("passes a fully-filled production config", () => {
    expect(findEnvProblems(good)).toEqual([]);
  });

  it("flags a missing key", () => {
    const { VITE_FIREBASE_APP_ID, ...rest } = good;
    expect(findEnvProblems(rest)).toEqual(["VITE_FIREBASE_APP_ID is missing"]);
  });

  it("flags an empty value", () => {
    expect(findEnvProblems({ ...good, VITE_FIREBASE_API_KEY: "" }))
      .toEqual(["VITE_FIREBASE_API_KEY is empty"]);
  });

  it("flags the TRUTHY .env.example placeholders (the real trap)", () => {
    const problems = findEnvProblems({
      ...good,
      VITE_FIREBASE_API_KEY: "your_api_key_here",
      VITE_FIREBASE_MESSAGING_SENDER_ID: "your_sender_id_here",
    });
    expect(problems).toHaveLength(2);
    expect(problems[0]).toMatch(/VITE_FIREBASE_API_KEY still holds the placeholder/);
    expect(problems[1]).toMatch(/VITE_FIREBASE_MESSAGING_SENDER_ID still holds the placeholder/);
  });

  it("refuses to deploy at the emulator project", () => {
    expect(findEnvProblems({ ...good, VITE_FIREBASE_PROJECT_ID: "demo-crypto-idea" }))
      .toEqual(['VITE_FIREBASE_PROJECT_ID points at the emulator project "demo-crypto-idea"']);
  });

  it("reports every problem at once, not just the first", () => {
    expect(findEnvProblems({})).toHaveLength(REQUIRED_KEYS.length);
  });
});

describe("env guard — parseEnv", () => {
  it("parses KEY=VALUE pairs and ignores blanks and comments", () => {
    const parsed = parseEnv("# a comment\n\nA=1\n  B = two \n#C=3\n");
    expect(parsed).toEqual({ A: "1", B: "two" });
  });

  it("keeps '=' characters inside a value (base64/app ids)", () => {
    expect(parseEnv("K=a=b=c").K).toBe("a=b=c");
  });

  it("ignores a line with no '='", () => {
    expect(parseEnv("JUST_A_WORD\nA=1")).toEqual({ A: "1" });
  });
});
