import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import ReportIllness from "./pages/ReportIllness";
import MyVisits from "./pages/MyVisits";
import PatientQueue from "./pages/PatientQueue";
import Consultations from "./pages/Consultations";
import Appointments from "./pages/Appointments";
import Inventory from "./pages/Inventory";
import PatientRecords from "./pages/PatientRecords";
import ManageUsers from "./pages/ManageUsers";
import Reports from "./pages/Reports";
import LabResults from "./pages/LabResults";
import ResetPassword from "./pages/ResetPassword";
import ProfileSettings from "./pages/ProfileSettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, role, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (allowedRoles && role && !allowedRoles.includes(role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/report-illness" element={<ProtectedRoute allowedRoles={['student']}><ReportIllness /></ProtectedRoute>} />
            <Route path="/my-visits" element={<ProtectedRoute allowedRoles={['student']}><MyVisits /></ProtectedRoute>} />
            <Route path="/patient-queue" element={<ProtectedRoute allowedRoles={['staff', 'admin']}><PatientQueue /></ProtectedRoute>} />
            <Route path="/consultations" element={<ProtectedRoute allowedRoles={['staff', 'admin']}><Consultations /></ProtectedRoute>} />
            <Route path="/appointments" element={<ProtectedRoute><Appointments /></ProtectedRoute>} />
            <Route path="/inventory" element={<ProtectedRoute allowedRoles={['staff', 'admin']}><Inventory /></ProtectedRoute>} />
            <Route path="/patient-records" element={<ProtectedRoute allowedRoles={['staff', 'admin']}><PatientRecords /></ProtectedRoute>} />
            <Route path="/lab-results" element={<ProtectedRoute><LabResults /></ProtectedRoute>} />
            <Route path="/manage-users" element={<ProtectedRoute allowedRoles={['admin']}><ManageUsers /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute allowedRoles={['admin']}><Reports /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
