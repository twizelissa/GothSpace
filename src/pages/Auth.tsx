import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { auth, db } from '@/lib/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2, ShieldCheck } from 'lucide-react';

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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div 
      className="relative flex min-h-screen flex-col items-center justify-center bg-[#09090b] text-zinc-100 font-sans selection:bg-amber-500/30 selection:text-amber-400 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/gotham_bg.png')" }}
    >
      
      {/* Dark overlay for optimal card readability */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />

      {/* Centered Minimalist Glassmorphic Login Card */}
      <div className="relative z-10 w-full max-w-sm px-4">
        <div className="glass-card bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-8 shadow-2xl relative overflow-hidden text-center">
          
          {/* Gold Gradient Top Border Accent */}
          <div className="absolute top-0 left-0 w-full h-[2.5px] bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-300" />
          
          {/* Logo & Brand Header */}
          <div className="flex flex-col items-center gap-3.5 mb-8">
            <img src="/logo.svg" alt="ET24 Logo" className="h-16 w-16 rounded-xl shadow-lg shadow-black" />
            <div className="space-y-1">
              <h1 className="text-xl font-bold tracking-widest text-white uppercase">
                ET24
              </h1>
              <p className="text-3xs uppercase tracking-[0.25em] text-zinc-500 font-semibold">
                Gotham Workspace
              </p>
            </div>
          </div>

          {/* Slogan */}
          <p className="text-xs text-zinc-400 mb-8 leading-relaxed font-medium">
            Track habits. Manage cashflow.
          </p>

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
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 py-3.5 text-xs font-bold uppercase tracking-wider text-white transition-all duration-200 hover:bg-zinc-900 hover:border-amber-500/40 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
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
          
          <div className="mt-6 flex items-center justify-center">
            <ShieldCheck className="h-4 w-4 text-emerald-500/80" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
