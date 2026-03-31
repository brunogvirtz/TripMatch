import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useSession } from "@/hooks/use-session";
import { useSubmitPreferences, getGetGroupQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const CLIMATES = [
  { value: "tropical", label: "Tropical" },
  { value: "temperate", label: "Templado" },
  { value: "cold", label: "Frío" },
];
const ACTIVITY_LEVELS = [
  { value: "chill", label: "Tranquilo" },
  { value: "moderate", label: "Moderado" },
  { value: "active", label: "Activo" },
];
const TRAVEL_TYPES = [
  { value: "beach", label: "Playa" },
  { value: "culture", label: "Cultura" },
  { value: "nature", label: "Naturaleza" },
  { value: "party", label: "Fiesta" },
  { value: "adventure", label: "Aventura" },
];

export default function Preferences() {
  const [, params] = useRoute("/groups/:id/preferences");
  const groupId = parseInt(params?.id || "0");
  const { session } = useSession();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [budget, setBudget] = useState([1500]);
  const [climate, setClimate] = useState("tropical");
  const [activity, setActivity] = useState("moderate");
  const [types, setTypes] = useState<string[]>([]);

  const submitPrefs = useSubmitPreferences();

  const toggleType = (t: string) => {
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const handleSubmit = () => {
    if (!session || types.length === 0) {
      toast({ title: "Seleccioná al menos un estilo de viaje", variant: "destructive" });
      return;
    }

    submitPrefs.mutate(
      {
        id: groupId,
        data: {
          userId: session.id,
          budgetMin: 0,
          budgetMax: budget[0],
          climate,
          activityLevel: activity,
          travelTypes: types,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetGroupQueryKey(groupId) });
          toast({ title: "¡Preferencias guardadas! Listo para deslizar." });
          setLocation(`/groups/${groupId}`);
        },
      }
    );
  };

  return (
    <Layout>
      <div className="py-6 pb-32">
        <h1 className="text-4xl font-black mb-3 tracking-tight">Tu estilo de viaje</h1>
        <p className="text-muted-foreground text-lg mb-10 font-medium">
          Configurá el algoritmo según tus gustos.
        </p>

        <div className="space-y-10">
          <div className="p-6 bg-card border-2 border-border/30 rounded-[24px] shadow-sm">
            <h3 className="text-xl font-black mb-6 flex justify-between">
              <span>Presupuesto máximo</span>
              <span className="text-primary">${budget[0]}</span>
            </h3>
            <Slider
              value={budget}
              onValueChange={setBudget}
              max={5000}
              step={100}
              className="py-4"
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-black ml-2">Clima</h3>
            <div className="grid grid-cols-3 gap-3">
              {CLIMATES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setClimate(c.value)}
                  className={`py-4 rounded-2xl text-sm font-bold transition-all active:scale-95 ${
                    climate === c.value
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02] border-2 border-primary"
                      : "bg-card border-2 border-border/50 text-foreground hover:border-border"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-black ml-2">Nivel de actividad</h3>
            <div className="grid grid-cols-3 gap-3">
              {ACTIVITY_LEVELS.map((a) => (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => setActivity(a.value)}
                  className={`py-4 rounded-2xl text-sm font-bold transition-all active:scale-95 ${
                    activity === a.value
                      ? "bg-secondary text-secondary-foreground shadow-md shadow-secondary/20 scale-[1.02] border-2 border-secondary"
                      : "bg-card border-2 border-border/50 text-foreground hover:border-border"
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-black ml-2">El ambiente (elegí varios)</h3>
            <div className="flex flex-wrap gap-3">
              {TRAVEL_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => toggleType(t.value)}
                  className={`px-6 py-4 rounded-full text-sm font-bold transition-all active:scale-95 ${
                    types.includes(t.value)
                      ? "bg-accent text-accent-foreground shadow-md shadow-accent/20 scale-[1.02] border-2 border-accent-foreground/30"
                      : "bg-card border-2 border-border/50 text-foreground hover:border-border"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-5 bg-background/80 backdrop-blur-xl border-t border-border/40 z-50">
          <div className="container mx-auto max-w-md md:max-w-4xl">
            <Button
              size="lg"
              className="w-full h-16 text-lg rounded-2xl font-black shadow-xl shadow-primary/20 active:scale-95 transition-transform"
              onClick={handleSubmit}
              disabled={submitPrefs.isPending}
            >
              {submitPrefs.isPending ? "Guardando..." : "Guardar preferencias"}
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
