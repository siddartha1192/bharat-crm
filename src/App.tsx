import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SocketProvider } from "@/contexts/SocketContext";
import { WhatsAppNotificationProvider } from "@/contexts/WhatsAppNotificationContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AuthCallback from "./pages/AuthCallback";
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import Leads from "./pages/Leads";
import Contacts from "./pages/Contacts";
import Pipeline from "./pages/Pipeline";
import Reports from "./pages/Reports";
import SalesForecast from "./pages/SalesForecast";
import WhatsApp from "./pages/WhatsApp";
import Emails from "./pages/Emails";
import Invoices from "./pages/Invoices";
import Calendar from "./pages/Calendar";
import CalendarCallback from "./pages/CalendarCallback";
import AIAssistant from "./pages/AIAssistant";
import Settings from "./pages/Settings";
import UserManagement from "./pages/UserManagement";
import ComingSoon from "./pages/ComingSoon";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Protected layout wrapper
const ProtectedLayout = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  </ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <SocketProvider>
            <WhatsAppNotificationProvider>
              <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/auth/google/callback" element={<AuthCallback />} />

              {/* Protected routes */}
              <Route path="/" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
              <Route path="/dashboard" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
              <Route path="/leads" element={<ProtectedLayout><Leads /></ProtectedLayout>} />
              <Route path="/contacts" element={<ProtectedLayout><Contacts /></ProtectedLayout>} />
              <Route path="/pipeline" element={<ProtectedLayout><Pipeline /></ProtectedLayout>} />
              <Route path="/tasks" element={<ProtectedLayout><Tasks /></ProtectedLayout>} />
              <Route path="/whatsapp" element={<ProtectedLayout><WhatsApp /></ProtectedLayout>} />
              <Route path="/emails" element={<ProtectedLayout><Emails /></ProtectedLayout>} />
              <Route path="/invoices" element={<ProtectedLayout><Invoices /></ProtectedLayout>} />
              <Route path="/reports" element={<ProtectedLayout><Reports /></ProtectedLayout>} />
              <Route path="/forecast" element={<ProtectedLayout><SalesForecast /></ProtectedLayout>} />
              <Route path="/calendar" element={<ProtectedLayout><Calendar /></ProtectedLayout>} />
              <Route path="/calendar/callback" element={<ProtectedRoute><CalendarCallback /></ProtectedRoute>} />
              <Route path="/ai-assistant" element={<ProtectedLayout><AIAssistant /></ProtectedLayout>} />
              <Route
                path="/settings"
                element={<ProtectedLayout><Settings /></ProtectedLayout>}
              />
              <Route
                path="/users"
                element={<ProtectedLayout><UserManagement /></ProtectedLayout>}
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
              </Routes>
            </WhatsAppNotificationProvider>
          </SocketProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
