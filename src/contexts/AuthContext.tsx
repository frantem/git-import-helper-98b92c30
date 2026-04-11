import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type AppRole = "buyer" | "seller" | "admin";

// Determine priority role: admin > seller > buyer
const getPriorityRole = (roles: { role: string }[]): AppRole => {
  if (roles.some(r => r.role === 'admin')) return 'admin';
  if (roles.some(r => r.role === 'seller')) return 'seller';
  return 'buyer';
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  isLoading: boolean;
  isSigningOut: boolean;
  signUp: (email: string, password: string, role: AppRole, fullName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    // Set up auth state listener BEFORE checking session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch user roles - use setTimeout to avoid deadlock with RLS
          setTimeout(async () => {
            const { data: roles, error } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", session.user.id);
            
            console.log("Fetched roles:", roles, "Error:", error);
            
            if (roles && roles.length > 0) {
              setRole(getPriorityRole(roles));
            } else {
              // Default to buyer if no role found
              setRole("buyer");
            }
          }, 0);
        } else {
          setRole(null);
        }
        
        setIsLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .then(({ data: roles, error }) => {
            console.log("Initial roles fetch:", roles, "Error:", error);
            if (roles && roles.length > 0) {
              setRole(getPriorityRole(roles));
            } else {
              // Default to buyer if no role found
              setRole("buyer");
            }
            setIsLoading(false);
          });
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, userRole: AppRole, fullName?: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) throw error;

      if (data.user) {
        // Always assign buyer role on sign-up (other roles are granted by admin)
        await supabase.from("user_roles").insert({
          user_id: data.user.id,
          role: "buyer",
        });

        // Update profile with full name if provided
        if (fullName) {
          await supabase.from("profiles").update({
            full_name: fullName,
          }).eq("user_id", data.user.id);
        }
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    try {
      setIsSigningOut(true);
      console.log("Starting sign out...");
      
      // First clear localStorage before calling Supabase API
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log("Cleared localStorage keys:", keysToRemove);
      
      // Try to sign out from Supabase with timeout
      try {
        await Promise.race([
          supabase.auth.signOut(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000))
        ]);
        console.log("Supabase signOut completed");
      } catch (signOutError) {
        console.warn("Supabase signOut failed or timed out:", signOutError);
        // Continue logout even if Supabase doesn't respond
      }
      
      // Clear state
      setUser(null);
      setSession(null);
      setRole(null);
      setIsSigningOut(false);
      
      // Redirect to home
      window.location.href = '/';
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Ошибка при выходе из аккаунта");
      
      // Force clear everything and reload
      setUser(null);
      setSession(null);
      setRole(null);
      setIsSigningOut(false);
      window.location.href = '/';
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?mode=reset`,
      });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        isLoading,
        isSigningOut,
        signUp,
        signIn,
        signOut,
        resetPassword,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
