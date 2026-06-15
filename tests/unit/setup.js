// Vitest setup: adds @testing-library/jest-dom matchers (toBeInTheDocument, etc.)
// and clears mock/cleanup state between tests.
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
