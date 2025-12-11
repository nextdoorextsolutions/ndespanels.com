import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { OwnerRoute } from "./components/OwnerRoute";

// Auth pages
import Login from "./pages/auth/Login";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";

// CRM pages
import CRMDashboard from "./pages/crm/Dashboard";
import CRMLeads from "./pages/crm/Leads";
import CRMPipeline from "./pages/crm/Pipeline";
import CRMTeam from "./pages/crm/Team";
import CRMCalendar from "./pages/crm/Calendar";
import CRMReports from "./pages/crm/Reports";
import JobDetail from "./pages/crm/JobDetail";
import Finance from "./pages/finance/Finance";

// Settings pages
import ProfileSettings from "./pages/settings/ProfileSettings";
import GeneralSettings from "./pages/settings/GeneralSettings";

// Public pages
import CustomerPortal from "./pages/CustomerPortal";
import FieldUpload from "./pages/FieldUpload";

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
      <Route path={"/portal"} component={CustomerPortal} />
      <Route path={"/upload"} component={FieldUpload} />
      
      {/* CRM routes - protected with Supabase Auth */}
      <Route path={"/crm"}>
        <ProtectedRoute>
          <ErrorBoundary>
            <CRMDashboard />
          </ErrorBoundary>
        </ProtectedRoute>
      </Route>
      <Route path={"/crm/leads"}>
        <ProtectedRoute>
          <ErrorBoundary>
            <CRMLeads />
          </ErrorBoundary>
        </ProtectedRoute>
      </Route>
      <Route path={"/crm/pipeline"}>
        <ProtectedRoute>
          <ErrorBoundary>
            <CRMPipeline />
          </ErrorBoundary>
        </ProtectedRoute>
      </Route>
      <Route path={"/crm/team"}>
        <ProtectedRoute>
          <ErrorBoundary>
            <CRMTeam />
          </ErrorBoundary>
        </ProtectedRoute>
      </Route>
      <Route path={"/crm/calendar"}>
        <ProtectedRoute>
          <ErrorBoundary>
            <CRMCalendar />
          </ErrorBoundary>
        </ProtectedRoute>
      </Route>
      <Route path={"/crm/reports"}>
        <ProtectedRoute>
          <ErrorBoundary>
            <CRMReports />
          </ErrorBoundary>
        </ProtectedRoute>
      </Route>
      <Route path={"/crm/job/:id"}>
        <ProtectedRoute>
          <ErrorBoundary>
            <JobDetail />
          </ErrorBoundary>
        </ProtectedRoute>
      </Route>
      <Route path={"/finance"}>
        <OwnerRoute>
          <ErrorBoundary>
            <Finance />
          </ErrorBoundary>
        </OwnerRoute>
      </Route>
      
      {/* Settings routes - protected */}
      <Route path={"/settings/profile"}>
        <ProtectedRoute>
          <ProfileSettings />
        </ProtectedRoute>
      </Route>
      <Route path={"/settings"}>
        <ProtectedRoute>
          <GeneralSettings />
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
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
