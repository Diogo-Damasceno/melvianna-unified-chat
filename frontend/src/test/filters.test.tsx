import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Filters } from "../components/Filters";
import type { Platform } from "../types";

describe("Filters", () => {
  it("renderiza as três plataformas e respeita estado ativo", () => {
    const active: Record<Platform, boolean> = { twitch: true, youtube: false, kick: true };
    const onToggle = () => {};
    render(<Filters active={active} onToggle={onToggle} />);
    expect(screen.getByText("twitch")).toBeInTheDocument();
    expect(screen.getByText("youtube")).toBeInTheDocument();
    expect(screen.getByText("kick")).toBeInTheDocument();
    const yt = screen.getByText("youtube");
    expect(yt.closest(".filter-chip")).toHaveClass("off");
    const tw = screen.getByText("twitch");
    expect(tw.closest(".filter-chip")).toHaveClass("on");
  });
});
