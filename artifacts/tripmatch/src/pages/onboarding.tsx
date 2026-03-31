import { useState } from "react";
import { useLocation } from "wouter";
import { useSession } from "@/hooks/use-session";
import { useCreateUser } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Layout } from "@/components/layout";

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { login } = useSession();
  const [name, setName] = useState("");
  const createUser = useCreateUser();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    const username = `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Math.floor(Math.random() * 10000)}`;
    
    createUser.mutate({
      data: {
        displayName: name.trim(),
        username
      }
    }, {
      onSuccess: (user) => {
        login({ id: user.id, username: user.username, displayName: user.displayName });
        setLocation("/dashboard");
      }
    });
  };

  return (
    <Layout>
      <div className="flex flex-col flex-1 justify-center max-w-sm w-full mx-auto pb-32">
        <div className="text-left">
          <h1 className="text-4xl font-black mb-3">What's your name?</h1>
          <p className="text-muted-foreground mb-10 text-lg">This is how your friends will see you in the app.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input 
            autoFocus
            placeholder="Your name" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            className="h-16 text-xl px-6 rounded-2xl bg-card border-border/50 shadow-sm focus-visible:ring-primary focus-visible:border-primary"
          />
          <Button 
            type="submit" 
            size="lg" 
            className="w-full h-14 text-lg rounded-2xl shadow-lg transition-transform active:scale-95 font-bold"
            disabled={!name.trim() || createUser.isPending}
          >
            {createUser.isPending ? "Creating..." : "Continue"}
          </Button>
        </form>
      </div>
    </Layout>
  );
}
