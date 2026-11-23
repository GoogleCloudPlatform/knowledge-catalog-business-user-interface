import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import OverflowTag from "./OverflowTag";

// jsdom reports scrollWidth/clientWidth as 0 by default, so truncation never
// naturally occurs - these helpers simulate it by overriding both on the
// Tag's own inner span (what OverflowTag measures via querySelector).
const makeTruncated = (container: HTMLElement) => {
  const inner = container.querySelector("span.capitalizeTag") as HTMLElement;
  Object.defineProperty(inner, "scrollWidth", { value: 200, configurable: true });
  Object.defineProperty(inner, "clientWidth", { value: 100, configurable: true });
};

const makeNotTruncated = (container: HTMLElement) => {
  const inner = container.querySelector("span.capitalizeTag") as HTMLElement;
  Object.defineProperty(inner, "scrollWidth", { value: 100, configurable: true });
  Object.defineProperty(inner, "clientWidth", { value: 100, configurable: true });
};

describe("OverflowTag", () => {
  it("renders the text via Tag", () => {
    render(<OverflowTag text="HIGH" />);
    expect(screen.getByText("HIGH")).toBeInTheDocument();
  });

  it("applies custom css to the underlying Tag", () => {
    render(<OverflowTag text="HIGH" css={{ color: "rgb(1, 2, 3)" }} />);
    expect(screen.getByText("HIGH")).toHaveStyle({ color: "rgb(1, 2, 3)" });
  });

  it("forwards className to the underlying Tag", () => {
    render(<OverflowTag text="HIGH" className="asset-tag" />);
    expect(screen.getByText("HIGH")).toHaveClass("asset-tag");
  });

  it("does not show a tooltip title when the text is not truncated", () => {
    const { container } = render(<OverflowTag text="HIGH" />);
    makeNotTruncated(container);
    const wrapper = container.querySelector("span[style*='overflow']") as HTMLElement;
    fireEvent.mouseEnter(wrapper);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("shows a tooltip with the full text once truncation is detected on hover", async () => {
    const { container } = render(<OverflowTag text="A very long aspect value that gets truncated" />);
    makeTruncated(container);
    const wrapper = container.querySelector("span[style*='overflow']") as HTMLElement;
    fireEvent.mouseEnter(wrapper);
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "A very long aspect value that gets truncated"
    );
  });

  it("hides the tooltip again on mouse leave", async () => {
    const { container } = render(<OverflowTag text="A very long aspect value that gets truncated" />);
    makeTruncated(container);
    const wrapper = container.querySelector("span[style*='overflow']") as HTMLElement;
    fireEvent.mouseEnter(wrapper);
    expect(await screen.findByRole("tooltip")).toBeInTheDocument();

    fireEvent.mouseLeave(wrapper);
    // MUI fades the tooltip out rather than removing it instantly.
    await waitFor(() => expect(screen.queryByRole("tooltip")).not.toBeInTheDocument());
  });
});
