import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { auth, db } from '@/lib/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Sparkles, TrendingUp, Target, ShieldCheck, 
  Loader2, ArrowRight, CheckCircle2, Lock 
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
      <div className="flex min-h-screen items-center justify-center bg-[#09090b]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  const features = [
    {
      icon: Target,
      title: 'Habit Spreadsheets',
      desc: 'Track logs across monthly grid views. Grouped dynamically by color-coded weeks.',
    },
    {
      icon: Sparkles,
      title: 'Mindset Logs',
      desc: 'Record mood, energy, focus, and motivation to identify your daily performance trends.',
    },
    {
      icon: TrendingUp,
      title: 'Performance Analytics',
      desc: 'Compare daily completion scores against mindset metrics using integrated line charts.',
    },
    {
      icon: ShieldCheck,
      title: 'Cashflow Ledgers',
      desc: 'Log income and expenses dynamically. Keep your monthly balances and categories organized.',
    },
  ];

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#09090b] text-zinc-100 overflow-hidden font-sans selection:bg-emerald-500/30 selection:text-emerald-400">
      
      {/* Premium Minimalist Grid Background */}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-6xl px-4 py-8 md:grid md:grid-cols-12 md:gap-8 md:px-8">
        
        {/* LEFT COLUMN: Clean Features & Branding */}
        <div className="flex flex-col justify-between md:col-span-7 pr-6 py-4">
          
          {/* Brand */}
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="ET24 Logo" className="h-9 w-9 rounded-lg" />
            <span className="text-lg font-bold tracking-tight text-white uppercase letter-spacing-1">
              ET24
            </span>
          </div>

          {/* Slogan and Features */}
          <div className="my-auto max-w-lg space-y-8 mt-12 md:mt-0">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/5 px-3 py-1 text-2xs font-semibold uppercase tracking-wider text-emerald-400">
                System Version 2.0
              </span>
              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl leading-[1.1]">
                Track routines.<br/>Measure progress.<br/>Manage cashflow.
              </h1>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Build a consistent system. An integrated tracking dashboard designed for monthly habits, mental state logs, and personal ledger management.
              </p>
            </div>

            {/* Clean Feature List */}
            <div className="grid gap-4">
              {features.map((feat) => {
                const Icon = feat.icon;
                return (
                  <div 
                    key={feat.title} 
                    className="flex gap-4 rounded-xl border border-zinc-800/40 bg-zinc-900/10 p-4 transition-all duration-300 hover:bg-zinc-900/30 hover:border-zinc-800/80"
                  >
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-emerald-400">
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">{feat.title}</h3>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{feat.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Secure SSL Tag */}
          <div className="hidden md:flex items-center gap-2 text-2xs text-zinc-500 uppercase tracking-widest mt-6">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Client-Side Encryption Enabled
          </div>
        </div>

        {/* RIGHT COLUMN: Minimalist Login Card */}
        <div className="flex w-full flex-col justify-center mt-12 md:col-span-5 md:mt-0">
          <div className="mx-auto w-full max-w-md bg-zinc-950/70 border border-zinc-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl relative">
            
            {/* Emerald Gradient Top Border Accent */}
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-emerald-600 to-teal-400" />
            
            <div className="flex flex-col space-y-2 text-center mb-8">
              <h2 className="text-lg font-bold text-white uppercase tracking-wider">
                Access Dashboard
              </h2>
              <p className="text-xs text-zinc-400">
                Authenticate securely using Google to sync your journals and balances.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400 text-center">
                {error}
              </div>
            )}

            {/* Google Login Action Button */}
            <button
              onClick={handleGoogle}
              disabled={busy}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 py-3.5 text-xs font-bold uppercase tracking-wider text-white transition-all duration-200 hover:bg-zinc-900 hover:border-emerald-500/40 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" className="flex-shrink-0" aria-hidden>
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              <span>Continue with Google</span>
            </button>
            
            <div className="mt-8 flex flex-col items-center gap-1.5 text-center text-3xs text-zinc-500 uppercase tracking-widest leading-relaxed">
              <span>Secure, direct authentication.</span>
              <span className="flex items-center gap-1">No email or passwords required</span>
            </div>
          </div>
          
          {/* Mobile Footer */}
          <p className="text-center text-3xs text-zinc-600 uppercase tracking-widest mt-8 md:hidden">
            © 2026 ET24 · SSL Secured
          </p>
        </div>

      </div>
    </div>
  );
};

export default Auth;
