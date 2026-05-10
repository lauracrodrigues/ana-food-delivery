import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CheckoutSuccess from "./CheckoutSuccess";

describe("CheckoutSuccess", () => {
  it("shows success message with session_id", () => {
    render(
      <MemoryRouter initialEntries={["/checkout/success?session_id=cs_test_123"]}>
        <CheckoutSuccess />
      </MemoryRouter>
    );
    expect(screen.getByText("Pagamento Confirmado!")).toBeInTheDocument();
    expect(screen.getByText("Ver meu plano")).toBeInTheDocument();
    expect(screen.getByText("Ir para o Dashboard")).toBeInTheDocument();
  });
});
