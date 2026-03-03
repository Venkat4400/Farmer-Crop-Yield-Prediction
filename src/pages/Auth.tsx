import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sprout, Mail, Lock, User, Loader2, Building } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function Auth() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  // --- Login state ---
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // --- Register state ---
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirm, setRegisterConfirm] = useState("");

  // --- Organization Magic Link state ---
  const [showOrgLogin, setShowOrgLogin] = useState(false);
  const [orgEmail, setOrgEmail] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) navigate("/");
      } catch (err) {
        console.warn("Could not check session (Supabase may be offline):", err);
      }
    };
    checkUser();

    let subscription: { unsubscribe: () => void } | null = null;
    try {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session) navigate("/");
      });
      subscription = data.subscription;
    } catch (err) {
      console.warn("Could not set up auth listener:", err);
    }

    return () => { subscription?.unsubscribe(); };
  }, [navigate]);

  // Helper: try Supabase call, handle network errors gracefully
  const withNetworkCheck = async <T,>(fn: () => Promise<T>): Promise<T | null> => {
    try {
      return await fn();
    } catch (err: any) {
      setIsLoading(false);
      const msg = err?.message || String(err);
      if (msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("fetch")) {
        toast({
          title: "Cannot Connect to Server",
          description: "Your Supabase project may be paused or offline. Go to supabase.com/dashboard → click 'Restore project', wait 2 min, then try again.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Error", description: msg, variant: "destructive" });
      }
      return null;
    }
  };

  // ── Sign In ──────────────────────────────────────────────────────────────
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!loginEmail || !loginPassword) {
      toast({ title: "Missing Information", description: "Please enter email and password.", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    const result = await withNetworkCheck(() =>
      supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword })
    );

    setIsLoading(false);

    if (!result) return; // network error already handled

    if (result.error) {
      let msg = result.error.message;
      if (msg.includes("Invalid login credentials")) msg = "Invalid email or password. Please try again.";
      else if (msg.includes("Email not confirmed")) msg = "Please confirm your email first. Check your inbox for a link.";
      toast({ title: "Login Failed", description: msg, variant: "destructive" });
    } else if (result.data.session) {
      toast({ title: "Welcome Back!", description: "You have successfully logged in." });
      setTimeout(() => navigate("/"), 500);
    }
  };

  // ── Sign Up ──────────────────────────────────────────────────────────────
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!registerEmail || !registerPassword) {
      toast({ title: "Missing Information", description: "Please enter email and password.", variant: "destructive" });
      return;
    }
    if (registerPassword.length < 6) {
      toast({ title: "Password Too Short", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (registerPassword !== registerConfirm) {
      toast({ title: "Passwords Don't Match", description: "Please make sure both passwords are the same.", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    const result = await withNetworkCheck(() =>
      supabase.auth.signUp({
        email: registerEmail,
        password: registerPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/auth?confirmed=true`,
          data: { full_name: registerName },
        },
      })
    );

    setIsLoading(false);

    if (!result) return; // network error already handled

    if (result.error) {
      toast({ title: "Sign Up Failed", description: result.error.message, variant: "destructive" });
    } else if (result.data?.user) {
      if (result.data.session) {
        toast({ title: "Account Created!", description: "Welcome! Redirecting you now..." });
        setTimeout(() => navigate("/"), 1500);
      } else {
        toast({ title: "Account Created!", description: "Check your email to confirm your account. Then log in." });
      }
    }
  };

  // ── Google OAuth ─────────────────────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    setIsLoading(true);

    const result = await withNetworkCheck(() =>
      supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth?confirmed=true` },
      })
    );

    if (!result) return;

    if (result.error) {
      setIsLoading(false);
      toast({ title: "Google Sign In Failed", description: result.error.message, variant: "destructive" });
    }
  };

  // ── Organization Magic Link ───────────────────────────────────────────────
  const handleOrgMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgEmail) return;

    setIsLoading(true);

    const result = await withNetworkCheck(() =>
      supabase.auth.signInWithOtp({
        email: orgEmail,
        options: { emailRedirectTo: `${window.location.origin}/auth?confirmed=true` },
      })
    );

    setIsLoading(false);

    if (!result) return;

    if (result.error) {
      toast({ title: "Magic Link Failed", description: result.error.message, variant: "destructive" });
    } else {
      setMagicLinkSent(true);
      toast({ title: "Magic Link Sent!", description: `Check ${orgEmail} for your login link.` });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-primary/20">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80">
            <Sprout className="h-8 w-8 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Crop Yield Predictor</CardTitle>
            <CardDescription>Sign in to access ML-powered predictions</CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            {/* ── LOGIN TAB ── */}
            <TabsContent value="login">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" /> Email
                  </Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password" className="flex items-center gap-2">
                    <Lock className="h-4 w-4" /> Password
                  </Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing In...</>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* ── REGISTER TAB ── */}
            <TabsContent value="register">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-name" className="flex items-center gap-2">
                    <User className="h-4 w-4" /> Full Name
                  </Label>
                  <Input
                    id="register-name"
                    type="text"
                    placeholder="John Doe"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" /> Email
                  </Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="you@example.com"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-password" className="flex items-center gap-2">
                    <Lock className="h-4 w-4" /> Password
                  </Label>
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="Min. 6 characters"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-confirm" className="flex items-center gap-2">
                    <Lock className="h-4 w-4" /> Confirm Password
                  </Label>
                  <Input
                    id="register-confirm"
                    type="password"
                    placeholder="Repeat your password"
                    value={registerConfirm}
                    onChange={(e) => setRegisterConfirm(e.target.value)}
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Account...</>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {/* ── DIVIDER ── */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          {/* ── GUEST BUTTON ── */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate("/predict")}
          >
            <User className="mr-2 h-4 w-4" />
            Continue as Guest
          </Button>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
