import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Eye, EyeOff, Loader2, Mail, Lock, ArrowRight } from 'lucide-react';

type AuthMode = 'signin' | 'signup';

/* ─── tiny helpers ─────────────────────────────────────────── */
function InputField({
  id, label, type, value, onChange, placeholder, icon: Icon,
  rightEl, autoComplete,
}: {
  id: string; label: string; type: string; value: string;
  onChange: (v: string) => void; placeholder: string;
  icon: React.ElementType; rightEl?: React.ReactNode; autoComplete?: string;
}) {
  return (
    <div className="auth-field">
      <label htmlFor={id} className="auth-label">{label}</label>
      <div className="auth-input-wrap">
        <Icon className="auth-input-icon" />
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
          className="auth-input"
        />
        {rightEl && <div className="auth-input-right">{rightEl}</div>}
      </div>
    </div>
  );
}

function EyeToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className="auth-eye" tabIndex={-1} aria-label="Toggle password">
      {show ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );
}

/* ─── main component ──────────────────────────────────────── */
const Auth = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [animating, setAnimating] = useState(false);

  useEffect(() => { if (user) navigate('/dashboard'); }, [user, navigate]);

  const switchMode = (next: AuthMode) => {
    if (next === mode) return;
    setAnimating(true);
    setTimeout(() => {
      setMode(next);
      setError(null);
      setSuccess(null);
      setPassword('');
      setConfirmPw('');
      setAnimating(false);
    }, 180);
  };

  const handleGoogle = async () => {
    setError(null);
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) setError(error.message);
    setBusy(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (mode === 'signup') {
      if (password !== confirmPw) return setError('Passwords do not match.');
      if (password.length < 6) return setError('Password must be at least 6 characters.');
    }

    setBusy(true);
    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) setError(error.message);
      else {
        setSuccess('✉️ Check your inbox for a confirmation link.');
        setEmail(''); setPassword(''); setConfirmPw('');
      }
    }
    setBusy(false);
  };

  if (loading) {
    return (
      <div className="auth-loading">
        <div className="auth-spinner" />
      </div>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className="auth-root">
        {/* animated background orbs */}
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
        <div className="auth-orb auth-orb-3" />

        <div className="auth-container">
          {/* ── brand ── */}
          <div className="auth-brand">
            <img src="/logo.svg" alt="everyday" className="auth-logo" />
            <span className="auth-brand-name">everyday</span>
          </div>

          {/* ── tagline ── */}
          <p className="auth-tagline">Track finances. Build habits. Live better.</p>

          {/* ── card ── */}
          <div className="auth-card">
            {/* tab switcher */}
            <div className="auth-tabs">
              <div
                className="auth-tab-indicator"
                style={{ transform: mode === 'signup' ? 'translateX(100%)' : 'translateX(0)' }}
              />
              <button
                className={`auth-tab ${mode === 'signin' ? 'auth-tab-active' : ''}`}
                onClick={() => switchMode('signin')}
              >
                Sign In
              </button>
              <button
                className={`auth-tab ${mode === 'signup' ? 'auth-tab-active' : ''}`}
                onClick={() => switchMode('signup')}
              >
                Sign Up
              </button>
            </div>

            {/* form area */}
            <div className={`auth-form-area ${animating ? 'auth-form-exit' : 'auth-form-enter'}`}>
              {/* Google */}
              <button
                type="button"
                onClick={handleGoogle}
                disabled={busy}
                className="auth-google-btn"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              {/* divider */}
              <div className="auth-divider">
                <span className="auth-divider-line" />
                <span className="auth-divider-text">or with email</span>
                <span className="auth-divider-line" />
              </div>

              {/* email / password form */}
              <form onSubmit={handleSubmit} className="auth-form" noValidate>
                <InputField
                  id="auth-email" label="Email" type="email"
                  value={email} onChange={setEmail}
                  placeholder="you@example.com"
                  icon={Mail} autoComplete="email"
                />

                <InputField
                  id="auth-password" label="Password" type={showPw ? 'text' : 'password'}
                  value={password} onChange={setPassword}
                  placeholder="••••••••"
                  icon={Lock}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  rightEl={<EyeToggle show={showPw} onToggle={() => setShowPw((v) => !v)} />}
                />

                {mode === 'signup' && (
                  <div className="auth-field auth-confirm-field">
                    <InputField
                      id="auth-confirm" label="Confirm Password" type={showConfirm ? 'text' : 'password'}
                      value={confirmPw} onChange={setConfirmPw}
                      placeholder="••••••••"
                      icon={Lock}
                      autoComplete="new-password"
                      rightEl={<EyeToggle show={showConfirm} onToggle={() => setShowConfirm((v) => !v)} />}
                    />
                  </div>
                )}

                {/* alerts */}
                {error && <div className="auth-alert auth-alert-error">{error}</div>}
                {success && <div className="auth-alert auth-alert-success">{success}</div>}

                <button type="submit" disabled={busy} className="auth-submit-btn">
                  {busy
                    ? <Loader2 size={18} className="auth-spin" />
                    : <>{mode === 'signin' ? 'Sign In' : 'Create Account'}<ArrowRight size={16} /></>
                  }
                </button>
              </form>

              {/* bottom switch link */}
              <p className="auth-switch">
                {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
                {' '}
                <button
                  type="button"
                  onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
                  className="auth-switch-link"
                >
                  {mode === 'signin' ? 'Sign up free' : 'Sign in'}
                </button>
              </p>
            </div>
          </div>

          <p className="auth-footer">© 2026 everyday · Your privacy matters</p>
        </div>
      </div>
    </>
  );
};

/* ─── scoped styles ────────────────────────────────────────── */
const styles = `
  /* root layout */
  .auth-loading {
    display: flex; align-items: center; justify-content: center;
    min-height: 100dvh; background: hsl(var(--background));
  }
  .auth-spinner {
    width: 36px; height: 36px; border-radius: 50%;
    border: 3px solid hsl(var(--primary) / .2);
    border-top-color: hsl(var(--primary));
    animation: auth-rotate 0.8s linear infinite;
  }

  .auth-root {
    min-height: 100dvh;
    display: flex; align-items: center; justify-content: center;
    padding: 24px 16px;
    position: relative; overflow: hidden;
    background: linear-gradient(135deg,
      hsl(168 60% 96%) 0%,
      hsl(200 60% 96%) 35%,
      hsl(262 60% 96%) 70%,
      hsl(330 60% 96%) 100%);
  }
  @media (prefers-color-scheme: dark) {
    .auth-root {
      background: linear-gradient(135deg,
        hsl(220 20% 7%) 0%, hsl(220 25% 9%) 100%);
    }
  }

  /* animated orbs */
  .auth-orb {
    position: absolute; border-radius: 50%; filter: blur(80px); pointer-events: none;
    animation: auth-float 8s ease-in-out infinite;
  }
  .auth-orb-1 {
    width: 500px; height: 500px; top: -120px; left: -120px;
    background: hsl(168 60% 55% / .18);
    animation-delay: 0s;
  }
  .auth-orb-2 {
    width: 400px; height: 400px; bottom: -80px; right: -80px;
    background: hsl(262 60% 65% / .15);
    animation-delay: 3s;
  }
  .auth-orb-3 {
    width: 300px; height: 300px; top: 40%; left: 60%;
    background: hsl(38 92% 60% / .12);
    animation-delay: 5s;
  }

  /* container */
  .auth-container {
    position: relative; z-index: 10;
    width: 100%; max-width: 420px;
    display: flex; flex-direction: column; align-items: center; gap: 0;
  }

  /* brand */
  .auth-brand {
    display: flex; align-items: center; gap: 10px; margin-bottom: 10px;
  }
  .auth-logo {
    width: 44px; height: 44px; border-radius: 14px;
    box-shadow: 0 4px 20px hsl(168 60% 40% / .35);
  }
  .auth-brand-name {
    font-size: 28px; font-weight: 800; letter-spacing: -0.5px;
    background: linear-gradient(135deg, hsl(168 60% 38%), hsl(200 70% 48%), hsl(262 60% 58%));
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  }

  /* tagline */
  .auth-tagline {
    font-size: 14px; color: hsl(var(--muted-foreground));
    text-align: center; margin-bottom: 14px; line-height: 1.5;
  }



  /* card */
  .auth-card {
    width: 100%;
    background: hsl(var(--card) / .85);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    border: 1px solid hsl(var(--border) / .6);
    border-radius: 24px;
    box-shadow:
      0 2px 8px hsl(0 0% 0% / .04),
      0 16px 48px hsl(0 0% 0% / .08),
      inset 0 1px 0 hsl(0 0% 100% / .6);
    overflow: hidden;
  }

  /* tabs */
  .auth-tabs {
    display: flex; position: relative;
    background: hsl(var(--muted) / .5);
    border-bottom: 1px solid hsl(var(--border) / .5);
    padding: 5px;
    gap: 0;
  }
  .auth-tab-indicator {
    position: absolute; top: 5px; left: 5px;
    width: calc(50% - 5px); height: calc(100% - 10px);
    background: hsl(var(--card));
    border-radius: 10px;
    box-shadow: 0 1px 4px hsl(0 0% 0% / .08);
    transition: transform 0.25s cubic-bezier(.4,0,.2,1);
    pointer-events: none;
  }
  .auth-tab {
    flex: 1; position: relative; z-index: 1;
    padding: 10px 0; font-size: 14px; font-weight: 500;
    border: none; background: transparent; cursor: pointer;
    border-radius: 10px;
    color: hsl(var(--muted-foreground));
    transition: color 0.2s;
  }
  .auth-tab-active { color: hsl(var(--foreground)) !important; }

  /* form area */
  .auth-form-area {
    padding: 24px;
    display: flex; flex-direction: column; gap: 16px;
  }
  @media (min-width: 400px) {
    .auth-form-area { padding: 28px; }
  }
  .auth-form-enter {
    animation: auth-fade-in 0.22s ease forwards;
  }
  .auth-form-exit {
    animation: auth-fade-out 0.18s ease forwards;
    pointer-events: none;
  }

  /* google btn */
  .auth-google-btn {
    width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px;
    height: 46px; border-radius: 12px;
    background: hsl(var(--background));
    border: 1.5px solid hsl(var(--border));
    font-size: 14px; font-weight: 500; color: hsl(var(--foreground));
    cursor: pointer; transition: all 0.18s ease;
    box-shadow: 0 1px 3px hsl(0 0% 0% / .05);
  }
  .auth-google-btn:hover:not(:disabled) {
    border-color: hsl(var(--primary) / .4);
    box-shadow: 0 2px 12px hsl(168 60% 40% / .12);
    transform: translateY(-1px);
  }
  .auth-google-btn:active:not(:disabled) { transform: translateY(0); }
  .auth-google-btn:disabled { opacity: .5; cursor: not-allowed; }

  /* divider */
  .auth-divider {
    display: flex; align-items: center; gap: 12px;
  }
  .auth-divider-line {
    flex: 1; height: 1px; background: hsl(var(--border));
  }
  .auth-divider-text {
    font-size: 12px; color: hsl(var(--muted-foreground)); white-space: nowrap;
  }

  /* form */
  .auth-form {
    display: flex; flex-direction: column; gap: 14px;
  }

  /* fields */
  .auth-field { display: flex; flex-direction: column; gap: 6px; }
  .auth-label {
    font-size: 13px; font-weight: 500; color: hsl(var(--foreground));
  }
  .auth-input-wrap {
    position: relative; display: flex; align-items: center;
  }
  .auth-input-icon {
    position: absolute; left: 13px; width: 16px; height: 16px;
    color: hsl(var(--muted-foreground)); pointer-events: none; flex-shrink: 0;
  }
  .auth-input {
    width: 100%; height: 46px; border-radius: 12px;
    border: 1.5px solid hsl(var(--border));
    background: hsl(var(--background));
    padding: 0 44px 0 40px;
    font-size: 14px; color: hsl(var(--foreground));
    outline: none; transition: all 0.18s ease;
    font-family: inherit;
  }
  .auth-input::placeholder { color: hsl(var(--muted-foreground) / .6); }
  .auth-input:focus {
    border-color: hsl(var(--primary) / .7);
    box-shadow: 0 0 0 3px hsl(var(--primary) / .12);
  }
  .auth-input-right {
    position: absolute; right: 12px;
  }
  .auth-eye {
    display: flex; align-items: center; justify-content: center;
    width: 28px; height: 28px; border-radius: 7px;
    border: none; background: transparent; cursor: pointer;
    color: hsl(var(--muted-foreground));
    transition: color 0.15s, background 0.15s;
  }
  .auth-eye:hover { color: hsl(var(--foreground)); background: hsl(var(--muted)); }

  /* confirm field slide-in */
  .auth-confirm-field {
    animation: auth-slide-in 0.22s cubic-bezier(.4,0,.2,1);
  }

  /* alerts */
  .auth-alert {
    padding: 11px 14px; border-radius: 10px;
    font-size: 13.5px; line-height: 1.5;
  }
  .auth-alert-error {
    background: hsl(0 72% 51% / .08);
    border: 1px solid hsl(0 72% 51% / .2);
    color: hsl(0 65% 45%);
  }
  .auth-alert-success {
    background: hsl(142 60% 40% / .08);
    border: 1px solid hsl(142 60% 40% / .2);
    color: hsl(142 55% 35%);
  }

  /* submit button */
  .auth-submit-btn {
    width: 100%; height: 48px; border-radius: 12px;
    background: linear-gradient(135deg, hsl(168 60% 38%), hsl(168 60% 32%));
    color: #fff; font-size: 14.5px; font-weight: 600;
    border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    transition: all 0.2s ease;
    box-shadow: 0 4px 16px hsl(168 60% 40% / .30);
    margin-top: 2px;
    font-family: inherit;
    letter-spacing: 0.01em;
  }
  .auth-submit-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, hsl(168 60% 42%), hsl(168 60% 36%));
    box-shadow: 0 6px 24px hsl(168 60% 40% / .40);
    transform: translateY(-1px);
  }
  .auth-submit-btn:active:not(:disabled) { transform: translateY(0); }
  .auth-submit-btn:disabled { opacity: .6; cursor: not-allowed; }

  /* switch */
  .auth-switch {
    text-align: center; font-size: 13px; color: hsl(var(--muted-foreground));
    margin-top: 2px;
  }
  .auth-switch-link {
    background: none; border: none; cursor: pointer; padding: 0;
    font-size: 13px; font-weight: 600; color: hsl(var(--primary));
    font-family: inherit;
    text-decoration: underline; text-underline-offset: 2px;
    transition: opacity 0.15s;
  }
  .auth-switch-link:hover { opacity: .75; }

  /* footer */
  .auth-footer {
    margin-top: 20px; font-size: 11.5px;
    color: hsl(var(--muted-foreground) / .7); text-align: center;
  }

  /* animations */
  @keyframes auth-rotate { to { transform: rotate(360deg); } }

  @keyframes auth-float {
    0%, 100% { transform: translate(0,0) scale(1); }
    50%       { transform: translate(20px, -20px) scale(1.05); }
  }

  @keyframes auth-fade-in {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes auth-fade-out {
    from { opacity: 1; transform: translateY(0); }
    to   { opacity: 0; transform: translateY(-6px); }
  }
  @keyframes auth-slide-in {
    from { opacity: 0; transform: translateY(-10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes auth-spin {
    to { transform: rotate(360deg); }
  }
  .auth-spin { animation: auth-spin 0.8s linear infinite; }

  /* dark-mode tweaks via tailwind .dark class */
  .dark .auth-root {
    background: linear-gradient(135deg,
      hsl(220 20% 6%) 0%, hsl(220 25% 9%) 100%);
  }
  .dark .auth-orb-1 { background: hsl(168 60% 45% / .12); }
  .dark .auth-orb-2 { background: hsl(262 60% 55% / .10); }
  .dark .auth-orb-3 { background: hsl(38 80% 55% / .08); }
  .dark .auth-card {
    background: hsl(220 20% 10% / .85);
    box-shadow:
      0 2px 8px hsl(0 0% 0% / .2),
      0 16px 48px hsl(0 0% 0% / .3),
      inset 0 1px 0 hsl(0 0% 100% / .06);
  }

  .dark .auth-alert-error { color: hsl(0 65% 65%); }
  .dark .auth-alert-success { color: hsl(142 55% 60%); }
`;

export default Auth;
