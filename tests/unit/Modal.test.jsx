import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Modal } from "../../src/components/Modal.jsx";

describe("Modal (R15 / R19-6)", () => {
  it("tags the scrim with its size so mobile CSS can differ (R19-6)", () => {
    // size drives the @media rule: sm stays a centered card on phones, md goes full-screen.
    const { container, rerender } = render(<Modal size="sm" title="T" onClose={() => {}}>x</Modal>);
    expect(container.querySelector(".cm-scrim.cm-scrim-sm")).toBeTruthy();
    expect(container.querySelector(".cm-card.cm-sm")).toBeTruthy();
    rerender(<Modal size="md" title="T" onClose={() => {}}>x</Modal>);
    expect(container.querySelector(".cm-scrim.cm-scrim-md")).toBeTruthy();
    expect(container.querySelector(".cm-card.cm-md")).toBeTruthy();
  });

  it("X closes; the scrim closes only when dismissOnScrim is on", () => {
    const onClose = vi.fn();
    const { container, rerender } = render(<Modal title="T" onClose={onClose}>x</Modal>);
    fireEvent.click(screen.getByLabelText("Close"));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(container.querySelector(".cm-scrim")); // scrim tap closes by default
    expect(onClose).toHaveBeenCalledTimes(2);
    onClose.mockClear();
    rerender(<Modal title="T" onClose={onClose} dismissOnScrim={false}>x</Modal>);
    fireEvent.click(container.querySelector(".cm-scrim")); // now inert
    expect(onClose).not.toHaveBeenCalled();
  });
});
