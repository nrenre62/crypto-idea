import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { useIsDesktop } from "../../src/hooks/useIsDesktop.js";

const mm = (matches) => vi.fn().mockReturnValue({
  matches, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
});

describe("useIsDesktop (R19-9)", () => {
  afterEach(() => { delete window.matchMedia; });

  it("defaults to FALSE (mobile) when matchMedia is unavailable — keeps drill-ins full-screen", () => {
    delete window.matchMedia;
    const { result } = renderHook(() => useIsDesktop());
    expect(result.current).toBe(false);
  });

  it("is true on a desktop-width viewport", () => {
    window.matchMedia = mm(true);
    const { result } = renderHook(() => useIsDesktop());
    expect(result.current).toBe(true);
  });

  it("is false on a mobile-width viewport", () => {
    window.matchMedia = mm(false);
    const { result } = renderHook(() => useIsDesktop());
    expect(result.current).toBe(false);
  });
});
