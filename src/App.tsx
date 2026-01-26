import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SocketProvider } from "@/contexts/SocketContext";
import { WhatsAppNotificationProvider } from "@/contexts/WhatsAppNotificationContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { FloatingChatWidget } from "@/components/chat/FloatingChatWidget";
import { ProtectedAIRoute } from "@/components/ProtectedAIRoute";
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
import GmailCallback from "./pages/GmailCallback";
import AIAssistant from "./pages/AIAssistant";
import Settings from "./pages/Settings";
import UserManagement from "./pages/UserManagement";
import ComingSoon from "./pages/ComingSoon";
import NotFound from "./pages/NotFound";
import Forms from "./pages/Forms";
import PromoLanding from "./pages/PromoLanding";
import PublicForm from "./pages/PublicForm";
import Calls from "./pages/Calls";
import Campaigns from "./pages/Campaigns";
import UtmManager from "./pages/UtmManager";
import ProductPage from "./pages/ProductPage";
import FeaturesPage from "./pages/FeaturesPage";
import PricingPage from "./pages/PricingPage";
import APIPage from "./pages/APIPage";
import AboutPage from "./pages/AboutPage";
import BlogPage from "./pages/BlogPage";
import BlogDetailPage from "./pages/BlogDetailPage";
import CareersPage from "./pages/CareersPage";
import HelpCenterPage from "./pages/HelpCenterPage";
import ContactPage from "./pages/ContactPage";
import StatusPage from "./pages/StatusPage";
import SubscriptionDebugPage from "./pages/SubscriptionDebugPage";

const queryClient = new QueryClient();

// Protected layout wrapper
const ProtectedLayout = ({ children }: { children: React.ReactNode }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <ProtectedRoute>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
        <div className="flex-1 flex flex-col min-w-0">
          <Header onMenuClick={() => setMobileMenuOpen(true)} />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
};

// Chat widget wrapper - only shows for non-logged-in users
const ChatWidgetWrapper = () => {
  const { user } = useAuth();

  // Only show chat widget if user is NOT logged in
  if (user) {
    return null;
  }

  return <FloatingChatWidget />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <SocketProvider>
            <WhatsAppNotificationProvider>
              <ChatWidgetWrapper />
              <Routes>
              {/* Public routes */}
              <Route path="/" element={<PromoLanding />} />
              <Route path="/product" element={<ProductPage />} />
              <Route path="/features" element={<FeaturesPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/api" element={<APIPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/blog/:slug" element={<BlogDetailPage />} />
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/careers" element={<CareersPage />} />
              <Route path="/help" element={<HelpCenterPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/status" element={<StatusPage />} />
              <Route path="/f/:slug" element={<PublicForm />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/auth/google/callback" element={<AuthCallback />} />

              {/* Protected routes */}
              <Route path="/dashboard" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
              <Route path="/leads" element={<ProtectedLayout><Leads /></ProtectedLayout>} />
              <Route path="/contacts" element={<ProtectedLayout><Contacts /></ProtectedLayout>} />
              <Route path="/pipeline" element={<ProtectedLayout><Pipeline /></ProtectedLayout>} />
              <Route path="/tasks" element={<ProtectedLayout><Tasks /></ProtectedLayout>} />
              <Route path="/campaigns" element={<ProtectedLayout><Campaigns /></ProtectedLayout>} />
              <Route path="/utm" element={<ProtectedLayout><UtmManager /></ProtectedLayout>} />
              <Route path="/whatsapp" element={<ProtectedLayout><WhatsApp /></ProtectedLayout>} />
              <Route path="/emails" element={<ProtectedLayout><Emails /></ProtectedLayout>} />
              <Route path="/calls" element={<ProtectedLayout><ProtectedAIRoute><Calls /></ProtectedAIRoute></ProtectedLayout>} />
              <Route path="/invoices" element={<ProtectedLayout><Invoices /></ProtectedLayout>} />
              <Route path="/reports" element={<ProtectedLayout><Reports /></ProtectedLayout>} />
              <Route path="/forecast" element={<ProtectedLayout><SalesForecast /></ProtectedLayout>} />
              <Route path="/calendar" element={<ProtectedLayout><Calendar /></ProtectedLayout>} />
              <Route path="/calendar/callback" element={<ProtectedRoute><CalendarCallback /></ProtectedRoute>} />
              <Route path="/integrations/gmail/callback" element={<ProtectedRoute><GmailCallback /></ProtectedRoute>} />
              <Route path="/ai-assistant" element={<ProtectedLayout><ProtectedAIRoute><AIAssistant /></ProtectedAIRoute></ProtectedLayout>} />
              <Route
                path="/settings"
                element={<ProtectedLayout><Settings /></ProtectedLayout>}
              />
              <Route
                path="/users"
                element={<ProtectedLayout><UserManagement /></ProtectedLayout>}
              />
              <Route
                path="/forms"
                element={<ProtectedLayout><Forms /></ProtectedLayout>}
              />
              <Route
                path="/debug/subscription"
                element={<ProtectedLayout><SubscriptionDebugPage /></ProtectedLayout>}
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
