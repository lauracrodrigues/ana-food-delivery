import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary } from "./ErrorBoundary";

vi.mock("@/lib/sentry", () => ({
  Sentry: { captureException: vi.fn() },
}));

function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error("Test crash");
  return <div>OK</div>;
}

describe("ErrorBoundary", () => {
  it("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <div>Content</div>
      </ErrorBoundary>
    );
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("shows fallback on error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByText("Algo deu errado")).toBeInTheDocument();
    expect(screen.getByText("Test crash")).toBeInTheDocument();
    spy.mockRestore();
  });

  it("shows retry button on error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByText("Tentar novamente")).toBeInTheDocument();
    expect(screen.getByText("Recarregar página")).toBeInTheDocument();
    spy.mockRestore();
  });

  it("uses custom fallback", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary fallback={<div>Custom Error</div>}>
        <ThrowError shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByText("Custom Error")).toBeInTheDocument();
    spy.mockRestore();
  });
});
