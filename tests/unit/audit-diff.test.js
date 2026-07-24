import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { fmtVal, changeDetail } = require("../../functions/audit-diff.js");

// ADMIN-5 — before/after formatting for per-user admin-action audit entries.

describe("audit-diff.fmtVal", () => {
  it("renders an empty/absent value as (none)", () => {
    expect(fmtVal("")).toBe("(none)");
    expect(fmtVal(null)).toBe("(none)");
    expect(fmtVal(undefined)).toBe("(none)");
  });

  it("renders an object as compact JSON", () => {
    expect(fmtVal({ coins: 100 })).toBe('{"coins":100}');
    expect(fmtVal({})).toBe("{}");
  });

  it("stringifies scalars as-is", () => {
    expect(fmtVal("premium")).toBe("premium");
    expect(fmtVal(true)).toBe("true");
    expect(fmtVal(false)).toBe("false");
    expect(fmtVal(0)).toBe("0");
  });
});

describe("audit-diff.changeDetail", () => {
  it("formats a tier change", () => {
    expect(changeDetail("tier", "free", "premium")).toBe("tier: free→premium");
  });

  it("shows a grant from nothing as (none)→manager", () => {
    expect(changeDetail("role", "", "manager")).toBe("role: (none)→manager");
    expect(changeDetail("role", "manager", "")).toBe("role: manager→(none)");
  });

  it("formats a boolean transition (suspend / trash)", () => {
    expect(changeDetail("disabled", false, true)).toBe("disabled: false→true");
    expect(changeDetail("deleted", true, false)).toBe("deleted: true→false");
  });

  it("formats a limits-object change (empty {} renders as {}, not (none))", () => {
    expect(changeDetail("limits", {}, { coins: 100 })).toBe('limits: {}→{"coins":100}');
  });
});
