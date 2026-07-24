import { describe, it, expect } from "vitest";
import { esc, row, CSV_BOM } from "../../src/utils/csv.js";

// ADMIN-3 (2026-07-24): the shared CSV primitives behind BOTH the user portfolio export
// and the two admin exports. One implementation, so quoting and formula-neutralising
// can't drift between them.

describe("csv.esc", () => {
  it("leaves a plain value alone", () => {
    expect(esc("hello")).toBe("hello");
    expect(esc("user@test.com")).toBe("user@test.com");
  });

  it("quotes commas, quotes and newlines, doubling embedded quotes", () => {
    expect(esc("a,b")).toBe('"a,b"');
    expect(esc('say "hi"')).toBe('"say ""hi"""');
    expect(esc("line1\nline2")).toBe('"line1\nline2"');
  });

  it("renders null/undefined as an empty field", () => {
    expect(esc(null)).toBe("");
    expect(esc(undefined)).toBe("");
  });

  // ── CSV injection (CWE-1236) ────────────────────────────────────────────────
  it("neutralises a formula lead so a display name can't execute in a spreadsheet", () => {
    // A user names themselves this; an admin opens the users export in Excel.
    expect(esc('=HYPERLINK("http://evil","click")')).toBe(`"'=HYPERLINK(""http://evil"",""click"")"`);
    expect(esc("=1+1")).toBe("'=1+1");
    expect(esc("+1234")).toBe("'+1234");
    expect(esc("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(esc("\tcmd")).toBe("'\tcmd");
  });

  it("does NOT mangle a legitimate negative number (it must stay numeric)", () => {
    // Prefixing "-12.5" would turn a numeric column into text and break every sum.
    expect(esc("-12.5")).toBe("-12.5");
    expect(esc(-12.5)).toBe("-12.5");
    expect(esc("-3")).toBe("-3");
    expect(esc(0)).toBe("0");
  });

  it("still guards a value that only LOOKS numeric", () => {
    // No comma/quote/newline, so it is prefixed but NOT wrapped.
    expect(esc("-1+cmd|'/c calc'!A0")).toBe("'-1+cmd|'/c calc'!A0");
    expect(esc("-1e9")).toBe("'-1e9");   // exponent form isn't matched by the plain-number gate
  });
});

describe("csv.row", () => {
  it("joins escaped cells with commas", () => {
    expect(row(["a", "b,c", 3])).toBe('a,"b,c",3');
  });
  it("handles an empty array", () => {
    expect(row([])).toBe("");
  });
});

describe("csv.CSV_BOM", () => {
  it("is exactly the UTF-8 BOM character Excel looks for", () => {
    // Written as a literal in the source — assert the code point, not the glyph.
    expect(CSV_BOM).toBe("﻿");
    expect(CSV_BOM.length).toBe(1);
    expect(CSV_BOM.charCodeAt(0)).toBe(0xfeff);
  });
});
