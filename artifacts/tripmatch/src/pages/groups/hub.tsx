import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useSession } from "@/hooks/use-session";
import {
  useGetGroup,
  useJoinGroup,
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
  Settings,
  Play,
  Map,
  CheckCircle2,
  Loader2,
  Check,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
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

  const { data: group, isLoading, refetch } = useGetGroup(groupId, {
    query: { enabled: !!groupId, queryKey: getGetGroupQueryKey(groupId) },
  });

  const joinGroup = useJoinGroup();

  const isMember = group?.members?.some((m) => m.userId === session?.id);
  const me = group?.members?.find((m) => m.userId === session?.id);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const code = search.get("code");
    if (code) setInviteCode(code);
  }, []);

  // Auto-join if we have a code in the URL and user is not yet a member
  useEffect(() => {
    if (!inviteCode || !session || !group || isMember) return;
    joinGroup.mutate(
      { id: groupId, data: { inviteCode, userId: session.id } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetGroupQueryKey(groupId) });
          queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
          refetch();
          toast({ title: "Joined trip!" });
        },
      }
    );
  }, [inviteCode, session, group, isMember]);

  const handleCopyLink = () => {
    if (!group) return;
    const url = `${window.location.origin}/groups/${group.id}?code=${group.inviteCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast({ title: "Invite link copied!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleManualJoin = () => {
    if (!session || !group) return;
    joinGroup.mutate(
      { id: groupId, data: { inviteCode: inviteCode || group.inviteCode, userId: session.id } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetGroupQueryKey(groupId) });
          queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
          refetch();
          toast({ title: "Joined trip!" });
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
        <div className="text-center py-20 text-xl font-bold">Group not found</div>
      </Layout>
    );
  }

  // Show join screen if not a member
  if (!isMember) {
    return (
      <Layout>
        <div className="py-16 text-center max-w-sm mx-auto">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
            <Users className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-4xl font-black mb-3">{group.name}</h1>
          <p className="text-muted-foreground mb-10 text-lg">
            You've been invited to join this trip!
          </p>
          <Button
            size="lg"
            className="w-full h-14 text-lg rounded-2xl font-bold shadow-lg shadow-primary/20 active:scale-95 transition-transform"
            onClick={handleManualJoin}
            disabled={joinGroup.isPending}
          >
            {joinGroup.isPending ? (
              <><Loader2 className="animate-spin mr-2 h-5 w-5" /> Joining...</>
            ) : (
              "Join Trip"
            )}
          </Button>
          <Button
            variant="ghost"
            className="w-full mt-3 h-14 rounded-2xl font-bold text-muted-foreground"
            onClick={() => setLocation("/dashboard")}
          >
            Go to Dashboard
          </Button>
        </div>
      </Layout>
    );
  }

  const hasMatched = group.status === "matched" || group.status === "planning";
  const mySwipeCount = me?.swipeCount ?? 0;

  return (
    <Layout>
      <div className="py-4">
        {/* Back + header */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-xl p-2 h-9 w-9 text-muted-foreground hover:text-foreground"
            onClick={() => setLocation("/dashboard")}
            data-testid="button-back-dashboard"
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
            {group.status}
          </div>
        </div>

        {/* Match results CTA */}
        {hasMatched && (
          <Card className="p-6 rounded-[24px] bg-accent text-accent-foreground border-none mb-6 shadow-xl shadow-accent/20">
            <h3 className="font-black text-xl mb-1">Match found!</h3>
            <p className="text-accent-foreground/80 mb-5 text-sm font-medium">
              Your group has found a destination.
            </p>
            <div className="flex gap-3">
              <Button
                className="flex-1 h-12 rounded-xl bg-foreground text-background hover:bg-foreground/80 font-black"
                onClick={() => setLocation(`/groups/${group.id}/results`)}
                data-testid="button-view-results"
              >
                See Results
              </Button>
              <Button
                className="flex-1 h-12 rounded-xl bg-background/20 text-accent-foreground hover:bg-background/30 font-black border border-accent-foreground/10"
                onClick={() => setLocation(`/groups/${group.id}/plan`)}
                data-testid="button-view-plan"
              >
                <Map className="mr-2 h-4 w-4" /> Plan
              </Button>
            </div>
          </Card>
        )}

        {/* Step 1: Preferences */}
        {!hasMatched && !me?.hasCompletedPreferences && (
          <Card
            className="p-5 rounded-[24px] border-2 border-primary/20 bg-primary/5 mb-4 cursor-pointer active:scale-[0.99] transition-transform"
            onClick={() => setLocation(`/groups/${group.id}/preferences`)}
            data-testid="card-preferences-step"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-black text-sm shrink-0">
                  1
                </div>
                <div>
                  <div className="font-black text-base">Set Your Preferences</div>
                  <div className="text-muted-foreground text-sm">Budget, vibes, climate — 1 min</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </Card>
        )}

        {!hasMatched && me?.hasCompletedPreferences && (
          <div className="flex items-center gap-3 px-1 mb-4">
            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
            <span className="text-sm font-medium text-muted-foreground">Preferences saved</span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto text-xs h-7 rounded-lg text-muted-foreground hover:text-foreground"
              onClick={() => setLocation(`/groups/${group.id}/preferences`)}
            >
              Edit
            </Button>
          </div>
        )}

        {/* Step 2: Swipe — always visible once you're a member */}
        {!hasMatched && (
          <Card className="p-6 rounded-[24px] bg-primary text-primary-foreground border-none mb-6 shadow-xl shadow-primary/20">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-black text-sm">
                2
              </div>
              <h3 className="font-black text-xl">
                {mySwipeCount > 0 ? "Keep Swiping" : "Start Swiping"}
              </h3>
            </div>
            <p className="text-primary-foreground/80 mb-5 text-sm font-medium">
              {mySwipeCount > 0
                ? `You've swiped ${mySwipeCount} destinations. Keep going to improve the match!`
                : "Swipe on destinations to find what your group agrees on."}
            </p>
            <Button
              variant="secondary"
              className="w-full h-14 rounded-2xl text-secondary-foreground font-black text-lg active:scale-95 transition-transform shadow-lg"
              onClick={() => setLocation(`/groups/${group.id}/swipe`)}
              data-testid="button-start-swiping"
            >
              <Play className="mr-2 h-5 w-5 fill-current" />
              {mySwipeCount > 0 ? "Continue Swiping" : "Start Swiping"}
            </Button>
            {mySwipeCount > 0 && (
              <Button
                variant="ghost"
                className="w-full mt-2 h-10 rounded-xl text-primary-foreground/70 hover:text-primary-foreground hover:bg-white/10 font-semibold text-sm"
                onClick={() => setLocation(`/groups/${group.id}/results`)}
              >
                View Current Results
              </Button>
            )}
          </Card>
        )}

        {/* Members */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black">
              Members ({group.members.length})
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="rounded-xl font-bold border-2 border-border/50 bg-card h-9 px-3 text-xs"
              data-testid="button-copy-invite"
            >
              {copied ? (
                <><Check className="mr-1.5 h-3.5 w-3.5 text-green-500" />Copied</>
              ) : (
                <><Copy className="mr-1.5 h-3.5 w-3.5" />Invite</>
              )}
            </Button>
          </div>

          <div className="space-y-2">
            {group.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 bg-card border border-border/30 rounded-[18px] shadow-sm"
                data-testid={`card-member-${member.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center font-black text-primary text-sm border border-primary/20 shrink-0">
                    {member.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-foreground">
                      {member.displayName}{" "}
                      {member.userId === session?.id && (
                        <span className="text-muted-foreground font-normal text-xs">(You)</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground capitalize flex items-center gap-1 mt-0.5">
                      {member.role}
                      {member.hasCompletedPreferences && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {member.swipeCount > 0 && (
                    <div className="text-xs font-bold text-accent-foreground bg-accent/20 px-2.5 py-1 rounded-lg">
                      {member.swipeCount} swipes
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Invite code display */}
        <div className="bg-muted/50 rounded-2xl p-4 mb-4">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Invite Code
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
              data-testid="button-copy-code"
            >
              {copied ? "Copied!" : "Copy Link"}
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
