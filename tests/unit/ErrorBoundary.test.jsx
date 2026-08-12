import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
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
});
