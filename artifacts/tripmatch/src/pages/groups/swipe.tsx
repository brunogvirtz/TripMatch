import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useSession } from "@/hooks/use-session";
import { useListDestinations, useRecordSwipe, useListUserSwipes } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout";
import { motion, useMotionValue, useTransform, useAnimation } from "framer-motion";
import { X, Heart, Star, MapPin, CheckCircle, ChevronLeft } from "lucide-react";

export default function Swipe() {
  const [, params] = useRoute("/groups/:id/swipe");
  const groupId = parseInt(params?.id || "0");
  const { session } = useSession();
  const [, setLocation] = useLocation();

  const { data: destinations = [], isLoading: loadingDest } = useListDestinations();
  const { data: userSwipes = [], isLoading: loadingSwipes, refetch } = useListUserSwipes(groupId, {
    query: { enabled: !!groupId && !!session }
  });

  const recordSwipe = useRecordSwipe();

  const unswipedDests = destinations.filter(d => !userSwipes.some(s => s.destinationId === d.id));
  const [currentIndex, setCurrentIndex] = useState(0);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-250, 250], [-25, 25]);
  const opacity = useTransform(x, [-250, -150, 0, 150, 250], [0, 1, 1, 1, 0]);
  
  // Create indicators based on drag position
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const dislikeOpacity = useTransform(x, [0, -100], [0, 1]);
  const superlikeOpacity = useTransform(x, [0, 50], [0, 0]); // Just for structure, we use drag controls for superlike usually, but horizontal drag mainly targets left/right

  const dragControls = useAnimation();

  const activeDest = unswipedDests[currentIndex];

  const handleSwipe = async (dir: "left" | "right" | "up") => {
    if (!activeDest || !session) return;
    
    let moveX = 0;
    let moveY = 0;
    if (dir === "left") moveX = -500;
    if (dir === "right") moveX = 500;
    if (dir === "up") moveY = -500;

    await dragControls.start({ x: moveX, y: moveY, opacity: 0, transition: { duration: 0.3 } });

    const value = dir === "left" ? -1 : dir === "right" ? 1 : 2;
    
    recordSwipe.mutate({
      data: {
        userId: session.id,
        groupId,
        destinationId: activeDest.id,
        value
      }
    }, {
      onSuccess: () => {
        dragControls.set({ x: 0, y: 0, opacity: 1 });
        setCurrentIndex(prev => prev + 1);
        refetch();
      }
    });
  };

  const onDragEnd = (event: any, info: any) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    const offsetY = info.offset.y;
    const velocityY = info.velocity.y;
    
    if (offset > 120 || velocity > 500) {
      handleSwipe("right");
    } else if (offset < -120 || velocity < -500) {
      handleSwipe("left");
    } else if (offsetY < -150 || velocityY < -600) {
      handleSwipe("up");
    } else {
      dragControls.start({ x: 0, y: 0, transition: { type: "spring", stiffness: 300, damping: 20 } });
    }
  };

  if (loadingDest || loadingSwipes) return <Layout><div className="flex justify-center p-12 mt-20">Loading spots...</div></Layout>;

  if (!activeDest) {
    return (
      <Layout showNav={false}>
        <div className="flex flex-col items-center justify-center flex-1 py-20 text-center h-screen px-4">
          <div className="w-28 h-28 bg-primary/10 rounded-full flex items-center justify-center mb-8 shadow-inner">
            <CheckCircle className="h-14 w-14 text-primary" />
          </div>
          <h1 className="text-4xl font-black mb-4">Caught up!</h1>
          <p className="text-muted-foreground mb-10 text-lg">You've swiped through all our top picks.</p>
          <Button size="lg" className="h-16 text-lg rounded-2xl px-8 w-full max-w-xs shadow-xl shadow-primary/20 font-black" onClick={() => setLocation(`/groups/${groupId}/results`)}>
            View Group Matches
          </Button>
          <Button variant="ghost" className="mt-4 h-14 w-full max-w-xs text-muted-foreground font-bold" onClick={() => setLocation(`/groups/${groupId}`)}>
            Back to Group
          </Button>
        </div>
      </Layout>
    );
  }

  const fallbackImages: Record<string, string> = {
    "Bali": "/destinations/bali.png",
    "Swiss Alps": "/destinations/alps.png",
    "Tokyo": "/destinations/tokyo.png",
  };
  const bgImgUrl = activeDest.imageUrl || fallbackImages[activeDest.name] || "/destinations/bali.png";

  return (
    <Layout showNav={false} className="py-2 overflow-hidden px-2 relative flex flex-col h-[100dvh] bg-background">
      <div className="flex justify-between items-center px-4 py-4 z-10">
        <button onClick={() => setLocation(`/groups/${groupId}`)} className="p-3 bg-card/80 backdrop-blur border border-border/50 rounded-full text-foreground shadow-sm">
          <ChevronLeft size={20} strokeWidth={3} />
        </button>
        <div className="font-black text-xl tracking-tight">TripMatch</div>
        <div className="text-xs font-black uppercase tracking-wider bg-card/80 backdrop-blur border border-border/50 px-4 py-2 rounded-full shadow-sm text-primary">
          {unswipedDests.length - currentIndex} Left
        </div>
      </div>
      
      <div className="flex-1 relative flex items-center justify-center mb-28 w-full max-w-sm mx-auto z-10">
        <motion.div 
          className="absolute w-full h-[65dvh] rounded-[32px] overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing bg-card border-4 border-card"
          style={{ x, rotate, opacity }}
          animate={dragControls}
          drag
          dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
          onDragEnd={onDragEnd}
          whileTap={{ scale: 0.98 }}
        >
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${bgImgUrl})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10" />
          
          {/* Like Overlay */}
          <motion.div style={{ opacity: likeOpacity }} className="absolute top-10 right-10 z-20 transform rotate-12">
            <div className="border-4 border-secondary text-secondary text-4xl font-black uppercase tracking-widest px-4 py-1 rounded-xl shadow-xl bg-background/20 backdrop-blur-sm">
              LIKE
            </div>
          </motion.div>
          
          {/* Dislike Overlay */}
          <motion.div style={{ opacity: dislikeOpacity }} className="absolute top-10 left-10 z-20 transform -rotate-12">
            <div className="border-4 border-destructive text-destructive text-4xl font-black uppercase tracking-widest px-4 py-1 rounded-xl shadow-xl bg-background/20 backdrop-blur-sm">
              NOPE
            </div>
          </motion.div>
          
          <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
            <h2 className="text-4xl font-black mb-2 drop-shadow-lg leading-none">{activeDest.name}</h2>
            <div className="flex items-center gap-2 text-white/90 mb-5 font-bold text-lg drop-shadow-md">
              <MapPin size={18} />
              {activeDest.country}
            </div>
            
            <p className="text-sm text-white/90 line-clamp-3 mb-5 leading-relaxed font-medium drop-shadow">{activeDest.description}</p>
            
            <div className="flex flex-wrap gap-2">
              {activeDest.tags.map(tag => (
                <span key={tag} className="px-3 py-1.5 bg-white/20 backdrop-blur-md rounded-lg text-xs font-black uppercase tracking-wide border border-white/30">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      <div className="fixed bottom-8 left-0 right-0 flex justify-center items-center gap-6 px-4 z-20">
        <button 
          onClick={() => handleSwipe("left")}
          className="w-16 h-16 bg-white border border-border/20 rounded-full flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all text-destructive"
        >
          <X size={32} className="stroke-[4]" />
        </button>
        <button 
          onClick={() => handleSwipe("up")}
          className="w-14 h-14 bg-white border border-border/20 rounded-full flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all text-primary"
        >
          <Star size={24} className="stroke-[4] fill-primary" />
        </button>
        <button 
          onClick={() => handleSwipe("right")}
          className="w-20 h-20 bg-white border border-border/20 rounded-full flex items-center justify-center shadow-2xl shadow-secondary/30 hover:scale-110 active:scale-95 transition-all text-secondary"
        >
          <Heart size={40} className="stroke-[3] fill-secondary" />
        </button>
      </div>
    </Layout>
  );
}
