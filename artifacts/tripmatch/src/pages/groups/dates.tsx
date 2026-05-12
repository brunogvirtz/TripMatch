import { useRoute, useLocation } from "wouter";
import { useGetGroupDates, useGetGroup } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Layout } from "@/components/layout";
import {
  Calendar,
  ArrowLeft,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Sparkles,
} from "lucide-react";

type DateWindowItem = {
  startDate: string;
  endDate: string;
  dates: string[];
  membersAvailable: number;
  membersWithDates: number;
  totalMembers: number;
  memberAvailability: { userId: string; displayName: string; available: boolean }[];
};

const MONTH_NAMES_SHORT = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

function formatDateRange(startDate: string, endDate: string) {
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.getDate()} – ${end.getDate()} de ${MONTH_NAMES_SHORT[start.getMonth()]} ${start.getFullYear()}`;
  }
  return `${start.getDate()} ${MONTH_NAMES_SHORT[start.getMonth()]} – ${end.getDate()} ${MONTH_NAMES_SHORT[end.getMonth()]} ${end.getFullYear()}`;
}

function WindowCard({ window, isTop }: { window: DateWindowItem; isTop: boolean }) {
  const allCanGo = window.membersAvailable === window.membersWithDates && window.membersWithDates > 0;
  const pct = window.membersWithDates > 0
    ? Math.round((window.membersAvailable / window.membersWithDates) * 100)
    : 0;

  return (
    <Card
      className={`p-4 rounded-[22px] border-2 ${
        isTop ? "border-primary shadow-lg shadow-primary/10 bg-card" : "border-border/40 bg-card/80"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          {isTop && (
            <div className="text-xs font-black uppercase tracking-widest text-primary mb-1 flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Mejor opción
            </div>
          )}
          <div className="font-black text-base truncate">
            {formatDateRange(window.startDate, window.endDate)}
          </div>
          <div className="text-sm text-muted-foreground font-medium mt-0.5">
            {window.dates.length} día{window.dates.length !== 1 ? "s" : ""} ·{" "}
            {window.membersAvailable} de {window.membersWithDates} pueden ir
          </div>
        </div>
        <div
          className={`text-2xl font-black ml-3 shrink-0 ${
            allCanGo ? "text-green-500" : pct >= 66 ? "text-secondary" : "text-muted-foreground"
          }`}
        >
          {pct}%
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {window.memberAvailability.map((m) => (
          <div
            key={m.userId}
            className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
              m.available
                ? "bg-green-100 text-green-700"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {m.available ? (
              <CheckCircle2 className="h-3 w-3 shrink-0" />
            ) : (
              <XCircle className="h-3 w-3 shrink-0" />
            )}
            <span className="truncate max-w-[80px]">{m.displayName}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function Dates() {
  const [, params] = useRoute("/groups/:id/dates");
  const groupId = parseInt(params?.id || "0");
  const [, setLocation] = useLocation();

  const { data: datesResult, isLoading } = useGetGroupDates(groupId, {
    query: { enabled: !!groupId } as never,
  });

  const { data: group } = useGetGroup(groupId, {
    query: { enabled: !!groupId } as never,
  });

  if (isLoading || !datesResult) {
    return (
      <Layout>
        <div className="flex justify-center p-12 mt-20">
          <Loader2 className="animate-spin text-primary h-10 w-10" />
        </div>
      </Layout>
    );
  }

  const perfectWindows = datesResult.windows.filter(
    (w) => w.membersAvailable === w.membersWithDates && w.membersWithDates > 0
  );
  const goodWindows = datesResult.windows.filter(
    (w) => w.membersAvailable < w.membersWithDates && w.membersAvailable > 0
  );
  const membersWithoutDates = datesResult.totalMembers - datesResult.membersWithDates;

  return (
    <Layout>
      <div className="py-4 pb-16">
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-xl p-2 h-9 w-9 text-muted-foreground hover:text-foreground"
            onClick={() => setLocation(`/groups/${groupId}`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-black tracking-tight">Fechas ideales</h1>
            {group && (
              <p className="text-muted-foreground text-sm truncate">{group.name}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-card border border-border/30 rounded-2xl p-3 text-center shadow-sm">
            <div className="text-2xl font-black text-primary">
              {datesResult.tripDays ?? "—"}
            </div>
            <div className="text-xs text-muted-foreground font-medium mt-0.5">días de viaje</div>
          </div>
          <div className="bg-card border border-border/30 rounded-2xl p-3 text-center shadow-sm">
            <div className="text-2xl font-black text-foreground">
              {datesResult.membersWithDates}
            </div>
            <div className="text-xs text-muted-foreground font-medium mt-0.5">con disponibilidad</div>
          </div>
          <div className="bg-card border border-border/30 rounded-2xl p-3 text-center shadow-sm">
            <div className="text-2xl font-black text-foreground">{datesResult.totalMembers}</div>
            <div className="text-xs text-muted-foreground font-medium mt-0.5">integrantes</div>
          </div>
        </div>

        {!datesResult.tripDays && (
          <Card className="p-6 rounded-[24px] border-2 border-dashed border-border/50 text-center mb-4">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-black text-lg mb-2">Sin duración definida</h3>
            <p className="text-muted-foreground text-sm">
              El creador del grupo todavía no configuró cuántos días va a durar el viaje.
            </p>
          </Card>
        )}

        {datesResult.tripDays && datesResult.membersWithDates === 0 && (
          <Card className="p-6 rounded-[24px] border-2 border-dashed border-border/50 text-center mb-4">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-black text-lg mb-2">Sin disponibilidades</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Nadie puso su disponibilidad todavía. ¡Sumá la tuya!
            </p>
            <Button onClick={() => setLocation(`/groups/${groupId}/availability`)}>
              Poner mi disponibilidad
            </Button>
          </Card>
        )}

        {datesResult.tripDays && datesResult.membersWithDates > 0 && datesResult.windows.length === 0 && (
          <Card className="p-6 rounded-[24px] border-2 border-dashed border-border/50 text-center mb-4">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-black text-lg mb-2">Sin fechas en común</h3>
            <p className="text-muted-foreground text-sm">
              No hay ventanas de {datesResult.tripDays} días continuos en las
              disponibilidades cargadas. Pedile al grupo que agregue más días.
            </p>
          </Card>
        )}

        {perfectWindows.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-black mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Perfectas para todos
            </h2>
            <div className="space-y-3">
              {perfectWindows.slice(0, 5).map((w, idx) => (
                <WindowCard key={w.startDate} window={w} isTop={idx === 0} />
              ))}
            </div>
          </div>
        )}

        {goodWindows.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-black mb-3 flex items-center gap-2">
              <Users className="h-5 w-5 text-secondary" />
              Alternativas
            </h2>
            <div className="space-y-3">
              {goodWindows.slice(0, 5).map((w) => (
                <WindowCard key={w.startDate} window={w} isTop={false} />
              ))}
            </div>
          </div>
        )}

        {membersWithoutDates > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-2 text-amber-700 font-bold text-sm mb-1">
              <Clock className="h-4 w-4 shrink-0" />
              {membersWithoutDates} integrante
              {membersWithoutDates !== 1 ? "s" : ""} aún no{" "}
              {membersWithoutDates !== 1 ? "pusieron" : "puso"} su disponibilidad
            </div>
            <p className="text-amber-600 text-xs">
              Los resultados pueden mejorar cuando todos carguen sus fechas.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
