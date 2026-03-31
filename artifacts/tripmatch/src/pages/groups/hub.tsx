import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useSession } from "@/hooks/use-session";
import { useGetGroup, useJoinGroup, getGetGroupQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Layout } from "@/components/layout";
import { Copy, Users, Settings, Play, Map, CheckCircle2, Loader2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function GroupHub() {
  const [, params] = useRoute("/groups/:id");
  const groupId = parseInt(params?.id || "0");
  const { session } = useSession();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [inviteCode, setInviteCode] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: group, isLoading } = useGetGroup(groupId, {
    query: { enabled: !!groupId && !!session }
  });

  const joinGroup = useJoinGroup();

  const isMember = group?.members?.some(m => m.userId === session?.id);
  const me = group?.members?.find(m => m.userId === session?.id);

  const handleCopyLink = () => {
    if (!group) return;
    const url = `${window.location.origin}/groups/${group.id}?code=${group.inviteCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast({ title: "Invite link copied to clipboard!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoin = () => {
    if (!session) return;
    joinGroup.mutate({
      id: groupId,
      data: { inviteCode: inviteCode || group?.inviteCode || "", userId: session.id }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetGroupQueryKey(groupId) });
        toast({ title: "Joined group successfully!" });
      }
    });
  };

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const code = search.get("code");
    if (code) setInviteCode(code);
  }, []);

  if (isLoading) return <Layout><div className="flex justify-center p-12 mt-20"><Loader2 className="animate-spin text-primary h-10 w-10" /></div></Layout>;
  if (!group) return <Layout><div className="text-center py-20 text-xl font-bold">Group not found</div></Layout>;

  if (!isMember) {
    return (
      <Layout>
        <div className="py-16 text-center max-w-sm mx-auto">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
            <Users className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-4xl font-black mb-3">{group.name}</h1>
          <p className="text-muted-foreground mb-10 text-lg">You've been invited to join this trip!</p>
          
          <Button 
            size="lg" 
            className="w-full h-14 text-lg rounded-2xl font-bold shadow-lg shadow-primary/20 active:scale-95 transition-transform"
            onClick={handleJoin}
            disabled={joinGroup.isPending}
          >
            {joinGroup.isPending ? "Joining..." : "Join Trip"}
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="py-6">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-black tracking-tight">{group.name}</h1>
            <p className="text-muted-foreground mt-2 text-lg">{group.description || "Let's plan something epic."}</p>
          </div>
          <div className="bg-primary/10 text-primary px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm">
            {group.status}
          </div>
        </div>

        {!me?.hasCompletedPreferences && group.status !== "matched" && group.status !== "planning" && (
          <Card className="p-6 rounded-[24px] bg-primary text-primary-foreground border-none mb-8 shadow-xl shadow-primary/20">
            <h3 className="font-black text-2xl mb-2 flex items-center gap-2"><Settings size={24} /> Step 1: Vibe Check</h3>
            <p className="text-primary-foreground/90 mb-6 text-base font-medium">Tell us your budget, preferred climate, and vibe so we can find matches.</p>
            <Button 
              variant="secondary" 
              className="w-full h-14 rounded-2xl text-secondary-foreground font-black text-lg active:scale-95 transition-transform shadow-lg"
              onClick={() => setLocation(`/groups/${group.id}/preferences`)}
            >
              Set Preferences
            </Button>
          </Card>
        )}

        {me?.hasCompletedPreferences && group.status === "swiping" && (
          <Card className="p-6 rounded-[24px] bg-secondary text-secondary-foreground border-none mb-8 shadow-xl shadow-secondary/20">
            <h3 className="font-black text-2xl mb-2 flex items-center gap-2"><Play size={24} className="fill-current" /> Step 2: Start swiping!</h3>
            <p className="text-secondary-foreground/90 mb-6 text-base font-medium">We've found some spots. Swipe right if you like them.</p>
            <Button 
              variant="default" 
              className="w-full h-14 rounded-2xl bg-white text-secondary hover:bg-white/90 font-black text-lg active:scale-95 transition-transform shadow-lg"
              onClick={() => setLocation(`/groups/${group.id}/swipe`)}
            >
              Start Swiping
            </Button>
          </Card>
        )}

        {(group.status === "matched" || group.status === "planning") && (
          <Card className="p-6 rounded-[24px] bg-accent text-accent-foreground border-none mb-8 shadow-xl shadow-accent/20">
            <h3 className="font-black text-2xl mb-2">We have a match! 🎉</h3>
            <p className="text-accent-foreground/90 mb-6 font-medium">The group has spoken. Check out the results and plan the trip.</p>
            <div className="flex gap-3">
              <Button 
                className="flex-1 h-14 rounded-xl bg-foreground text-background hover:bg-foreground/80 font-black"
                onClick={() => setLocation(`/groups/${group.id}/results`)}
              >
                Results
              </Button>
              <Button 
                className="flex-1 h-14 rounded-xl bg-background/20 text-accent-foreground hover:bg-background/30 font-black border border-accent-foreground/10"
                onClick={() => setLocation(`/groups/${group.id}/plan`)}
              >
                <Map className="mr-2 h-5 w-5" /> Plan
              </Button>
            </div>
          </Card>
        )}

        <div className="mb-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-2xl font-black">Members ({group.members.length})</h2>
            <Button variant="outline" size="sm" onClick={handleCopyLink} className="rounded-xl font-bold border-2 border-border/50 bg-card h-10 px-4">
              {copied ? <Check className="mr-2 h-4 w-4 text-green-500" /> : <Copy className="mr-2 h-4 w-4" />}
              {copied ? "Copied" : "Invite"}
            </Button>
          </div>
          
          <div className="space-y-3">
            {group.members.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-4 bg-card border-2 border-border/30 rounded-[20px] shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center font-black text-primary text-lg border border-primary/20">
                    {member.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-base text-foreground">
                      {member.displayName} {member.userId === session?.id && <span className="text-muted-foreground font-medium text-sm">(You)</span>}
                    </div>
                    <div className="text-sm font-medium text-muted-foreground capitalize flex items-center gap-1.5 mt-0.5">
                      {member.role}
                      {member.hasCompletedPreferences && <CheckCircle2 className="h-4 w-4 text-secondary" />}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-accent-foreground bg-accent/20 px-3 py-1 rounded-lg">
                    {member.swipeCount} <span className="font-bold opacity-80 text-xs">swipes</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </Layout>
  );
}
