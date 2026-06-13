import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Wallet, Target, Shield, LogOut, Settings, 
  Moon, Sun, Mail, MessageSquare 
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
          toast.success('Browser notification permission granted! 🔔');
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
      new Notification('GOTH Habit Reminder 🚀', {
        body: 'Success! Your browser push notifications are active and ready.',
        icon: '/logo.svg'
      });
      toast.success('Test notification sent!');
    } else {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification('GOTH Habit Reminder 🚀', {
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
    ...(isAdmin ? [{ to: '/admin', icon: Shield, label: 'Admin' }] : []),
  ];

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-border bg-card">
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
            <DialogContent className="max-w-md bg-card border border-border shadow-2xl rounded-2xl p-6">
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" /> Profile & Reminder Settings
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Configure display settings, daily reminders, and light/dark theme layout mode.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-3 select-none">
                {/* Theme Mode Toggle */}
                <div className="flex items-center justify-between border-b border-border/50 pb-4">
                  <div>
                    <Label className="text-sm font-semibold">Theme Mode</Label>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Toggle between dark and light themes</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="gap-2 shadow-sm"
                  >
                    {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-indigo-500" />}
                    {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                  </Button>
                </div>

                {/* Name Edit */}
                <div className="space-y-1.5 border-b border-border/50 pb-4">
                  <Label htmlFor="display-name" className="text-xs font-bold text-muted-foreground/80 uppercase tracking-wider">Display Name</Label>
                  <Input 
                    id="display-name" 
                    placeholder="Your Name" 
                    value={displayName} 
                    onChange={e => setDisplayName(e.target.value)} 
                    className="h-9 shadow-sm"
                  />
                </div>

                {/* Browser Push Notifications */}
                <div className="space-y-3 border-b border-border/50 pb-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <Target className="h-4 w-4 text-purple-500 animate-pulse" /> Browser Push Notifications
                    </Label>
                    <input 
                      type="checkbox" 
                      checked={browserNotificationsEnabled} 
                      onChange={e => handleBrowserNotificationToggle(e.target.checked)} 
                      className="h-4.5 w-4.5 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer"
                    />
                  </div>
                  {browserNotificationsEnabled && (
                    <div className="grid grid-cols-3 gap-2 items-center animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="col-span-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={sendTestNotification}
                          className="w-full text-xs h-8.5 font-semibold gap-1.5 shadow-sm"
                        >
                          Send Test Alert
                        </Button>
                      </div>
                      <div>
                        <Input 
                          value={reminderTime} 
                          onChange={e => setReminderTime(e.target.value)} 
                          type="time"
                          className="h-8.5 text-xs shadow-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Email Reminders */}
                <div className="space-y-3 border-b border-border/50 pb-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <Mail className="h-4 w-4 text-indigo-500" /> Daily Email Reminders
                    </Label>
                    <input 
                      type="checkbox" 
                      checked={emailEnabled} 
                      onChange={e => setEmailEnabled(e.target.checked)} 
                      className="h-4.5 w-4.5 rounded border-border text-primary focus:ring-primary accent-primary"
                    />
                  </div>
                  {emailEnabled && (
                    <div className="grid grid-cols-3 gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="col-span-2">
                        <Input 
                          placeholder="name@email.com" 
                          value={reminderEmail} 
                          onChange={e => setReminderEmail(e.target.value)} 
                          type="email"
                          className="h-8.5 text-xs shadow-sm"
                        />
                      </div>
                      <div>
                        <Input 
                          value={reminderTime} 
                          onChange={e => setReminderTime(e.target.value)} 
                          type="time"
                          className="h-8.5 text-xs shadow-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* WhatsApp Reminders */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-emerald-500" /> WhatsApp Reminders
                    </Label>
                    <input 
                      type="checkbox" 
                      checked={whatsappEnabled} 
                      onChange={e => setWhatsappEnabled(e.target.checked)} 
                      className="h-4.5 w-4.5 rounded border-border text-primary focus:ring-primary accent-primary"
                    />
                  </div>
                  {whatsappEnabled && (
                    <div className="grid grid-cols-3 gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="col-span-2">
                        <Input 
                          placeholder="e.g. +1 555 123 4567" 
                          value={reminderPhone} 
                          onChange={e => setReminderPhone(e.target.value)} 
                          type="tel"
                          className="h-8.5 text-xs shadow-sm"
                        />
                      </div>
                      <div>
                        <Input 
                          value={reminderTime} 
                          onChange={e => setReminderTime(e.target.value)} 
                          type="time"
                          className="h-8.5 text-xs shadow-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="border-t border-border/50 pt-4 flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsOpen(false)} className="shadow-sm">Cancel</Button>
                <Button size="sm" onClick={saveSettings} disabled={saving} className="shadow-sm">
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
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
  );
};

export default AppSidebar;
