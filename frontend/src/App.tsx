import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import MaintenanceOverlay from "@/components/MaintenanceOverlay";
import Landing from "./pages/Landing";
import AuthPage from "./pages/AuthPage";
import AnalyzeForm from "./pages/AnalyzeForm";
import Results from "./pages/Results";
import AdminDashboard from "./pages/AdminDashboard";
import VerificationPage from "./pages/VerificationPage";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,       // 2 min default stale time
      gcTime: 10 * 60 * 1000,          // 10 min garbage collect
      retry: 1,                         // only 1 retry on failure
      refetchOnWindowFocus: false,      // no surprise re-fetches on tab switch
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <MaintenanceOverlay>
            <Routes>
              {/* Public */}
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<AuthPage />} />

              {/* Protected — requires login */}
              <Route path="/analyze" element={<ProtectedRoute><AnalyzeForm /></ProtectedRoute>} />
              <Route path="/results" element={<ProtectedRoute><Results /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

              {/* Admin only */}
              <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/verifications" element={<ProtectedRoute requireAdmin><VerificationPage /></ProtectedRoute>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </MaintenanceOverlay>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
