import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Home from "@/pages/home";
import Onboarding from "@/pages/onboarding";
import Dashboard from "@/pages/dashboard";
import NewGroup from "@/pages/groups/new";
import JoinGroup from "@/pages/groups/join";
import GroupHub from "@/pages/groups/hub";
import Preferences from "@/pages/groups/preferences";
import Swipe from "@/pages/groups/swipe";
import Results from "@/pages/groups/results";
import Plan from "@/pages/groups/plan";

import { useSession } from "@/hooks/use-session";
import { setExtraHeaders, clearExtraHeaders } from "@workspace/api-client-react";

const queryClient = new QueryClient();

function SessionHeaderSync() {
  const { session, isLoaded } = useSession();

  useEffect(() => {
    if (!isLoaded) return;
    if (session?.id) {
      setExtraHeaders({ "x-user-id": String(session.id) });
    } else {
      clearExtraHeaders();
    }
  }, [session, isLoaded]);

  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/groups/new" component={NewGroup} />
      <Route path="/groups/join" component={JoinGroup} />
      <Route path="/groups/:id" component={GroupHub} />
      <Route path="/groups/:id/preferences" component={Preferences} />
      <Route path="/groups/:id/swipe" component={Swipe} />
      <Route path="/groups/:id/results" component={Results} />
      <Route path="/groups/:id/plan" component={Plan} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <SessionHeaderSync />
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
