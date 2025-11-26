import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import Leads from "./pages/Leads";
import Contacts from "./pages/Contacts";
import Pipeline from "./pages/Pipeline";
import Reports from "./pages/Reports";
import WhatsApp from "./pages/WhatsApp";
import ComingSoon from "./pages/ComingSoon";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="flex min-h-screen bg-background">
          <Sidebar />
          <div className="flex-1 flex flex-col">
            <Header />
            <main className="flex-1 overflow-auto">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/leads" element={<Leads />} />
                <Route path="/contacts" element={<Contacts />} />
                <Route path="/pipeline" element={<Pipeline />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/whatsapp" element={<WhatsApp />} />
                <Route path="/reports" element={<Reports />} />
                <Route
                  path="/calendar"
                  element={<ComingSoon title="Calendar" description="Calendar view coming soon!" />}
                />
                <Route
                  path="/settings"
                  element={<ComingSoon title="Settings" description="Settings coming soon!" />}
                />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
          </div>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
