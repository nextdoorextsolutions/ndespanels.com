import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import ThankYou from "./pages/ThankYou";
import CRMDashboard from "./pages/crm/Dashboard";
import CRMLeads from "./pages/crm/Leads";
import CRMPipeline from "./pages/crm/Pipeline";
import CRMTeam from "./pages/crm/Team";
import CRMLogin from "./pages/crm/Login";
import CRMCalendar from "./pages/crm/Calendar";
import CRMReports from "./pages/crm/Reports";
import JobDetail from "./pages/crm/JobDetail";
import { trpc } from "./lib/trpc";

// Protected route wrapper for CRM
function ProtectedCRMRoute({ component: Component }: { component: React.ComponentType }) {
  const { data: user, isLoading } = trpc.auth.me.useQuery();
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  
  if (!user) {
    return <CRMLogin />;
  }
  
  return <Component />;
}

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path={"/"} component={Home} />
      <Route path={"/thank-you"} component={ThankYou} />
      
      {/* CRM routes - protected */}
      <Route path={"/crm"}>
        <ProtectedCRMRoute component={CRMDashboard} />
      </Route>
      <Route path={"/crm/leads"}>
        <ProtectedCRMRoute component={CRMLeads} />
      </Route>
      <Route path={"/crm/pipeline"}>
        <ProtectedCRMRoute component={CRMPipeline} />
      </Route>
      <Route path={"/crm/team"}>
        <ProtectedCRMRoute component={CRMTeam} />
      </Route>
      <Route path={"/crm/calendar"}>
        <ProtectedCRMRoute component={CRMCalendar} />
      </Route>
      <Route path={"/crm/reports"}>
        <ProtectedCRMRoute component={CRMReports} />
      </Route>
      <Route path={"/crm/job/:id"}>
        <ProtectedCRMRoute component={JobDetail} />
      </Route>
      <Route path={"/crm/login"} component={CRMLogin} />
      
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
