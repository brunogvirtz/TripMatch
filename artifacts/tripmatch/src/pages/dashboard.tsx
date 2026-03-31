import { useEffect } from "react";
import { useLocation } from "wouter";
import { useSession } from "@/hooks/use-session";
import { useListGroups, useGetDashboard } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Layout } from "@/components/layout";
import { Plus, Users, MapPin, Loader2, Compass } from "lucide-react";

export default function Dashboard() {
  const { session, isLoaded } = useSession();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoaded && !session) setLocation("/");
  }, [session, isLoaded, setLocation]);

  const { data: dashboard, isLoading: loadingDash } = useGetDashboard({
    query: { enabled: !!session?.id },
  });

  const { data: groups, isLoading: loadingGroups } = useListGroups({
    query: { enabled: !!session?.id },
  });

  if (!isLoaded || !session) return null;

  return (
    <Layout>
      <div className="py-4">
        <h1 className="text-3xl font-black mb-8 tracking-tight">
          ¡Hola, {session.displayName}! 👋
        </h1>

        {loadingDash ? (
          <div className="flex justify-center p-8">
            <Loader2 className="animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 mb-10">
            <Card className="p-5 rounded-[24px] bg-primary text-primary-foreground border-none shadow-xl shadow-primary/20 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 opacity-10">
                <Users size={80} />
              </div>
              <div className="text-5xl font-black mb-1 drop-shadow-sm">
                {dashboard?.activeGroups || 0}
              </div>
              <div className="text-sm font-bold opacity-90 tracking-wide uppercase">
                Viajes activos
              </div>
            </Card>
            <Card className="p-5 rounded-[24px] bg-secondary text-secondary-foreground border-none shadow-xl shadow-secondary/20 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 opacity-10">
                <Compass size={80} />
              </div>
              <div className="text-5xl font-black mb-1 drop-shadow-sm">
                {dashboard?.totalSwipes || 0}
              </div>
              <div className="text-sm font-bold opacity-90 tracking-wide uppercase">
                Lugares votados
              </div>
            </Card>
          </div>
        )}

        <div className="flex items-center justify-between mb-5 mt-8">
          <h2 className="text-2xl font-black tracking-tight">Tus grupos</h2>
        </div>

        {loadingGroups ? (
          <div className="flex justify-center p-8">
            <Loader2 className="animate-spin text-primary" />
          </div>
        ) : groups?.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-3xl border border-border/50 shadow-sm">
            <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5">
              <MapPin className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Todavía no hay viajes</h3>
            <p className="text-muted-foreground mb-0 max-w-[250px] mx-auto">
              Creá un grupo e invitá a tus amigos para empezar a deslizar.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {groups?.map((group) => (
              <Card
                key={group.id}
                className="p-5 rounded-[20px] border-border/50 shadow-sm hover:shadow-md hover:border-primary/40 cursor-pointer transition-all active:scale-[0.98]"
                onClick={() => setLocation(`/groups/${group.id}`)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-xl">{group.name}</h3>
                    <div className="flex items-center gap-3 mt-2.5 text-sm text-muted-foreground font-medium">
                      <span className="flex items-center gap-1.5">
                        <Users size={16} className="text-primary" /> {group.memberCount}{" "}
                        {group.memberCount === 1 ? "integrante" : "integrantes"}
                      </span>
                      <span className="capitalize px-2.5 py-0.5 bg-muted rounded-md text-xs font-bold text-foreground">
                        {translateStatus(group.status)}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mt-8">
          <Button
            onClick={() => setLocation("/groups/new")}
            className="h-14 rounded-2xl font-bold shadow-lg shadow-primary/20"
            variant="default"
          >
            <Plus className="mr-2 h-5 w-5" /> Crear grupo
          </Button>
          <Button
            onClick={() => setLocation("/groups/join")}
            className="h-14 rounded-2xl bg-card border-2 border-border text-foreground hover:bg-muted font-bold"
            variant="outline"
          >
            Unirse
          </Button>
        </div>
      </div>
    </Layout>
  );
}

function translateStatus(status: string) {
  const map: Record<string, string> = {
    pending: "pendiente",
    swiping: "votando",
    matched: "con match",
    planning: "planificando",
  };
  return map[status] ?? status;
}
