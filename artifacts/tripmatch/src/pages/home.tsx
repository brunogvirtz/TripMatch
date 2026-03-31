import { useEffect } from "react";
import { useLocation } from "wouter";
import { useSession } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout";
import { ArrowRight } from "lucide-react";

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
      <div className="flex justify-center mb-10">
        <img src="/logo.svg" alt="TripMatch" className="h-28 w-auto drop-shadow-xl" />
      </div>
      <h1 className="text-6xl font-black tracking-tight text-foreground mb-5">
        Trip<span className="text-secondary">Match</span>
      </h1>
      <p className="text-xl text-muted-foreground mb-12 max-w-sm mx-auto leading-relaxed">
        Basta de discutir en el grupo. Deslizá destinos juntos y encontrá el viaje perfecto.
      </p>

      <div className="space-y-4 max-w-sm mx-auto w-full">
        <Button
          size="lg"
          className="w-full text-lg h-14 rounded-2xl shadow-xl shadow-primary/20 transition-transform active:scale-95"
          onClick={() => setLocation("/onboarding")}
        >
          Empezá ahora
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </Layout>
  );
}
