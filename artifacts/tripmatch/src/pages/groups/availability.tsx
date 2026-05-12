import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import {
  useGetMyAvailability,
  useSetAvailability,
  getGetMyAvailabilityQueryKey,
  getGetGroupQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Loader2, ArrowLeft } from "lucide-react";

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const DAY_NAMES = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function Availability() {
  const [, params] = useRoute("/groups/:id/availability");
  const groupId = parseInt(params?.id || "0");
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<"add" | "remove">("add");

  const { data: myAvailability, isLoading } = useGetMyAvailability(groupId, {
    query: { enabled: !!groupId && isAuthenticated } as never,
  });

  useEffect(() => {
    if (myAvailability?.dates) {
      setSelectedDates(new Set(myAvailability.dates));
    }
  }, [myAvailability]);

  const setAvailability = useSetAvailability();

  const toggleDate = (dateStr: string, mode?: "add" | "remove") => {
    setSelectedDates((prev) => {
      const next = new Set(prev);
      const effectiveMode = mode ?? (next.has(dateStr) ? "remove" : "add");
      if (effectiveMode === "remove") next.delete(dateStr);
      else next.add(dateStr);
      return next;
    });
  };

  const handleMouseDown = (dateStr: string) => {
    const mode = selectedDates.has(dateStr) ? "remove" : "add";
    setDragMode(mode);
    setIsDragging(true);
    toggleDate(dateStr, mode);
  };

  const handleMouseEnter = (dateStr: string) => {
    if (isDragging) toggleDate(dateStr, dragMode);
  };

  const handleSave = () => {
    setAvailability.mutate(
      { id: groupId, data: { dates: Array.from(selectedDates) } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMyAvailabilityQueryKey(groupId) });
          queryClient.invalidateQueries({ queryKey: getGetGroupQueryKey(groupId) });
          toast({
            title: `¡Disponibilidad guardada!`,
            description: `${selectedDates.size} día${selectedDates.size !== 1 ? "s" : ""} seleccionado${selectedDates.size !== 1 ? "s" : ""}.`,
          });
          setLocation(`/groups/${groupId}`);
        },
        onError: () => {
          toast({ title: "Error al guardar la disponibilidad", variant: "destructive" });
        },
      }
    );
  };

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center p-12 mt-20">
          <Loader2 className="animate-spin text-primary h-10 w-10" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div
        className="py-4 pb-32 select-none"
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
      >
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-xl p-2 h-9 w-9 text-muted-foreground hover:text-foreground"
            onClick={() => setLocation(`/groups/${groupId}`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-black tracking-tight">Tu disponibilidad</h1>
            <p className="text-muted-foreground text-sm">Tocá los días que podés viajar</p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4 px-1">
          <span className="text-sm font-medium text-muted-foreground">
            {selectedDates.size === 0
              ? "Ningún día seleccionado"
              : `${selectedDates.size} día${selectedDates.size !== 1 ? "s" : ""} seleccionado${selectedDates.size !== 1 ? "s" : ""}`}
          </span>
          {selectedDates.size > 0 && (
            <button
              onClick={() => setSelectedDates(new Set())}
              className="text-xs font-bold text-destructive hover:underline"
            >
              Limpiar todo
            </button>
          )}
        </div>

        <div className="bg-card border-2 border-border/30 rounded-[24px] p-4 shadow-sm mb-4">
          <div className="flex items-center justify-between mb-5">
            <Button
              variant="ghost"
              size="sm"
              onClick={prevMonth}
              className="h-9 w-9 p-0 rounded-xl"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h2 className="font-black text-lg">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={nextMonth}
              className="h-9 w-9 p-0 rounded-xl"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {DAY_NAMES.map((d) => (
              <div key={d} className="text-center text-xs font-bold text-muted-foreground py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = toDateStr(viewYear, viewMonth, day);
              const isSelected = selectedDates.has(dateStr);
              const isToday = dateStr === todayStr;
              const isPast = dateStr < todayStr;

              return (
                <button
                  key={day}
                  onMouseDown={() => !isPast && handleMouseDown(dateStr)}
                  onMouseEnter={() => !isPast && handleMouseEnter(dateStr)}
                  onTouchStart={() => !isPast && handleMouseDown(dateStr)}
                  disabled={isPast}
                  className={`
                    aspect-square rounded-xl text-sm font-bold transition-all
                    ${isSelected
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : isToday
                        ? "border-2 border-primary text-primary bg-primary/5"
                        : isPast
                          ? "text-muted-foreground/30 cursor-not-allowed"
                          : "text-foreground hover:bg-muted active:bg-muted/70"
                    }
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center px-4 mb-4">
          Podés seleccionar cualquier día suelto o arrastrando. La app calculará automáticamente las ventanas de fechas continuas.
        </p>

        <div className="fixed bottom-0 left-0 right-0 p-5 bg-background/80 backdrop-blur-xl border-t border-border/40 z-50">
          <div className="container mx-auto max-w-md md:max-w-4xl">
            <Button
              size="lg"
              className="w-full h-16 text-lg rounded-2xl font-black shadow-xl shadow-primary/20 active:scale-95 transition-transform"
              onClick={handleSave}
              disabled={setAvailability.isPending}
            >
              {setAvailability.isPending
                ? "Guardando..."
                : selectedDates.size > 0
                  ? `Guardar ${selectedDates.size} día${selectedDates.size !== 1 ? "s" : ""}`
                  : "Guardar disponibilidad"}
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
