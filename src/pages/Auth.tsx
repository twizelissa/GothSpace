import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { auth, db } from '@/lib/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Sparkles, TrendingUp, Target, ShieldCheck, 
  Loader2, ArrowRight, CheckCircle2, Moon, Sun 
} from 'lucide-react';

const Auth = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleGoogle = async () => {
    setError(null);
    setBusy(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Auto-create profile in Firestore if it doesn't exist yet
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (!userDocSnap.exists()) {
        await setDoc(userDocRef, {
          display_name: user.displayName || user.email?.split('@')[0] || 'User',
          email: user.email,
          avatar_url: user.photoURL || '',
          role: 'user',
          created_at: serverTimestamp()
        });
      }
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to sign in with Google.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const features = [
    {
      icon: Target,
      color: 'text-purple-500 bg-purple-500/10',
      title: 'Monthly Habit Spreadsheet',
      desc: 'Spreadsheet-style grids grouped by week for a clean, spreadsheet-first visualization workflow.',
    },
    {
      icon: Sparkles,
      color: 'text-amber-500 bg-amber-500/10',
      title: 'Mindset & Energy Logger',
      desc: 'Log Mood, Energy, Focus, and Motivation daily. Rate 1-10 with direct gradient-mapped cells.',
    },
    {
      icon: TrendingUp,
      color: 'text-emerald-500 bg-emerald-500/10',
      title: 'Dual-Trend Analytics',
      desc: 'Automatically plots splined charts comparing your habit streak profiles with mindset correlations.',
    },
    {
      icon: ShieldCheck,
      color: 'text-blue-500 bg-blue-500/10',
      title: 'Cashflow & Ledger Management',
      desc: 'Track income, expense category limits, and monthly balance totals seamlessly in one ledger.',
    },
  ];

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-8 sm:px-6 md:grid md:max-w-none md:grid-cols-12 md:px-0">
      
      {/* Dynamic Background Blurs */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-[10%] -top-[10%] h-[50%] w-[50%] rounded-full bg-primary/10 blur-[120px] dark:bg-primary/5" />
        <div className="absolute -right-[10%] -bottom-[10%] h-[50%] w-[50%] rounded-full bg-purple-500/10 blur-[120px] dark:bg-purple-500/5" />
      </div>

      {/* LEFT COLUMN: Features & Motivation Pitch */}
      <div className="relative hidden h-full flex-col bg-muted/30 p-10 text-white dark:bg-zinc-950/20 md:col-span-7 md:flex md:border-r border-border/50 justify-between">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="ET24 Logo" className="h-10 w-10 rounded-xl shadow-md shadow-primary/20" />
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-orange-400 via-rose-400 to-purple-400 bg-clip-text text-transparent">
            ET24
          </span>
        </div>

        {/* Feature Cards List */}
        <div className="my-auto max-w-lg space-y-6">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Introducing Version 2.0
            </span>
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground lg:text-5xl">
              Build systems.<br/>Not just habits.
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Stop waiting for a personality change. Start building a system change. Monitor your routines, energy metrics, and finances inside one integrated workspace.
            </p>
          </div>

          <div className="grid gap-4 mt-8">
            {features.map((feat) => {
              const Icon = feat.icon;
              return (
                <div 
                  key={feat.title} 
                  className="group flex gap-4 rounded-xl border border-border/40 bg-card/40 p-4 transition-all duration-300 hover:bg-card/80 hover:border-border/80 hover:shadow-sm"
                >
                  <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${feat.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground transition-colors group-hover:text-primary">{feat.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{feat.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Slogan */}
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary" /> Completely secure · Powered by Google & Firebase Auth
        </div>
      </div>

      {/* RIGHT COLUMN: The Auth/Sign-in Action */}
      <div className="flex w-full flex-col justify-center md:col-span-5 md:p-8 lg:p-12">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 max-w-sm sm:max-w-md">
          
          {/* Logo only for mobile header */}
          <div className="flex flex-col items-center gap-2 text-center md:hidden mb-4">
            <img src="/logo.svg" alt="ET24 Logo" className="h-14 w-14 rounded-2xl shadow-lg shadow-primary/20" />
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-orange-400 via-rose-400 to-purple-400 bg-clip-text text-transparent">
              ET24
            </h1>
            <p className="text-xs text-muted-foreground px-4">
              Track habits, monitor daily energy index, and log transaction ledgers.
            </p>
          </div>

          {/* Login Card */}
          <div className="glass-card rounded-2xl border border-border/80 p-6 sm:p-8 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-orange-400 via-rose-400 to-purple-400" />
            
            <div className="flex flex-col space-y-2 text-center mb-8">
              <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Welcome to ET24
              </h2>
              <p className="text-xs text-muted-foreground">
                Sign in to sync your habits, mindset ratings, and ledgers across devices.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive text-center">
                {error}
              </div>
            )}

            {/* Main Action Google Button */}
            <button
              onClick={handleGoogle}
              disabled={busy}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-background py-3.5 text-sm font-semibold text-foreground shadow-sm transition-all duration-200 hover:bg-muted/50 hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" className="flex-shrink-0" aria-hidden>
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              <span>Continue with Google</span>
            </button>
            
            <div className="mt-6 flex flex-col items-center gap-1.5 text-center text-3xs text-muted-foreground leading-relaxed">
              <span>By continuing, you agree to start managing yourself.</span>
              <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-emerald-500" /> Secure SSL Encryption Enabled</span>
            </div>
          </div>

          <p className="text-center text-3xs text-muted-foreground md:hidden mt-4">
            © 2026 ET24 · All rights reserved
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
