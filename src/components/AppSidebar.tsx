import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Wallet, Target, Shield, LogOut, Settings, 
  Moon, Sun, Mail, MessageSquare, Briefcase 
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { updateProfile } from 'firebase/auth';
import { toast } from 'sonner';
import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, 
  DialogTitle, DialogTrigger, DialogFooter 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

const AppSidebar = () => {
  const { pathname } = useLocation();
  const { isAdmin, signOut, user } = useAuth();
  const { theme, setTheme } = useTheme();

  // Settings State
  const [isOpen, setIsOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [reminderEmail, setReminderEmail] = useState('');
  const [reminderPhone, setReminderPhone] = useState('');
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('20:00');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const loadSettings = async () => {
      try {
        const userRef = doc(db, 'users', user.id);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          setDisplayName(data.display_name || user.displayName || '');
          setReminderEmail(data.reminder_email || user.email || '');
          setReminderPhone(data.reminder_phone || '');
          setEmailEnabled(data.email_enabled || false);
          setWhatsappEnabled(data.whatsapp_enabled || false);
          setBrowserNotificationsEnabled(data.browser_notifications_enabled || false);
          setReminderTime(data.reminder_time || '20:00');
        } else {
          setDisplayName(user.displayName || '');
          setReminderEmail(user.email || '');
        }
      } catch (err) {
        console.error('Error loading settings from Firestore:', err);
      }
    };
    if (isOpen) {
      loadSettings();
    }
  }, [user, isOpen]);

  const handleBrowserNotificationToggle = async (checked: boolean) => {
    setBrowserNotificationsEnabled(checked);
    if (checked) {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          toast.success('Browser notification permission granted.');
        } else if (permission === 'denied') {
          toast.error('Permission denied. Please enable notifications in your browser settings.');
          setBrowserNotificationsEnabled(false);
        }
      } else {
        toast.error('This browser does not support desktop push notifications.');
        setBrowserNotificationsEnabled(false);
      }
    }
  };

  const sendTestNotification = () => {
    if (!('Notification' in window)) {
      toast.error('This browser does not support desktop notifications.');
      return;
    }
    if (Notification.permission === 'granted') {
      new Notification('GOTH Habit Reminder', {
        body: 'Success! Your browser push notifications are active and ready.',
        icon: '/logo.svg'
      });
      toast.success('Test notification sent!');
    } else {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification('GOTH Habit Reminder', {
            body: 'Success! Your browser push notifications are active and ready.',
            icon: '/logo.svg'
          });
          toast.success('Test notification sent!');
        } else {
          toast.error('Notification permission is required to send test alerts.');
        }
      });
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const userRef = doc(db, 'users', user!.id);
      await setDoc(userRef, {
        display_name: displayName.trim(),
        reminder_email: reminderEmail.trim(),
        reminder_phone: reminderPhone.trim(),
        email_enabled: emailEnabled,
        whatsapp_enabled: whatsappEnabled,
        browser_notifications_enabled: browserNotificationsEnabled,
        reminder_time: reminderTime,
      }, { merge: true });

      // Try updating display name on Firebase Auth client
      try {
        if (auth.currentUser) {
          await updateProfile(auth.currentUser, {
            displayName: displayName.trim()
          });
        }
      } catch (authErr) {
        console.warn('Auth profile display name sync skipped:', authErr);
      }

      toast.success('Profile settings saved successfully!');
      setIsOpen(false);
    } catch (err) {
      console.error('Error saving settings to Firestore:', err);
      toast.error('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const links = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/finances', icon: Wallet, label: 'Finances' },
    { to: '/habits', icon: Target, label: 'Habits' },
    { to: '/applications', icon: Briefcase, label: 'Applications' },
    ...(isAdmin ? [{ to: '/admin', icon: Shield, label: 'Admin' }] : []),
  ];

  return (
    <>
      <aside className="hidden md:flex h-screen w-64 flex-col border-r border-border bg-card">
      <div className="flex h-16 items-center gap-3 px-6">
        <img src="/logo.svg" alt="GOTH logo" className="h-8 w-8 rounded-lg shadow-sm" />
        <h1 className="text-sm font-bold bg-gradient-to-r from-amber-500 to-yellow-400 bg-clip-text text-transparent tracking-widest uppercase">
          GOTH
        </h1>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {links.map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            to={to}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              pathname === to
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>

      {/* USER PROFILE & SETTINGS WIDGET */}
      <div className="border-t border-border p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground shadow-sm">
              {displayName?.[0] || user?.email?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">
                {displayName || user?.displayName || user?.email?.split('@')[0]}
              </p>
              <p className="text-3xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
              >
                <Settings className="h-4.5 w-4.5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md bg-card/95 backdrop-blur-xl border border-border/80 shadow-2xl rounded-3xl p-6 overflow-hidden">
              {/* Premium Top Border Accent */}
              <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-teal-500 via-emerald-400 to-cyan-400" />
              
              <DialogHeader className="pb-3 border-b border-border/40">
                <DialogTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
                  <div className="p-1 rounded-lg bg-primary/10 text-primary shadow-inner">
                    <Settings className="h-4.5 w-4.5 animate-spin-slow" />
                  </div>
                  Profile & Reminder Settings
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-1">
                  Configure display settings, daily reminders, and light/dark theme layout mode.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4 select-none max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
                {/* Theme Mode Toggle Card */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl border border-border/40 bg-muted/20 hover:bg-muted/30 transition-all duration-200">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold text-foreground">Theme Mode</Label>
                    <p className="text-[10px] text-muted-foreground">Toggle between dark and light themes</p>
                  </div>
                  <Button 
                    type="button"
                    variant="outline" 
                    size="sm" 
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="gap-2 shadow-sm rounded-xl border-border/60 hover:bg-muted font-bold text-xs"
                  >
                    {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-500 animate-pulse" /> : <Moon className="h-4 w-4 text-indigo-400" />}
                    {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                  </Button>
                </div>

                {/* Name Edit Card */}
                <div className="space-y-2 p-3.5 rounded-2xl border border-border/40 bg-muted/20 hover:bg-muted/30 transition-all duration-200">
                  <Label htmlFor="display-name" className="text-2xs font-extrabold text-muted-foreground/80 uppercase tracking-wider block">Display Name</Label>
                  <Input 
                    id="display-name" 
                    placeholder="Your Name" 
                    value={displayName} 
                    onChange={e => setDisplayName(e.target.value)} 
                    className="h-9 shadow-sm rounded-xl bg-background/50 border-border/50 focus:border-primary/50 text-xs"
                  />
                </div>

                {/* Browser Push Notifications Card */}
                <div className={`p-3.5 rounded-2xl border transition-all duration-300 ${
                  browserNotificationsEnabled 
                    ? 'border-purple-500/30 bg-purple-500/5 shadow-sm shadow-purple-500/5' 
                    : 'border-border/40 bg-muted/20 hover:bg-muted/30'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold flex items-center gap-1.5">
                        <Target className={`h-4 w-4 text-purple-500 ${browserNotificationsEnabled ? 'animate-pulse' : ''}`} />
                        Browser Push Alerts
                      </Label>
                      <p className="text-[10px] text-muted-foreground">Receive daily habit prompts</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleBrowserNotificationToggle(!browserNotificationsEnabled)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none ${
                        browserNotificationsEnabled ? 'bg-purple-600' : 'bg-muted border border-border'
                      }`}
                    >
                      <span
                        className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                          browserNotificationsEnabled ? 'translate-x-4.5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                  {browserNotificationsEnabled && (
                    <div className="grid grid-cols-3 gap-2 mt-3.5 pt-3.5 border-t border-purple-500/10 items-center animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="col-span-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={sendTestNotification}
                          className="w-full text-xs h-8.5 font-bold gap-1.5 shadow-sm rounded-xl border-purple-500/20 text-purple-400 hover:bg-purple-500 hover:text-white hover:border-transparent transition-all duration-200"
                        >
                          Send Test Alert
                        </Button>
                      </div>
                      <div>
                        <Input 
                          value={reminderTime} 
                          onChange={e => setReminderTime(e.target.value)} 
                          type="time"
                          className="h-8.5 text-xs shadow-sm rounded-xl bg-background/50 border-purple-500/10 text-center font-semibold"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Email Reminders Card */}
                <div className={`p-3.5 rounded-2xl border transition-all duration-300 ${
                  emailEnabled 
                    ? 'border-indigo-500/30 bg-indigo-500/5 shadow-sm shadow-indigo-500/5' 
                    : 'border-border/40 bg-muted/20 hover:bg-muted/30'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold flex items-center gap-1.5">
                        <Mail className={`h-4 w-4 text-indigo-500 ${emailEnabled ? 'animate-bounce-slow' : ''}`} />
                        Daily Email Updates
                      </Label>
                      <p className="text-[10px] text-muted-foreground">Receive updates in your inbox</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEmailEnabled(!emailEnabled)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none ${
                        emailEnabled ? 'bg-indigo-600' : 'bg-muted border border-border'
                      }`}
                    >
                      <span
                        className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                          emailEnabled ? 'translate-x-4.5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                  {emailEnabled && (
                    <div className="grid grid-cols-3 gap-2 mt-3.5 pt-3.5 border-t border-indigo-500/10 items-center animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="col-span-2">
                        <Input 
                          placeholder="name@email.com" 
                          value={reminderEmail} 
                          onChange={e => setReminderEmail(e.target.value)} 
                          type="email"
                          className="h-8.5 text-xs shadow-sm rounded-xl bg-background/50 border-indigo-500/10"
                        />
                      </div>
                      <div>
                        <Input 
                          value={reminderTime} 
                          onChange={e => setReminderTime(e.target.value)} 
                          type="time"
                          className="h-8.5 text-xs shadow-sm rounded-xl bg-background/50 border-indigo-500/10 text-center font-semibold"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* WhatsApp Reminders Card */}
                <div className={`p-3.5 rounded-2xl border transition-all duration-300 ${
                  whatsappEnabled 
                    ? 'border-emerald-500/30 bg-emerald-500/5 shadow-sm shadow-emerald-500/5' 
                    : 'border-border/40 bg-muted/20 hover:bg-muted/30'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold flex items-center gap-1.5">
                        <MessageSquare className={`h-4 w-4 text-emerald-500 ${whatsappEnabled ? 'animate-pulse' : ''}`} />
                        WhatsApp Prompts
                      </Label>
                      <p className="text-[10px] text-muted-foreground">Receive logs directly on phone</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setWhatsappEnabled(!whatsappEnabled)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none ${
                        whatsappEnabled ? 'bg-emerald-600' : 'bg-muted border border-border'
                      }`}
                    >
                      <span
                        className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                          whatsappEnabled ? 'translate-x-4.5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                  {whatsappEnabled && (
                    <div className="grid grid-cols-3 gap-2 mt-3.5 pt-3.5 border-t border-emerald-500/10 items-center animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="col-span-2">
                        <Input 
                          placeholder="e.g. +1 555 123 4567" 
                          value={reminderPhone} 
                          onChange={e => setReminderPhone(e.target.value)} 
                          type="tel"
                          className="h-8.5 text-xs shadow-sm rounded-xl bg-background/50 border-emerald-500/10"
                        />
                      </div>
                      <div>
                        <Input 
                          value={reminderTime} 
                          onChange={e => setReminderTime(e.target.value)} 
                          type="time"
                          className="h-8.5 text-xs shadow-sm rounded-xl bg-background/50 border-emerald-500/10 text-center font-semibold"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="border-t border-border/40 pt-4 flex flex-col sm:flex-row gap-2 justify-between items-center w-full">
                <div className="flex w-full sm:w-auto justify-start sm:order-first order-last">
                  <Button 
                    type="button"
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setIsOpen(false);
                      signOut();
                    }}
                    className="w-full sm:w-auto shadow-sm gap-1.5 h-9 font-bold text-xs border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all duration-200 active:scale-95"
                  >
                    <LogOut className="h-4 w-4" /> Sign Out
                  </Button>
                </div>
                <div className="flex gap-2 w-full sm:w-auto justify-end">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="rounded-xl font-semibold text-xs text-muted-foreground hover:text-foreground">Cancel</Button>
                  <Button 
                    type="button" 
                    size="sm" 
                    onClick={saveSettings} 
                    disabled={saving} 
                    className="w-full sm:w-auto text-xs font-bold h-9 px-4 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white rounded-xl shadow-lg hover:shadow-teal-500/20 transition-all duration-200 active:scale-95 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <button
          onClick={signOut}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>

    <div className="flex md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 bg-card/85 backdrop-blur-md border-t border-border/80 px-2 py-1 justify-around items-center select-none shadow-lg animate-in slide-in-from-bottom duration-300">
      {links.map(({ to, icon: Icon, label }) => (
        <Link
          key={to}
          to={to}
          className={cn(
            'flex flex-col items-center justify-center gap-1 rounded-lg py-1 text-3xs font-bold transition-colors flex-1',
            pathname === to
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Icon className="h-4.5 w-4.5" />
          <span className="text-[9px] font-semibold">{label}</span>
        </Link>
      ))}

      {/* Settings Dialog Trigger for Mobile */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex flex-col items-center justify-center gap-1 rounded-lg py-1 text-3xs font-bold text-muted-foreground hover:text-foreground flex-1"
      >
        <Settings className="h-4.5 w-4.5" />
        <span className="text-[9px] font-semibold">Settings</span>
      </button>
    </div>
  </>
  );
};

export default AppSidebar;
