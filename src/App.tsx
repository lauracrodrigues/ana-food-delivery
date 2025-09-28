import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Registration from "./pages/Registration";
import AdminDashboard from "./pages/AdminDashboard";
import StoreDashboard from "./pages/StoreDashboard";
import Orders from "./pages/Orders";
import { Customers } from "./pages/Customers";
import { Products } from "./pages/Products";
import { Categories } from "./pages/Categories";
import { Extras } from "./pages/Extras";
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="anafood-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/cadastro" element={<Registration />} />
            <Route path="/admin" element={<DashboardLayout><AdminDashboard /></DashboardLayout>} />
            <Route path="/dashboard" element={<DashboardLayout><StoreDashboard /></DashboardLayout>} />
            <Route path="/orders" element={<DashboardLayout><Orders /></DashboardLayout>} />
            <Route path="/customers" element={<DashboardLayout><Customers /></DashboardLayout>} />
            <Route path="/products" element={<DashboardLayout><Products /></DashboardLayout>} />
            <Route path="/categories" element={<DashboardLayout><Categories /></DashboardLayout>} />
            <Route path="/extras" element={<DashboardLayout><Extras /></DashboardLayout>} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
