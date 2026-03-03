import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  signOut: async () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    let subscription: { unsubscribe: () => void } | null = null;
    try {
      const { data } = supabase.auth.onAuthStateChange(
        (event, session) => {
          console.log("Auth state changed - Event:", event, "User:", session?.user?.email);
          setSession(session);
          setUser(session?.user ?? null);
          setIsLoading(false);
        }
      );
      subscription = data.subscription;
    } catch (err) {
      console.warn("Could not set up auth listener (Supabase may be offline):", err);
      setIsLoading(false);
    }

    // THEN check for existing session
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          console.error("Error getting session:", error);
        } else {
          console.log("Initial session check:", session?.user?.email ?? "No user");
          setSession(session);
          setUser(session?.user ?? null);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.warn("Could not check session (Supabase may be offline):", err);
        setIsLoading(false);
      });

    return () => { subscription?.unsubscribe(); };
  }, []);

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Sign out error:", error);
      } else {
        console.log("User signed out successfully");
      }
    } catch (err) {
      console.warn("Error during sign out:", err);
    }
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
