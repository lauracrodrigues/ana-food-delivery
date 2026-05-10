import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import Billing from "./Billing";

vi.mock("@/hooks/useCompanyId", () => ({
  useCompanyId: () => ({ companyId: "test-company-id", isLoadingCompany: false }),
}));

vi.mock("@/components/ui/sidebar", () => ({
  SidebarTrigger: ({ children }: any) => <button>{children}</button>,
}));

const mockPlans = [
  {
    id: "plan-1",
    name: "Básico",
    description: "Ideal para pequenos negócios",
    price: 29.9,
    features: ["100 pedidos/mês", "Suporte email"],
    max_orders_per_month: 100,
    stripe_price_id: "price_test",
  },
  {
    id: "plan-2",
    name: "Profissional",
    description: "Para negócios em crescimento",
    price: 79.9,
    features: ["500 pedidos/mês", "Suporte prioritário"],
    max_orders_per_month: 500,
    stripe_price_id: "price_test2",
  },
];

const mockStatus = {
  subscription_status: "trial",
  plan: { name: "Básico", price: 29.9, max_orders: 100 },
  quota: { used: 45, limit: 100, percentual: 45, nearLimit: false },
  trial_ends_at: new Date(Date.now() + 7 * 86400000).toISOString(),
  grace_ends_at: null,
};

function renderBilling() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Billing />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  global.fetch = vi.fn((url: string) => {
    if (url.includes("/billing/plans")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockPlans) });
    }
    if (url.includes("/billing/status/")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockStatus) });
    }
    return Promise.resolve({ ok: false });
  }) as any;
});

describe("Billing Page", () => {
  it("renders page title", async () => {
    renderBilling();
    expect(screen.getByText("Assinatura")).toBeInTheDocument();
  });

  it("shows plans from API", async () => {
    renderBilling();
    await waitFor(() => {
      expect(screen.getAllByText("Básico").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Profissional").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows quota usage", async () => {
    renderBilling();
    await waitFor(() => {
      expect(screen.getByText(/45/)).toBeInTheDocument();
    });
  });

  it("marks current plan", async () => {
    renderBilling();
    await waitFor(() => {
      expect(screen.getAllByText(/Plano Atual|Atual/).length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows trial days remaining", async () => {
    renderBilling();
    await waitFor(() => {
      expect(screen.getByText(/dias restantes no trial/)).toBeInTheDocument();
    });
  });
});
