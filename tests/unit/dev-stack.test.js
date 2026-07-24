import { describe, it, expect } from "vitest";
import { buildStackArgs } from "../../scripts/dev-stack.js";

describe("dev-stack buildStackArgs (persistent emulator data)", () => {
  it("always exports on exit and runs the dev server as the child", () => {
    const args = buildStackArgs(false);
    expect(args).toContain("--export-on-exit=./emulator-data");
    expect(args).toContain("--ui");
    // the child command is always the last arg
    expect(args[args.length - 1]).toBe("npm run dev");
    // scoped to the demo project, never a real one
    expect(args).toContain("demo-crypto-idea");
  });

  it("adds --import ONLY when a saved snapshot exists (missing dir hard-fails firebase)", () => {
    expect(buildStackArgs(true)).toContain("--import=./emulator-data");
    expect(buildStackArgs(false)).not.toContain("--import=./emulator-data");
  });

  it("with a snapshot, imports and exports the SAME folder (round-trips changes)", () => {
    const args = buildStackArgs(true);
    expect(args).toContain("--import=./emulator-data");
    expect(args).toContain("--export-on-exit=./emulator-data");
  });
});
