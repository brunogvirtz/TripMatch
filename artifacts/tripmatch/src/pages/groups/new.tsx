import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import {
  useCreateGroup,
  getListGroupsQueryKey,
  getGetDashboardQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Layout } from "@/components/layout";
import { Textarea } from "@/components/ui/textarea";
import { Map } from "lucide-react";

export default function NewGroup() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const createGroup = useCreateGroup();
  const queryClient = useQueryClient();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !isAuthenticated) return;

    createGroup.mutate(
      {
        data: {
          name: name.trim(),
          description: desc.trim() || null,
        },
      },
      {
        onSuccess: (group) => {
          queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
          setLocation(`/groups/${group.id}`);
        },
      }
    );
  };

  return (
    <Layout>
      <div className="py-6 max-w-sm w-full mx-auto">
        <div className="mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
            <Map className="text-primary h-8 w-8" />
          </div>
          <h1 className="text-4xl font-black mb-3">Crear viaje</h1>
          <p className="text-muted-foreground text-lg">Poné un nombre para tu grupo de viaje.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground ml-1">
              Nombre del viaje
            </label>
            <Input
              autoFocus
              placeholder="ej. Verano en Europa..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-14 text-lg px-5 rounded-2xl bg-card border-border/50 focus-visible:ring-primary shadow-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground ml-1">
              Descripción (opcional)
            </label>
            <Textarea
              placeholder="¿Algún objetivo para este viaje?"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="min-h-[120px] text-base rounded-2xl bg-card border-border/50 resize-none p-5 focus-visible:ring-primary shadow-sm"
            />
          </div>

          <div className="pt-6">
            <Button
              type="submit"
              size="lg"
              className="w-full h-14 text-lg rounded-2xl font-bold shadow-lg shadow-primary/20 active:scale-95 transition-transform"
              disabled={!name.trim() || createGroup.isPending}
            >
              {createGroup.isPending ? "Creando..." : "Crear viaje"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full mt-3 h-14 rounded-2xl font-bold text-muted-foreground"
              onClick={() => setLocation("/dashboard")}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
