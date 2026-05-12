import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import {
  useGetGroupResults,
  useGetGroup,
  useGetGroupDates,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Layout } from "@/components/layout";
import {
  Calendar,
  Plane,
  Share2,
  ChevronLeft,
  Hotel,
  ExternalLink,
  Sparkles,
  Users,
  CheckCircle2,
  Clock,
} from "lucide-react";

const MONTH_NAMES_SHORT = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

function formatDateRange(startDate: string, endDate: string) {
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  if (
    start.getMonth() === end.getMonth() &&
    start.getFullYear() === end.getFullYear()
  ) {
    return `${start.getDate()} – ${end.getDate()} de ${MONTH_NAMES_SHORT[start.getMonth()]} ${start.getFullYear()}`;
  }
  return `${start.getDate()} ${MONTH_NAMES_SHORT[start.getMonth()]} – ${end.getDate()} ${MONTH_NAMES_SHORT[end.getMonth()]} ${end.getFullYear()}`;
}

function buildFlightUrls(destination: string, country: string, checkin: string, checkout: string) {
  const query = encodeURIComponent(`vuelos a ${destination} ${country}`);
  const dest = encodeURIComponent(`${destination}, ${country}`);
  return {
    google: `https://www.google.com/travel/flights?q=${query}&hl=es`,
    skyscanner: `https://www.skyscanner.com/flights-to/${destination.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}/`,
    kayak: `https://www.kayak.com/flights/-/${encodeURIComponent(destination)}/${checkin}/${checkout}`,
  };
}

function buildHotelUrls(destination: string, checkin: string, checkout: string, adults: number) {
  const city = encodeURIComponent(destination);
  return {
    booking: `https://www.booking.com/searchresults.html?ss=${city}&checkin=${checkin}&checkout=${checkout}&group_adults=${adults}&lang=es`,
    airbnb: `https://www.airbnb.com/s/${city}/homes?checkin=${checkin}&checkout=${checkout}&adults=${adults}`,
    hostelworld: `https://www.hostelworld.com/st/hostels/${encodeURIComponent(destination.toLowerCase())}?from=${checkin}&to=${checkout}&guests=${adults}`,
  };
}

interface PlatformCardProps {
  name: string;
  description: string;
  color: string;
  textColor: string;
  icon: string;
  url: string;
  disabled?: boolean;
}

function PlatformCard({ name, description, color, textColor, icon, url, disabled }: PlatformCardProps) {
  return (
    <a
      href={disabled ? undefined : url}
      target="_blank"
      rel="noopener noreferrer"
      className={`block ${disabled ? "opacity-50 cursor-default" : "cursor-pointer"}`}
      onClick={(e) => disabled && e.preventDefault()}
    >
      <Card className="p-4 rounded-[20px] border-2 border-border/30 bg-card hover:border-primary/30 hover:shadow-md transition-all active:scale-[0.98]">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-sm"
            style={{ backgroundColor: color }}
          >
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-black text-base" style={{ color: textColor === "white" ? undefined : textColor }}>
              {name}
            </div>
            <div className="text-sm text-muted-foreground font-medium truncate">
              {description}
            </div>
          </div>
          {!disabled && (
            <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
        </div>
      </Card>
    </a>
  );
}

type DateWindowItem = {
  startDate: string;
  endDate: string;
  dates: string[];
  membersAvailable: number;
  membersWithDates: number;
  totalMembers: number;
};

export default function Plan() {
  const [, params] = useRoute("/groups/:id/plan");
  const groupId = parseInt(params?.id || "0");
  const [, setLocation] = useLocation();
  const [selectedWindowIdx, setSelectedWindowIdx] = useState(0);
  const [copied, setCopied] = useState(false);

  const { data: results, isLoading: loadingResults } = useGetGroupResults(groupId, {
    query: { enabled: !!groupId } as never,
  });

  const { data: group, isLoading: loadingGroup } = useGetGroup(groupId, {
    query: { enabled: !!groupId } as never,
  });

  const { data: datesResult, isLoading: loadingDates } = useGetGroupDates(groupId, {
    query: { enabled: !!groupId } as never,
  });

  if (loadingResults || loadingGroup)
    return (
      <Layout>
        <div className="p-12 text-center mt-20 font-bold">Armando el itinerario...</div>
      </Layout>
    );

  const topMatch = results?.topDestinations[0];

  if (!topMatch) {
    return (
      <Layout>
        <div className="p-12 text-center font-bold text-xl mt-20">
          Todavía no hay una coincidencia.
        </div>
        <Button
          size="lg"
          className="w-full rounded-2xl font-bold"
          onClick={() => setLocation(`/groups/${groupId}`)}
        >
          Volver al grupo
        </Button>
      </Layout>
    );
  }

  const windows: DateWindowItem[] = datesResult?.windows?.slice(0, 3) ?? [];
  const selectedWindow = windows[selectedWindowIdx] ?? null;
  const adults = group?.memberCount ?? results?.totalMembers ?? 2;

  const checkin = selectedWindow?.startDate ?? "";
  const checkout = selectedWindow?.endDate ?? "";
  const hasDate = !!selectedWindow;

  const flightUrls = buildFlightUrls(topMatch.destinationName, topMatch.country ?? "", checkin, checkout);
  const hotelUrls = buildHotelUrls(topMatch.destinationName, checkin, checkout, adults);

  const handleShare = async () => {
    const text = `🌍 ¡Vamos a ${topMatch.destinationName}!${hasDate ? `\n📅 ${formatDateRange(checkin, checkout)}` : ""}\n\nOrganizado con TripMatch`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert(text);
    }
  };

  return (
    <Layout showNav={false} className="p-0 max-w-none md:max-w-none">
      <div className="relative w-full h-[40dvh]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${topMatch.imageUrl || "/destinations/bali.png"})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

        <div className="absolute top-6 left-4 z-10">
          <button
            onClick={() => setLocation(`/groups/${groupId}`)}
            className="p-3 bg-black/20 backdrop-blur border border-white/20 rounded-full text-white shadow-sm"
          >
            <ChevronLeft size={20} strokeWidth={3} />
          </button>
        </div>

        <div className="absolute bottom-6 left-6 right-6">
          <div className="bg-primary text-white px-3 py-1.5 rounded-xl text-xs font-black inline-block mb-3 uppercase tracking-widest shadow-lg">
            Destino oficial
          </div>
          <h1 className="text-5xl font-black drop-shadow-md text-foreground mb-1">
            {topMatch.destinationName}
          </h1>
          <div className="text-xl font-bold text-foreground/80 drop-shadow-md">
            {topMatch.country}
          </div>
        </div>
      </div>

      <div className="px-4 py-6 max-w-md mx-auto w-full pb-36">

        {/* Fecha ideal */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-secondary" />
            <h2 className="text-xl font-black">Fecha ideal</h2>
          </div>

          {loadingDates ? (
            <div className="flex items-center justify-center p-6 text-muted-foreground">
              <Clock className="h-5 w-5 animate-spin mr-2" />
              Calculando disponibilidad...
            </div>
          ) : windows.length === 0 ? (
            <Card className="p-5 rounded-[20px] border-2 border-dashed border-border/50 bg-muted/30 text-center">
              <Calendar className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
              <p className="font-bold text-muted-foreground mb-3">
                Aún no hay fechas cargadas
              </p>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl font-bold"
                onClick={() => setLocation(`/groups/${groupId}/availability`)}
              >
                Cargar mi disponibilidad
              </Button>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {windows.map((w, i) => {
                const allGo = w.membersAvailable === w.membersWithDates && w.membersWithDates > 0;
                const pct = w.membersWithDates > 0
                  ? Math.round((w.membersAvailable / w.membersWithDates) * 100)
                  : 0;
                const isSelected = selectedWindowIdx === i;
                return (
                  <button
                    key={w.startDate}
                    onClick={() => setSelectedWindowIdx(i)}
                    className={`w-full text-left p-4 rounded-[18px] border-2 transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                        : "border-border/40 bg-card hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          {i === 0 && (
                            <span className="text-xs font-black text-primary flex items-center gap-1">
                              <Sparkles className="h-3 w-3" /> Mejor opción
                            </span>
                          )}
                          {isSelected && (
                            <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />
                          )}
                        </div>
                        <div className="font-black text-sm">
                          {formatDateRange(w.startDate, w.endDate)}
                        </div>
                        <div className="text-xs text-muted-foreground font-medium mt-0.5 flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {w.membersAvailable} de {w.membersWithDates} pueden ir
                        </div>
                      </div>
                      <div className={`text-2xl font-black ml-3 shrink-0 ${
                        allGo ? "text-green-500" : pct >= 66 ? "text-secondary" : "text-muted-foreground"
                      }`}>
                        {pct}%
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Vuelos */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Plane className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-black">Vuelos</h2>
          </div>
          {!hasDate && (
            <p className="text-sm text-muted-foreground mb-3 font-medium">
              Elegí una fecha arriba para búsquedas más precisas
            </p>
          )}
          {hasDate && (
            <p className="text-sm text-muted-foreground mb-3 font-medium">
              Búsquedas para {formatDateRange(checkin, checkout)} · {adults} persona{adults !== 1 ? "s" : ""}
            </p>
          )}
          <div className="flex flex-col gap-3">
            <PlatformCard
              name="Google Vuelos"
              description={hasDate ? `Ida el ${new Date(checkin + "T00:00:00").getDate()} de ${MONTH_NAMES_SHORT[new Date(checkin + "T00:00:00").getMonth()]}` : `Buscar a ${topMatch.destinationName}`}
              color="#4285F4"
              textColor="#4285F4"
              icon="✈️"
              url={flightUrls.google}
            />
            <PlatformCard
              name="Skyscanner"
              description={`Comparar precios para ${topMatch.destinationName}`}
              color="#00B0E0"
              textColor="#00B0E0"
              icon="🔎"
              url={flightUrls.skyscanner}
            />
            <PlatformCard
              name="Kayak"
              description={hasDate ? `Ida y vuelta · ${adults} pasajero${adults !== 1 ? "s" : ""}` : `Buscar vuelos baratos`}
              color="#FF690F"
              textColor="#FF690F"
              icon="🦆"
              url={flightUrls.kayak}
            />
          </div>
        </section>

        {/* Alojamiento */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-1">
            <Hotel className="h-5 w-5 text-secondary" />
            <h2 className="text-xl font-black">Alojamiento</h2>
          </div>
          {!hasDate && (
            <p className="text-sm text-muted-foreground mb-3 font-medium">
              Elegí una fecha para ver disponibilidad real
            </p>
          )}
          {hasDate && (
            <p className="text-sm text-muted-foreground mb-3 font-medium">
              {windows[selectedWindowIdx]?.dates.length ?? 0} noches · {adults} huésped{adults !== 1 ? "es" : ""}
            </p>
          )}
          <div className="flex flex-col gap-3">
            <PlatformCard
              name="Booking.com"
              description={hasDate ? `Check-in ${new Date(checkin + "T00:00:00").getDate()} de ${MONTH_NAMES_SHORT[new Date(checkin + "T00:00:00").getMonth()]}` : `Hoteles en ${topMatch.destinationName}`}
              color="#003580"
              textColor="#003580"
              icon="🏨"
              url={hotelUrls.booking}
            />
            <PlatformCard
              name="Airbnb"
              description={hasDate ? `Alojamientos completos para el grupo` : `Departamentos y casas`}
              color="#FF5A5F"
              textColor="#FF5A5F"
              icon="🏠"
              url={hotelUrls.airbnb}
            />
            <PlatformCard
              name="Hostelworld"
              description={`Hostels y opciones económicas`}
              color="#F60"
              textColor="#F60"
              icon="🛏️"
              url={hotelUrls.hostelworld}
            />
          </div>
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-5 bg-background/80 backdrop-blur-xl border-t border-border/40 z-50">
        <div className="container mx-auto max-w-md md:max-w-4xl">
          <Button
            className="w-full h-14 rounded-2xl text-lg font-black shadow-xl shadow-primary/20"
            onClick={handleShare}
          >
            {copied ? (
              <>
                <CheckCircle2 className="mr-2 h-5 w-5" /> ¡Copiado!
              </>
            ) : (
              <>
                <Share2 className="mr-2 h-5 w-5" /> Compartir itinerario
              </>
            )}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
