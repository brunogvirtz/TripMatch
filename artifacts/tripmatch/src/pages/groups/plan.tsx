import { useRoute, useLocation } from "wouter";
import { useGetGroupResults, useGetGroup } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Layout } from "@/components/layout";
import { Calendar, Plane, Map as MapIcon, Share2, CheckCircle2, ChevronLeft } from "lucide-react";

export default function Plan() {
  const [, params] = useRoute("/groups/:id/plan");
  const groupId = parseInt(params?.id || "0");
  const [, setLocation] = useLocation();

  const { data: results, isLoading: loadingResults } = useGetGroupResults(groupId, {
    query: { enabled: !!groupId }
  });
  
  const { data: group, isLoading: loadingGroup } = useGetGroup(groupId, {
    query: { enabled: !!groupId }
  });

  if (loadingResults || loadingGroup || !results || !group) 
    return <Layout><div className="p-12 text-center mt-20 font-bold">Building your itinerary...</div></Layout>;

  const topMatch = results.topDestinations[0];

  if (!topMatch) {
    return (
      <Layout>
        <div className="p-12 text-center font-bold text-xl mt-20">No match found yet.</div>
        <Button size="lg" className="w-full rounded-2xl font-bold" onClick={() => setLocation(`/groups/${groupId}`)}>Back to Group</Button>
      </Layout>
    );
  }

  const activities = [
    "Lock in travel dates",
    "Book flights together",
    "Find an Airbnb near the center",
    "Create a shared Google Doc for itinerary",
    "Book reservations for the first night dinner"
  ];

  return (
    <Layout showNav={false} className="p-0 max-w-none md:max-w-none">
      <div className="relative w-full h-[40dvh]">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${topMatch.imageUrl || '/destinations/bali.png'})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        
        <div className="absolute top-6 left-4 z-10">
          <button onClick={() => setLocation(`/groups/${groupId}`)} className="p-3 bg-black/20 backdrop-blur border border-white/20 rounded-full text-white shadow-sm">
            <ChevronLeft size={20} strokeWidth={3} />
          </button>
        </div>

        <div className="absolute bottom-6 left-6 right-6">
          <div className="bg-primary text-white px-3 py-1.5 rounded-xl text-xs font-black inline-block mb-3 uppercase tracking-widest shadow-lg">Official Destination</div>
          <h1 className="text-5xl font-black drop-shadow-md text-foreground mb-1">{topMatch.destinationName}</h1>
          <div className="text-xl font-bold text-foreground/80 drop-shadow-md">{topMatch.country}</div>
        </div>
      </div>

      <div className="px-4 py-6 max-w-md mx-auto w-full pb-32">
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Card className="p-5 rounded-[24px] border-none bg-card shadow-lg shadow-black/5">
            <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center mb-4">
              <Calendar className="text-secondary h-6 w-6" />
            </div>
            <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">Dates</div>
            <div className="font-black text-xl">TBD</div>
          </Card>
          <Card className="p-5 rounded-[24px] border-none bg-card shadow-lg shadow-black/5">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
              <Plane className="text-primary h-6 w-6" />
            </div>
            <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">Flights</div>
            <div className="font-black text-xl">Pending</div>
          </Card>
        </div>

        <h3 className="text-2xl font-black mb-4">Checklist</h3>
        <Card className="p-2 rounded-[24px] border-2 border-border/30 bg-card mb-8 shadow-sm">
          {activities.map((act, i) => (
            <div key={i} className={`flex items-start gap-4 p-4 ${i !== activities.length - 1 ? 'border-b border-border/30' : ''}`}>
              <div className="mt-0.5"><CheckCircle2 className="h-6 w-6 text-muted-foreground/30 hover:text-primary transition-colors cursor-pointer" /></div>
              <div className="font-bold text-base text-foreground/90">{act}</div>
            </div>
          ))}
        </Card>

        <div className="fixed bottom-0 left-0 right-0 p-5 bg-background/80 backdrop-blur-xl border-t border-border/40 z-50">
          <div className="container mx-auto max-w-md md:max-w-4xl">
            <Button className="w-full h-16 rounded-2xl text-lg font-black shadow-xl shadow-primary/20" onClick={() => alert("Itinerary link copied!")}>
              <Share2 className="mr-2 h-5 w-5" /> Share Itinerary Link
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
