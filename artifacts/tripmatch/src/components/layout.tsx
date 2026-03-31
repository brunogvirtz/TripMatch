import { Link } from "wouter";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
  showNav?: boolean;
  className?: string;
}

export function Layout({ children, showNav = true, className }: LayoutProps) {
  const { session, logout } = useSession();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background relative overflow-x-hidden">
      {showNav && (
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-white/80 backdrop-blur-xl">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-md md:max-w-4xl">
            <Link href={session ? "/dashboard" : "/"} className="flex items-center gap-2.5 group">
              <img src="/logo.svg" alt="TripMatch" className="h-8 w-auto group-hover:scale-110 transition-transform" />
              <span className="font-black text-xl tracking-tight text-foreground">
                Trip<span className="text-secondary">Match</span>
              </span>
            </Link>

            {session && (
              <div className="flex items-center gap-4">
                <Link href="/dashboard" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
                  Inicio
                </Link>
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
