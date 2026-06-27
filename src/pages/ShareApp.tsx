import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { 
  Briefcase, GraduationCap, Calendar, CheckCircle2, 
  ExternalLink, Sparkles, AlertCircle 
} from 'lucide-react';
import { format } from 'date-fns';

type Application = {
  title: string;
  organization: string;
  type: 'job' | 'scholarship';
  status: 'Saved' | 'Applied' | 'Interviewing' | 'Offer' | 'Accepted' | 'Rejected';
  date: string;
  url?: string;
  notes?: string;
};

export default function ShareApp() {
  const { id } = useParams<{ id: string }>();
  const [app, setApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchApp = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'applications', id);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setApp(snap.data() as Application);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error('Error fetching shared application:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchApp();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background text-muted-foreground font-sans">
        <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin mb-4" />
        <p className="text-sm font-semibold tracking-wide uppercase">Retrieving Application details...</p>
      </div>
    );
  }

  if (error || !app) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background text-muted-foreground font-sans px-6 text-center">
        <div className="p-3 bg-red-500/10 text-red-500 rounded-full border border-red-500/20 mb-4 animate-bounce">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Application Not Found</h2>
        <p className="text-xs text-muted-foreground mt-1.5 max-w-xs">
          This link may have expired, been deleted, or is temporarily unavailable.
        </p>
        <Link 
          to="/login" 
          className="mt-6 inline-flex h-9 items-center justify-center rounded-full bg-primary px-6 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-lg hover:bg-primary/95 transition-all"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  const statusColors = {
    Saved: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    Applied: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    Interviewing: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    Offer: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    Accepted: 'bg-green-500/10 text-green-400 border-green-500/20',
    Rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-background p-6 font-sans antialiased selection:bg-teal-500 selection:text-white">
      {/* Background accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md bg-card/60 backdrop-blur-xl border border-border/80 rounded-3xl shadow-2xl overflow-hidden relative animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Glow Accent Top */}
        <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

        <div className="p-6 sm:p-8 flex flex-col gap-6">
          {/* Logo & Header */}
          <div className="flex items-center gap-2.5 justify-center">
            <div className="p-1.5 bg-primary/10 text-primary rounded-xl border border-primary/20">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            <span className="text-xs font-black uppercase tracking-widest bg-gradient-to-r from-amber-500 to-yellow-400 bg-clip-text text-transparent">
              GOTH Shared Tracker
            </span>
          </div>

          {/* Org details Card */}
          <div className="text-center space-y-1">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-3 shadow-inner">
              {app.type === 'job' ? <Briefcase className="h-6 w-6" /> : <GraduationCap className="h-6 w-6" />}
            </div>
            <h1 className="text-xl font-extrabold text-foreground tracking-tight">{app.title}</h1>
            <p className="text-sm font-semibold text-muted-foreground">{app.organization}</p>
          </div>

          {/* Details list */}
          <div className="space-y-3.5 border-t border-b border-border/40 py-5 my-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">Type</span>
              <span className="font-bold text-foreground capitalize bg-muted px-2.5 py-1 rounded-lg border border-border/40">
                {app.type}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">Current Status</span>
              <span className={`font-bold px-2.5 py-1 rounded-lg border uppercase text-[10px] tracking-wide ${statusColors[app.status]}`}>
                {app.status}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">Date Applied</span>
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                {format(new Date(app.date), 'MMMM d, yyyy')}
              </span>
            </div>

            {app.url && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">Source Listing</span>
                <a 
                  href={app.url} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="font-bold text-primary hover:underline flex items-center gap-1"
                >
                  View Listing <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>

          {/* Notes section */}
          {app.notes && (
            <div className="space-y-1.5">
              <span className="text-2xs font-extrabold text-muted-foreground/80 uppercase tracking-widest block">Notes</span>
              <div className="text-xs text-muted-foreground leading-relaxed bg-muted/40 p-4 rounded-2xl border border-border/40">
                {app.notes}
              </div>
            </div>
          )}

          {/* Footer Promo button */}
          <div className="text-center pt-2">
            <Link 
              to="/login"
              className="inline-flex w-full h-10 items-center justify-center rounded-full bg-foreground text-background font-bold text-xs uppercase tracking-wide transition-all duration-200 hover:opacity-90 active:scale-98 shadow-md"
            >
              Sign up on GOTH Tracker
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
