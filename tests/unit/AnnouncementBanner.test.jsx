import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import AnnouncementBanner from "../../src/components/AnnouncementBanner.jsx";

// ADMIN-5 — the site announcement banner (logged-in app).
describe("AnnouncementBanner", () => {
  beforeEach(() => { cleanup(); localStorage.clear(); });

  it("renders nothing when there is no announcement", () => {
    const { container } = render(<AnnouncementBanner announcement={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows the message with the level's class", async () => {
    render(<AnnouncementBanner announcement={{ text: "Down for maintenance", level: "warning" }} />);
    const el = await screen.findByText("Down for maintenance");
    expect(el.closest(".ann-banner")).toHaveClass("lvl-warning");
  });

  it("dismiss hides it and remembers the dismissal for the SAME message", async () => {
    const a = { text: "Notice A", level: "info" };
    const { unmount } = render(<AnnouncementBanner announcement={a} />);
    await screen.findByText("Notice A");
    fireEvent.click(screen.getByLabelText("Dismiss announcement"));
    await waitFor(() => expect(screen.queryByText("Notice A")).toBeNull());
    unmount();
    // Re-mounting with the same text stays dismissed.
    render(<AnnouncementBanner announcement={a} />);
    expect(screen.queryByText("Notice A")).toBeNull();
  });

  it("a CHANGED message reappears even after the old one was dismissed", async () => {
    const { unmount } = render(<AnnouncementBanner announcement={{ text: "Old", level: "info" }} />);
    await screen.findByText("Old");
    fireEvent.click(screen.getByLabelText("Dismiss announcement"));
    unmount();
    render(<AnnouncementBanner announcement={{ text: "New wording", level: "critical" }} />);
    expect(await screen.findByText("New wording")).toBeInTheDocument();
  });
});
