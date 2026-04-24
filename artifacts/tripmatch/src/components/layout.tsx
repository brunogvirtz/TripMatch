import { Link } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
  showNav?: boolean;
  className?: string;
}

export function Layout({ children, showNav = true, className }: LayoutProps) {
  const { isAuthenticated, logout } = useAuth();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background relative overflow-x-hidden">
      {showNav && (
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-white/80 backdrop-blur-xl">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-md md:max-w-4xl">
            <Link href={isAuthenticated ? "/dashboard" : "/"} className="flex items-center gap-2.5 group">
              <img src="/logo.svg" alt="TripMatch" className="h-8 w-auto group-hover:scale-110 transition-transform" />
              <span className="font-black text-xl tracking-tight text-foreground">
                Trip<span className="text-secondary">Match</span>
              </span>
            </Link>

            {isAuthenticated && (
              <div className="flex items-center gap-2">
                <Link href="/dashboard" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
                  Inicio
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 rounded-xl text-muted-foreground hover:text-foreground"
                  onClick={() => logout()}
                  title="Cerrar sesión"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </header>
      )}
      <main className={cn("flex-1 container mx-auto px-4 max-w-md md:max-w-4xl py-6 flex flex-col", className)}>
        {children}
      </main>
    </div>
  );
}
