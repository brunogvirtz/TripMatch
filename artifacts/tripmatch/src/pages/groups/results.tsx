import { useRoute, useLocation } from "wouter";
import { useGetGroupResults, useGetGroup } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Layout } from "@/components/layout";
import { Trophy, ArrowRight, MapPin, Heart, Star, Flame } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function Results() {
  const [, params] = useRoute("/groups/:id/results");
  const groupId = parseInt(params?.id || "0");
  const [, setLocation] = useLocation();

  const { data: results, isLoading } = useGetGroupResults(groupId, {
    query: { enabled: !!groupId },
  });

  const { data: group } = useGetGroup(groupId, {
    query: { enabled: !!groupId },
  });

  if (isLoading || !results)
    return (
      <Layout>
        <div className="p-12 text-center mt-20 text-lg font-bold">
          Calculando coincidencias...
        </div>
      </Layout>
    );

  return (
    <Layout>
      <div className="py-8 pb-32">
        <div className="text-center mb-10">
          <div className="inline-flex p-5 bg-primary/10 rounded-[24px] mb-5 shadow-inner">
            <Trophy className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-4xl font-black mb-3 tracking-tight">El veredicto</h1>
          <p className="text-muted-foreground text-lg px-4">{results.consensusSummary}</p>
        </div>

        <Card className="mb-10 p-6 rounded-[24px] border-2 border-border/30 bg-card shadow-sm">
          <div className="flex justify-between text-sm font-black mb-3 uppercase tracking-widest text-muted-foreground">
            <span>Progreso del grupo</span>
            <span className="text-primary">{Math.round(results.completionPercent)}%</span>
          </div>
          <Progress value={results.completionPercent} className="h-4 bg-muted rounded-full" />
          <p className="text-sm font-medium text-foreground mt-4 text-center">
            {results.membersCompleted} de {results.totalMembers} integrantes ya votaron.
          </p>
        </Card>

        <div className="space-y-5 mb-10">
          <h2 className="text-2xl font-black flex items-center gap-2">
            <Flame className="text-secondary fill-secondary" /> Mejores coincidencias
          </h2>
          {results.topDestinations.map((dest, idx) => (
            <Card
              key={dest.destinationId}
              className={`p-4 rounded-[24px] border-2 transition-transform hover:scale-[1.02] cursor-pointer ${
                idx === 0
                  ? "border-primary shadow-xl shadow-primary/10 bg-card"
                  : "border-border/40 bg-card/80"
              }`}
            >
              <div className="flex gap-4">
                <div
                  className="w-28 h-28 rounded-2xl bg-muted bg-cover bg-center flex-shrink-0 relative overflow-hidden shadow-inner"
                  style={{
                    backgroundImage: `url(${dest.imageUrl || "/destinations/bali.png"})`,
                  }}
                >
                  {idx === 0 && (
                    <div className="absolute top-0 left-0 bg-primary text-white text-[10px] font-black tracking-widest px-3 py-1 rounded-br-xl">
                      #1 MATCH
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-black text-xl leading-tight truncate">
                      {dest.destinationName}
                    </h3>
                  </div>
                  <div className="flex items-center text-sm font-medium text-muted-foreground mb-3">
                    <MapPin size={14} className="mr-1 text-primary" /> {dest.country}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-secondary/10 text-secondary px-3 py-1.5 rounded-lg text-xs font-black tracking-wider">
                      {Math.round(dest.matchPercentage)}% COINCIDENCIA
                    </div>
                    <div className="flex items-center gap-3 text-sm text-foreground font-bold">
                      <span className="flex items-center gap-1.5">
                        <Heart size={14} className="text-red-500 fill-red-500" /> {dest.likeCount}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Star size={14} className="text-yellow-500 fill-yellow-500" />{" "}
                        {dest.superlikeCount}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}

          {results.topDestinations.length === 0 && (
            <div className="text-center py-16 bg-muted/30 rounded-[24px] border-2 border-dashed border-border/50">
              <p className="text-muted-foreground font-bold text-lg">
                Todavía no hay suficientes votos para encontrar una coincidencia.
              </p>
            </div>
          )}
        </div>

        {results.topDestinations.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 p-5 bg-background/80 backdrop-blur-xl border-t border-border/40 z-50">
            <div className="container mx-auto max-w-md md:max-w-4xl">
              <Button
                size="lg"
                className="w-full h-16 text-lg rounded-2xl font-black shadow-xl shadow-primary/20 active:scale-95 transition-transform group"
                onClick={() => setLocation(`/groups/${groupId}/plan`)}
              >
                Crear itinerario{" "}
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
