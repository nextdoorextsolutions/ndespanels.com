import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/shared/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ProtectedRoute } from "./components/shared/ProtectedRoute";
import { OwnerRoute } from "./components/shared/OwnerRoute";
import { GlobalChatWidget } from "./components/GlobalChatWidget";
import { GlobalErrorWatcher } from "./components/GlobalErrorWatcher";

// Auth pages (keep eager loaded - small and critical)
import Login from "./pages/auth/Login";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";

// CRM pages - lazy loaded for code splitting
const CRMDashboard = lazy(() => import("./pages/crm/Dashboard"));
const CRMLeads = lazy(() => import("./pages/crm/Leads"));
const CRMPipeline = lazy(() => import("./pages/crm/Pipeline"));
const CRMTeam = lazy(() => import("./pages/crm/Team"));
const CRMCalendar = lazy(() => import("./pages/crm/Calendar"));
const CRMReports = lazy(() => import("./pages/crm/Reports"));
const JobDetail = lazy(() => import("./pages/crm/JobDetail"));

// Finance pages - lazy loaded
const Finance = lazy(() => import("./pages/finance/Finance"));
const Invoices = lazy(() => import("./pages/finance/Invoices"));
const Jobs = lazy(() => import("./pages/finance/Jobs"));
const Clients = lazy(() => import("./pages/finance/Clients"));

// Settings pages - lazy loaded
const ProfileSettings = lazy(() => import("./pages/settings/ProfileSettings"));
const GeneralSettings = lazy(() => import("./pages/settings/GeneralSettings"));

// Admin pages - lazy loaded
const ErrorLogsPage = lazy(() => import("./pages/admin/ErrorLogsPage"));
const PerformanceDashboard = lazy(() => import("./pages/admin/PerformanceDashboard"));
const BonusApprovals = lazy(() => import("./pages/admin/BonusApprovals"));

// CRM pages - Commissions - lazy loaded
const CommissionsPage = lazy(() => import("./pages/crm/CommissionsPage"));

// Public pages - lazy loaded
const CustomerPortal = lazy(() => import("./pages/CustomerPortal"));
const FieldUpload = lazy(() => import("./pages/FieldUpload"));

// Loading spinner component
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin w-12 h-12 border-4 border-[#00d4aa] border-t-transparent rounded-full" />
        <p className="text-slate-400 animate-pulse text-sm">Loading...</p>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      {/* Auth routes - public */}
      <Route path={"/"}>
        <Redirect to="/login" />
      </Route>
      <Route path={"/login"} component={Login} />
      <Route path={"/forgot-password"} component={ForgotPassword} />
      <Route path={"/reset-password"} component={ResetPassword} />
      
      {/* Public utility routes */}
      <Route path="/portal">
        <Suspense fallback={<LoadingSpinner />}>
          <CustomerPortal />
        </Suspense>
      </Route>
      <Route path="/upload">
        <Suspense fallback={<LoadingSpinner />}>
          <FieldUpload />
        </Suspense>
      </Route>
      
      {/* CRM routes - protected with Supabase Auth */}
      <Route path="/crm">
        <ProtectedRoute>
          <ErrorBoundary>
            <Suspense fallback={<LoadingSpinner />}>
              <CRMDashboard />
            </Suspense>
          </ErrorBoundary>
        </ProtectedRoute>
      </Route>
      <Route path="/crm/leads">
        <ProtectedRoute>
          <ErrorBoundary>
            <Suspense fallback={<LoadingSpinner />}>
              <CRMLeads />
            </Suspense>
          </ErrorBoundary>
        </ProtectedRoute>
      </Route>
      <Route path="/crm/pipeline">
        <ProtectedRoute>
          <ErrorBoundary>
            <Suspense fallback={<LoadingSpinner />}>
              <CRMPipeline />
            </Suspense>
          </ErrorBoundary>
        </ProtectedRoute>
      </Route>
      <Route path="/crm/team">
        <ProtectedRoute>
          <ErrorBoundary>
            <Suspense fallback={<LoadingSpinner />}>
              <CRMTeam />
            </Suspense>
          </ErrorBoundary>
        </ProtectedRoute>
      </Route>
      <Route path="/crm/calendar">
        <ProtectedRoute>
          <ErrorBoundary>
            <Suspense fallback={<LoadingSpinner />}>
              <CRMCalendar />
            </Suspense>
          </ErrorBoundary>
        </ProtectedRoute>
      </Route>
      <Route path="/crm/reports">
        <ProtectedRoute>
          <ErrorBoundary>
            <Suspense fallback={<LoadingSpinner />}>
              <CRMReports />
            </Suspense>
          </ErrorBoundary>
        </ProtectedRoute>
      </Route>
      <Route path="/crm/job/:id">
        <ProtectedRoute>
          <ErrorBoundary>
            <Suspense fallback={<LoadingSpinner />}>
              <JobDetail />
            </Suspense>
          </ErrorBoundary>
        </ProtectedRoute>
      </Route>
      <Route path="/finance">
        <OwnerRoute>
          <ErrorBoundary>
            <Suspense fallback={<LoadingSpinner />}>
              <Finance />
            </Suspense>
          </ErrorBoundary>
        </OwnerRoute>
      </Route>
      <Route path="/invoices">
        <OwnerRoute>
          <ErrorBoundary>
            <Suspense fallback={<LoadingSpinner />}>
              <Invoices />
            </Suspense>
          </ErrorBoundary>
        </OwnerRoute>
      </Route>
      <Route path="/jobs">
        <OwnerRoute>
          <ErrorBoundary>
            <Suspense fallback={<LoadingSpinner />}>
              <Jobs />
            </Suspense>
          </ErrorBoundary>
        </OwnerRoute>
      </Route>
      <Route path="/clients">
        <OwnerRoute>
          <ErrorBoundary>
            <Suspense fallback={<LoadingSpinner />}>
              <Clients />
            </Suspense>
          </ErrorBoundary>
        </OwnerRoute>
      </Route>
      
      {/* Admin routes - owner/admin only */}
      <Route path="/admin/dashboard">
        <OwnerRoute>
          <ErrorBoundary>
            <Suspense fallback={<LoadingSpinner />}>
              <PerformanceDashboard />
            </Suspense>
          </ErrorBoundary>
        </OwnerRoute>
      </Route>
      <Route path="/admin/bonus-approvals">
        <OwnerRoute>
          <ErrorBoundary>
            <Suspense fallback={<LoadingSpinner />}>
              <BonusApprovals />
            </Suspense>
          </ErrorBoundary>
        </OwnerRoute>
      </Route>
      <Route path="/admin/error-logs">
        <OwnerRoute>
          <ErrorBoundary>
            <Suspense fallback={<LoadingSpinner />}>
              <ErrorLogsPage />
            </Suspense>
          </ErrorBoundary>
        </OwnerRoute>
      </Route>
      
      {/* Commissions route - protected for all authenticated users */}
      <Route path="/commissions">
        <ProtectedRoute>
          <ErrorBoundary>
            <Suspense fallback={<LoadingSpinner />}>
              <CommissionsPage />
            </Suspense>
          </ErrorBoundary>
        </ProtectedRoute>
      </Route>
      
      {/* Settings routes - protected */}
      <Route path="/settings/profile">
        <ProtectedRoute>
          <Suspense fallback={<LoadingSpinner />}>
            <ProfileSettings />
          </Suspense>
        </ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute>
          <Suspense fallback={<LoadingSpinner />}>
            <GeneralSettings />
          </Suspense>
        </ProtectedRoute>
      </Route>
      
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable={true}>
        <TooltipProvider>
          <Toaster />
          <Router />
          <GlobalChatWidget />
          <GlobalErrorWatcher />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
