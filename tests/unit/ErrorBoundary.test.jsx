import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { ErrorBoundary } from "../../src/components/ErrorBoundary.jsx";

function Boom() {
  throw new Error("kaboom");
}

// H8 (GO-LIVE-AUDIT): a render throw must NOT give the user a blank white page — the
// boundary catches it and shows a recoverable fallback with a manual reload.
describe("ErrorBoundary (H8 go-live)", () => {
  it("renders its children unchanged when nothing throws", () => {
    render(
      <ErrorBoundary>
        <div>safe content</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText("safe content")).toBeInTheDocument();
  });

  it("catches a render throw and shows a recoverable fallback (not a white screen)", () => {
    // React logs the caught error; silence it for this expected case.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reload/i })).toBeInTheDocument();
    // The error was logged, never silently swallowed.
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("CRYP-115: the fallback uses dark-safe theme tokens, not hardcoded light-only hex", () => {
    // In dark mode the hardcoded #F6F5F0/#1A1A2E showed a light screen with near-black
    // text; the fallback must read var(--app-bg)/var(--app-fg) — with a hex fallback so it
    // still works if the stylesheet failed to load — so it flips like its sibling screens.
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(resolve(here, "../../src/components/ErrorBoundary.jsx"), "utf8");
    expect(src).toMatch(/var\(--app-bg,\s*#F6F5F0\)/);
    expect(src).toMatch(/var\(--app-fg,\s*#1A1A2E\)/);
    // no bare light-only background/foreground left behind
    expect(src).not.toMatch(/background:\s*["']#F6F5F0["']/);
    expect(src).not.toMatch(/color:\s*["']#1A1A2E["']/);
  });
});
