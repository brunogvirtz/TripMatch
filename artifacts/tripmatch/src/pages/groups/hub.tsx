import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import {
  useGetGroup,
  useJoinGroup,
  useLeaveGroup,
  useUpdateGroup,
  getGetGroupQueryKey,
  getListGroupsQueryKey,
  getGetDashboardQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Layout } from "@/components/layout";
import {
  Copy,
  Users,
  Play,
  Map,
  CheckCircle2,
  Loader2,
  Check,
  ArrowLeft,
  ChevronRight,
  LogOut,
  Calendar,
  Pencil,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function GroupHub() {
  const [, params] = useRoute("/groups/:id");
  const groupId = parseInt(params?.id || "0");
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [inviteCode, setInviteCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [editingDays, setEditingDays] = useState(false);
  const [daysInput, setDaysInput] = useState("");

  const { data: group, isLoading, refetch } = useGetGroup(groupId, {
    query: { enabled: !!groupId, queryKey: getGetGroupQueryKey(groupId) },
  });

  const joinGroup = useJoinGroup();
  const leaveGroup = useLeaveGroup();
  const updateGroup = useUpdateGroup();

  const isMember = group?.members?.some((m) => m.userId === user?.id);
  const me = group?.members?.find((m) => m.userId === user?.id);
  const isCreator = me?.role === "creator";

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const code = search.get("code");
    if (code) setInviteCode(code);
  }, []);

  useEffect(() => {
    if (!inviteCode || !isAuthenticated || !group || isMember) return;
    joinGroup.mutate(
      { id: groupId, data: { inviteCode } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetGroupQueryKey(groupId) });
          queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
          refetch();
          toast({ title: "¡Te uniste al viaje!" });
        },
      }
    );
  }, [inviteCode, isAuthenticated, group, isMember]);

  useEffect(() => {
    if (group?.tripDays) setDaysInput(String(group.tripDays));
  }, [group?.tripDays]);

  const handleCopyLink = () => {
    if (!group) return;
    const url = `${window.location.origin}/groups/${group.id}?code=${group.inviteCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast({ title: "¡Link de invitación copiado!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleManualJoin = () => {
    if (!isAuthenticated || !group) return;
    joinGroup.mutate(
      { id: groupId, data: { inviteCode: inviteCode || group.inviteCode } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetGroupQueryKey(groupId) });
          queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
          refetch();
          toast({ title: "¡Te uniste al viaje!" });
        },
      }
    );
  };

  const handleLeave = () => {
    leaveGroup.mutate(
      { id: groupId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
          toast({ title: "Saliste del grupo" });
          setLeaveOpen(false);
          setLocation("/dashboard");
        },
      }
    );
  };

  const handleSaveTripDays = () => {
    const days = parseInt(daysInput, 10);
    if (!days || days < 1 || days > 60) {
      toast({ title: "Ingresá entre 1 y 60 días", variant: "destructive" });
      return;
    }
    updateGroup.mutate(
      { id: groupId, data: { tripDays: days } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetGroupQueryKey(groupId) });
          toast({ title: `Duración del viaje: ${days} días` });
          setEditingDays(false);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center p-12 mt-20">
          <Loader2 className="animate-spin text-primary h-10 w-10" />
        </div>
      </Layout>
    );
  }

  if (!group) {
    return (
      <Layout>
        <div className="text-center py-20 text-xl font-bold">Grupo no encontrado</div>
      </Layout>
    );
  }

  if (!isMember) {
    return (
      <Layout>
        <div className="py-16 text-center max-w-sm mx-auto">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
            <Users className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-4xl font-black mb-3">{group.name}</h1>
          <p className="text-muted-foreground mb-10 text-lg">
            ¡Te invitaron a unirte a este viaje!
          </p>
          <Button
            size="lg"
            className="w-full h-14 text-lg rounded-2xl font-bold shadow-lg shadow-primary/20 active:scale-95 transition-transform"
            onClick={handleManualJoin}
            disabled={joinGroup.isPending}
          >
            {joinGroup.isPending ? (
              <>
                <Loader2 className="animate-spin mr-2 h-5 w-5" /> Uniéndose...
              </>
            ) : (
              "Unirse al viaje"
            )}
          </Button>
          <Button
            variant="ghost"
            className="w-full mt-3 h-14 rounded-2xl font-bold text-muted-foreground"
            onClick={() => setLocation("/dashboard")}
          >
            Ir al inicio
          </Button>
        </div>
      </Layout>
    );
  }

  const hasMatched = group.status === "matched" || group.status === "planning";
  const mySwipeCount = me?.swipeCount ?? 0;
  const hasDates = !!group.tripDays;
  const meHasAvailability = me?.hasSetAvailability ?? false;

  return (
    <Layout>
      <div className="py-4">
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-xl p-2 h-9 w-9 text-muted-foreground hover:text-foreground"
            onClick={() => setLocation("/dashboard")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-black tracking-tight truncate">{group.name}</h1>
            {group.description && (
              <p className="text-muted-foreground text-sm truncate">{group.description}</p>
            )}
          </div>
          <div className="bg-primary/10 text-primary px-3 py-1 rounded-xl text-xs font-black uppercase tracking-widest shrink-0">
            {translateStatus(group.status)}
          </div>
        </div>

        {hasMatched && (
          <Card className="p-6 rounded-[24px] bg-primary text-primary-foreground border-none mb-6 shadow-xl shadow-primary/20">
            <h3 className="font-black text-xl mb-1">¡Hay coincidencia!</h3>
            <p className="text-primary-foreground/80 mb-5 text-sm font-medium">
              El grupo eligió un destino.
            </p>
            <div className="flex gap-3">
              <Button
                className="flex-1 h-12 rounded-xl bg-white text-primary hover:bg-white/90 font-black"
                onClick={() => setLocation(`/groups/${group.id}/results`)}
              >
                Ver resultados
              </Button>
              <Button
                className="flex-1 h-12 rounded-xl bg-white/20 text-primary-foreground hover:bg-white/30 font-black border border-white/20"
                onClick={() => setLocation(`/groups/${group.id}/plan`)}
              >
                <Map className="mr-2 h-4 w-4" /> Planificar
              </Button>
            </div>
          </Card>
        )}

        {!hasMatched && !me?.hasCompletedPreferences && (
          <Card
            className="p-5 rounded-[24px] border-2 border-primary/20 bg-primary/5 mb-4 cursor-pointer active:scale-[0.99] transition-transform"
            onClick={() => setLocation(`/groups/${group.id}/preferences`)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-black text-sm shrink-0">
                  1
                </div>
                <div>
                  <div className="font-black text-base">Configurar preferencias</div>
                  <div className="text-muted-foreground text-sm">
                    Presupuesto, estilo, clima — 1 min
                  </div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </Card>
        )}

        {!hasMatched && me?.hasCompletedPreferences && (
          <div className="flex items-center gap-3 px-1 mb-4">
            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
            <span className="text-sm font-medium text-muted-foreground">
              Preferencias guardadas
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto text-xs h-7 rounded-lg text-muted-foreground hover:text-foreground"
              onClick={() => setLocation(`/groups/${group.id}/preferences`)}
            >
              Editar
            </Button>
          </div>
        )}

        {!hasMatched && (
          <Card className="p-6 rounded-[24px] bg-secondary text-secondary-foreground border-none mb-6 shadow-xl shadow-secondary/20">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-black text-sm">
                2
              </div>
              <h3 className="font-black text-xl">
                {mySwipeCount > 0 ? "Seguir deslizando" : "¡A deslizar!"}
              </h3>
            </div>
            <p className="text-secondary-foreground/80 mb-5 text-sm font-medium">
              {mySwipeCount > 0
                ? `Deslizaste ${mySwipeCount} destinos. ¡Seguí para mejorar el match!`
                : "Deslizá destinos para encontrar lo que el grupo prefiere."}
            </p>
            <Button
              variant="default"
              className="w-full h-14 rounded-2xl bg-white text-secondary hover:bg-white/90 font-black text-lg active:scale-95 transition-transform shadow-lg"
              onClick={() => setLocation(`/groups/${group.id}/swipe`)}
            >
              <Play className="mr-2 h-5 w-5 fill-current" />
              {mySwipeCount > 0 ? "Seguir deslizando" : "Empezar a deslizar"}
            </Button>
            {mySwipeCount > 0 && (
              <Button
                variant="ghost"
                className="w-full mt-2 h-10 rounded-xl text-secondary-foreground/70 hover:text-secondary-foreground hover:bg-white/10 font-semibold text-sm"
                onClick={() => setLocation(`/groups/${group.id}/results`)}
              >
                Ver resultados actuales
              </Button>
            )}
          </Card>
        )}

        {/* Trip duration — creator sets, others read */}
        <div className="mb-4">
          {isCreator && (editingDays || !hasDates) ? (
            <Card className="p-5 rounded-[24px] border-2 border-border/40 bg-card mb-0">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Calendar className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <div className="font-black text-base">Duración del viaje</div>
                  <div className="text-muted-foreground text-sm">¿Cuántos días van a viajar?</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={daysInput}
                  onChange={(e) => setDaysInput(e.target.value)}
                  placeholder="Ej: 7"
                  className="flex-1 h-12 px-4 text-xl font-black text-center rounded-2xl border-2 border-border/50 bg-background focus:border-primary focus:outline-none transition-colors"
                />
                <span className="text-sm font-bold text-muted-foreground shrink-0">días</span>
                <Button
                  className="h-12 px-6 rounded-2xl font-black shrink-0"
                  onClick={handleSaveTripDays}
                  disabled={updateGroup.isPending}
                >
                  {updateGroup.isPending ? <Loader2 className="animate-spin h-4 w-4" /> : "Guardar"}
                </Button>
              </div>
              {editingDays && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2 h-8 text-xs text-muted-foreground rounded-xl"
                  onClick={() => { setEditingDays(false); setDaysInput(String(group.tripDays ?? "")); }}
                >
                  Cancelar
                </Button>
              )}
            </Card>
          ) : (
            <div className="flex items-center gap-3 px-1 mb-0">
              <Calendar className="h-5 w-5 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium text-muted-foreground">
                {hasDates
                  ? `Duración del viaje: ${group.tripDays} día${group.tripDays !== 1 ? "s" : ""}`
                  : "El creador aún no definió la duración del viaje"}
              </span>
              {isCreator && hasDates && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto text-xs h-7 rounded-lg text-muted-foreground hover:text-foreground"
                  onClick={() => setEditingDays(true)}
                >
                  <Pencil className="h-3 w-3 mr-1" /> Editar
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Availability card */}
        {!meHasAvailability ? (
          <Card
            className="p-5 rounded-[24px] border-2 border-border/40 bg-card mb-4 cursor-pointer active:scale-[0.99] transition-transform"
            onClick={() => setLocation(`/groups/${group.id}/availability`)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Calendar className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <div className="font-black text-base">Tu disponibilidad</div>
                  <div className="text-muted-foreground text-sm">
                    Elegí los días que podés viajar
                  </div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </Card>
        ) : (
          <div className="flex items-center gap-3 px-1 mb-4">
            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
            <span className="text-sm font-medium text-muted-foreground">
              Disponibilidad configurada
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto text-xs h-7 rounded-lg text-muted-foreground hover:text-foreground"
              onClick={() => setLocation(`/groups/${group.id}/availability`)}
            >
              Editar
            </Button>
          </div>
        )}

        {/* Best dates link */}
        {hasDates && (
          <Card
            className="p-5 rounded-[24px] border-2 border-primary/20 bg-primary/5 mb-6 cursor-pointer active:scale-[0.99] transition-transform"
            onClick={() => setLocation(`/groups/${group.id}/dates`)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-black text-base">Ver fechas ideales</div>
                  <div className="text-muted-foreground text-sm">
                    {group.tripDays} días · calculado para todo el grupo
                  </div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </Card>
        )}

        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black">
              Integrantes ({group.members.length})
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="rounded-xl font-bold border-2 border-border/50 bg-card h-9 px-3 text-xs"
            >
              {copied ? (
                <>
                  <Check className="mr-1.5 h-3.5 w-3.5 text-green-500" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  Invitar
                </>
              )}
            </Button>
          </div>

          <div className="space-y-2">
            {group.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 bg-card border border-border/30 rounded-[18px] shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center font-black text-primary text-sm border border-primary/20 shrink-0">
                    {member.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-foreground">
                      {member.displayName}{" "}
                      {member.userId === user?.id && (
                        <span className="text-muted-foreground font-normal text-xs">(vos)</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground capitalize flex items-center gap-1 mt-0.5">
                      {translateRole(member.role)}
                      {member.hasCompletedPreferences && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                      )}
                      {member.hasSetAvailability && (
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {member.swipeCount > 0 && (
                    <div className="text-xs font-bold text-secondary bg-secondary/10 px-2.5 py-1 rounded-lg">
                      {member.swipeCount} votos
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-muted/50 rounded-2xl p-4 mb-4">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Código de invitación
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="font-mono font-black text-xl tracking-widest text-foreground">
              {group.inviteCode}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyLink}
              className="rounded-xl h-9 font-bold text-xs shrink-0"
            >
              {copied ? "¡Copiado!" : "Copiar link"}
            </Button>
          </div>
        </div>

        <Button
          variant="ghost"
          className="w-full h-12 rounded-2xl text-destructive hover:bg-destructive/5 hover:text-destructive font-bold mt-4"
          onClick={() => setLeaveOpen(true)}
        >
          <LogOut className="mr-2 h-4 w-4" /> Salir del grupo
        </Button>

        <AlertDialog open={leaveOpen} onOpenChange={setLeaveOpen}>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>¿Salir de "{group.name}"?</AlertDialogTitle>
              <AlertDialogDescription>
                Vas a perder tus votos en este grupo. Podés volver a unirte usando el código de invitación.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleLeave}
                disabled={leaveGroup.isPending}
                className="rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                {leaveGroup.isPending ? "Saliendo..." : "Salir del grupo"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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

function translateRole(role: string) {
  const map: Record<string, string> = {
    creator: "creador/a",
    member: "integrante",
  };
  return map[role] ?? role;
}
