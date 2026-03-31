import { useState, useEffect } from "react";

export interface UserSession {
  id: number;
  username: string;
  displayName: string;
}

export function useSession() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("tripmatch_user");
    if (stored) {
      try {
        setSession(JSON.parse(stored));
      } catch (e) {
        localStorage.removeItem("tripmatch_user");
      }
    }
    setIsLoaded(true);
  }, []);

  const login = (user: UserSession) => {
    localStorage.setItem("tripmatch_user", JSON.stringify(user));
    setSession(user);
  };

  const logout = () => {
    localStorage.removeItem("tripmatch_user");
    setSession(null);
  };

  return { session, login, logout, isLoaded };
}
