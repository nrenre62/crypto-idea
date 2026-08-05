import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import EduDesign3 from "../../src/components/education-page.jsx";

// Regression guard for the bug where the education-page Subscribe button only
// flipped local state and silently dropped the email (never hit the backend).
describe("education-page subscribe", () => {
  beforeEach(() => { global.fetch = vi.fn(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it("POSTs the email (with honeypot) to /api/subscribe and shows success", async () => {
    global.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ success: true }) });
    render(<EduDesign3 />);
    fireEvent.change(screen.getByPlaceholderText("your@email.com"), { target: { value: "me@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Subscribe" }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/subscribe", expect.objectContaining({ method: "POST" })));
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.email).toBe("me@example.com");
    expect("hp" in body).toBe(true);   // honeypot included
    await waitFor(() => expect(screen.getByText("You're in ✓")).toBeInTheDocument());
  });

  it("shows an error and NOT success when the request fails", async () => {
    global.fetch.mockResolvedValue({ ok: false, json: () => Promise.resolve({ error: "x" }) });
    render(<EduDesign3 />);
    fireEvent.change(screen.getByPlaceholderText("your@email.com"), { target: { value: "me@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Subscribe" }));

    await waitFor(() => expect(screen.getByText(/Couldn't subscribe/i)).toBeInTheDocument());
    expect(screen.queryByText("You're in ✓")).not.toBeInTheDocument();
  });

  it("validates the email client-side before calling the API", () => {
    render(<EduDesign3 />);
    fireEvent.change(screen.getByPlaceholderText("your@email.com"), { target: { value: "notanemail" } });
    fireEvent.click(screen.getByRole("button", { name: "Subscribe" }));

    expect(global.fetch).not.toHaveBeenCalled();
    expect(screen.getByText(/Enter a valid email/i)).toBeInTheDocument();
  });
});

// AC4 — the /edge header logo must be the shared <Logo> lockup (green "C" tile +
// one-word "CryptoIdea"), clickable home. Today the header is a BARE text
// <a href="/">CryptoIdea</a> with NO .ci-logo, so a name-based link query would
// pass falsely; asserting the LOCKUP (.ci-logo-mark + .ci-logo-word) INSIDE the
// href="/" anchor is the genuine red. Mount fires no network (subscribe only
// runs on click), so rendering is clean without any fetch response staged.
describe("education-page /edge header brand lockup (AC4)", () => {
  beforeEach(() => { global.fetch = vi.fn(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it("renders the shared <Logo> lockup wrapped in a clickable <a href='/'>", () => {
    const { container } = render(<EduDesign3 />);
    const homeAnchors = [...container.querySelectorAll('a[href="/"]')];
    const lockup = homeAnchors.find((a) => a.querySelector(".ci-logo"));
    expect(lockup, "the /edge header logo must be a <Logo> lockup inside <a href='/'>").toBeTruthy();
    expect(lockup.querySelector(".ci-logo-mark")?.textContent).toBe("C");
    expect(lockup.querySelector(".ci-logo-word")?.textContent).toBe("CryptoIdea");
  });
});
