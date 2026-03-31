import { useEffect } from "react";
import { useLocation } from "wouter";
import { useSession } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout";
import { ArrowRight, PlaneTakeoff } from "lucide-react";

export default function Home() {
  const { session, isLoaded } = useSession();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoaded && session) {
      setLocation("/dashboard");
    }
  }, [session, isLoaded, setLocation]);

  if (!isLoaded || session) return null;

  return (
    <Layout showNav={false} className="justify-center text-center pb-20 mt-12">
      <div className="flex justify-center mb-8">
        <div className="bg-primary text-primary-foreground p-5 rounded-3xl rotate-12 shadow-2xl shadow-primary/30">
          <PlaneTakeoff size={56} className="stroke-[2.5]" />
        </div>
      </div>
      <h1 className="text-6xl font-black tracking-tight text-foreground mb-5">
        Trip<span className="text-primary">Match</span>
      </h1>
      <p className="text-xl text-muted-foreground mb-12 max-w-sm mx-auto leading-relaxed">
        Stop arguing in the group chat. Swipe on destinations together and find the perfect trip.
      </p>
      
      <div className="space-y-4 max-w-sm mx-auto w-full">
        <Button size="lg" className="w-full text-lg h-14 rounded-2xl shadow-xl shadow-primary/20 transition-transform active:scale-95" onClick={() => setLocation("/onboarding")}>
          Get Started
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </Layout>
  );
}
