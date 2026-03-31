import { useState } from "react";
import { useLocation } from "wouter";
import { useSession } from "@/hooks/use-session";
import {
  useJoinGroup,
  getListGroupsQueryKey,
  getGetDashboardQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Layout } from "@/components/layout";
import { Ticket } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function JoinGroup() {
  const [, setLocation] = useLocation();
  const { session } = useSession();
  const [code, setCode] = useState("");
  const joinGroup = useJoinGroup();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !session) return;

    let groupId = 0;
    let finalCode = code.trim();
    try {
      if (code.includes("http")) {
        const url = new URL(code);
        const match = url.pathname.match(/\/groups\/(\d+)/);
        if (match) {
          groupId = parseInt(match[1]);
          finalCode = url.searchParams.get("code") || code;
        }
      }
    } catch (err) {
      // ignore
    }

    if (groupId === 0) {
      toast({ title: "Please paste the full invite link", variant: "destructive" });
      return;
    }

    joinGroup.mutate(
      { id: groupId, data: { inviteCode: finalCode, userId: session.id } },
      {
        onSuccess: (group) => {
          queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
          toast({ title: "Joined trip successfully!" });
          setLocation(`/groups/${group.id}`);
        },
        onError: () => {
          toast({ title: "Invalid invite link or code", variant: "destructive" });
        },
      }
    );
  };

  return (
    <Layout>
      <div className="py-6 max-w-sm w-full mx-auto">
        <div className="mb-8">
          <div className="w-16 h-16 bg-secondary/10 rounded-2xl flex items-center justify-center mb-6">
            <Ticket className="text-secondary h-8 w-8 rotate-45" />
          </div>
          <h1 className="text-4xl font-black mb-3">Join Trip</h1>
          <p className="text-muted-foreground text-lg">
            Paste the invite link your friend sent you.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Input
              autoFocus
              placeholder="Paste link here..."
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="h-16 text-lg px-5 rounded-2xl bg-card border-border/50 focus-visible:ring-primary shadow-sm"
            />
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full h-14 text-lg rounded-2xl font-bold shadow-lg shadow-primary/20 active:scale-95 transition-transform"
            disabled={!code.trim() || joinGroup.isPending}
          >
            {joinGroup.isPending ? "Joining..." : "Join Trip"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full mt-3 h-14 rounded-2xl font-bold text-muted-foreground"
            onClick={() => setLocation("/dashboard")}
          >
            Cancel
          </Button>
        </form>
      </div>
    </Layout>
  );
}
