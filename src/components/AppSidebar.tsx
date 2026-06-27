import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { Icon } from '@iconify/react';
import { doc, getDoc, setDoc, collection, query, where, getDocs, addDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { updateProfile as firebaseUpdateProfile } from 'firebase/auth';
import { toast } from 'sonner';
import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, 
  DialogTitle, DialogTrigger, DialogFooter 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

const COUNTRIES = [
  { name: 'Rwanda', code: 'RW', timezone: 'Africa/Kigali' },
  { name: 'United States', code: 'US', timezone: 'America/New_York' },
  { name: 'United Kingdom', code: 'GB', timezone: 'Europe/London' },
  { name: 'Canada', code: 'CA', timezone: 'America/Toronto' },
  { name: 'Kenya', code: 'KE', timezone: 'Africa/Nairobi' },
  { name: 'South Africa', code: 'ZA', timezone: 'Africa/Johannesburg' },
  { name: 'India', code: 'IN', timezone: 'Asia/Kolkata' },
  { name: 'Germany', code: 'DE', timezone: 'Europe/Berlin' },
  { name: 'France', code: 'FR', timezone: 'Europe/Paris' },
];

const AppSidebar = () => {
  const { pathname } = useLocation();
  const { isAdmin, signOut, user, profile, updateProfile } = useAuth();
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

  // New settings states
  const [currency, setCurrency] = useState('USD');
  const [country, setCountry] = useState('Rwanda');

  // UI state & media controls
  const [isSettingsFormOpen, setIsSettingsFormOpen] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [headphonesMuted, setHeadphonesMuted] = useState(false);

  // Collaboration States
  const [inviteEmail, setInviteEmail] = useState('');
  const [receivedInvites, setReceivedInvites] = useState<any[]>([]);
  const [activeCollaborators, setActiveCollaborators] = useState<any[]>([]);
  const [sendingInvite, setSendingInvite] = useState(false);

  const loadCollaborationInfo = async () => {
    if (!user) return;
    try {
      // 1. Fetch pending invites
      const invitesRef = collection(db, 'collaboration_invites');
      const q = query(
        invitesRef,
        where('receiver_email', '==', user.email),
        where('status', '==', 'pending')
      );
      const snap = await getDocs(q);
      const invites: any[] = [];
      snap.forEach(d => invites.push({ id: d.id, ...d.data() }));
      setReceivedInvites(invites);

      // 2. Fetch active collaborators
      const currentProfile = profile;
      if (currentProfile?.collaborator_ids && currentProfile.collaborator_ids.length > 0) {
        const usersRef = collection(db, 'users');
        const qUsers = query(usersRef, where('__name__', 'in', currentProfile.collaborator_ids));
        const snapUsers = await getDocs(qUsers);
        const collaborators: any[] = [];
        snapUsers.forEach(d => collaborators.push({ id: d.id, ...d.data() }));
        setActiveCollaborators(collaborators);
      } else {
        setActiveCollaborators([]);
      }
    } catch (err) {
      console.error('Error loading collaboration info:', err);
    }
  };

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
          setCurrency(data.currency || 'USD');
          setCountry(data.country || 'Rwanda');
        } else {
          setDisplayName(user.displayName || '');
          setReminderEmail(user.email || '');
        }
      } catch (err) {
        console.error('Error loading settings from Firestore:', err);
      }
    };
    if (isOpen || isSettingsFormOpen) {
      loadSettings();
      loadCollaborationInfo();
    }
  }, [user, isOpen, isSettingsFormOpen, profile?.collaborator_ids?.length]);

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

  const sendCollaborationInvite = async () => {
    if (!inviteEmail.trim() || !user) return;
    if (inviteEmail.trim().toLowerCase() === user.email?.toLowerCase()) {
      toast.error("You cannot invite yourself!");
      return;
    }
    setSendingInvite(true);
    try {
      // Find receiver user doc by email
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('reminder_email', '==', inviteEmail.trim()));
      const snap = await getDocs(q);
      
      let receiverId = '';
      if (!snap.empty) {
        receiverId = snap.docs[0].id;
      }

      await addDoc(collection(db, 'collaboration_invites'), {
        sender_email: user.email,
        sender_id: user.id,
        sender_name: displayName || user.displayName || user.email.split('@')[0],
        receiver_email: inviteEmail.trim().toLowerCase(),
        status: 'pending',
        created_at: new Date()
      });

      toast.success("Collaboration invitation sent!");
      setInviteEmail('');
    } catch (err) {
      console.error('Error sending collaboration invite:', err);
      toast.error("Failed to send invitation");
    } finally {
      setSendingInvite(false);
    }
  };

  const acceptInvite = async (invite: any) => {
    if (!user || !profile) return;
    try {
      const inviteRef = doc(db, 'collaboration_invites', invite.id);
      await updateDoc(inviteRef, { status: 'accepted' });

      // Update both user docs
      const myUserRef = doc(db, 'users', user.id);
      const myCollabIds = profile.collaborator_ids || [];
      if (!myCollabIds.includes(invite.sender_id)) {
        myCollabIds.push(invite.sender_id);
      }
      await updateDoc(myUserRef, { collaborator_ids: myCollabIds });

      const senderUserRef = doc(db, 'users', invite.sender_id);
      const senderSnap = await getDoc(senderUserRef);
      let senderCollabIds: string[] = [];
      if (senderSnap.exists()) {
        senderCollabIds = senderSnap.data().collaborator_ids || [];
      }
      if (!senderCollabIds.includes(user.id)) {
        senderCollabIds.push(user.id);
      }
      await updateDoc(senderUserRef, { collaborator_ids: senderCollabIds });

      // Update local profile state
      await updateProfile({ collaborator_ids: myCollabIds });

      toast.success("Collaboration request accepted!");
      loadCollaborationInfo();
    } catch (err) {
      console.error('Error accepting invite:', err);
      toast.error("Failed to accept invitation");
    }
  };

  const declineInvite = async (invite: any) => {
    try {
      const inviteRef = doc(db, 'collaboration_invites', invite.id);
      await updateDoc(inviteRef, { status: 'declined' });
      toast.success("Invitation declined");
      loadCollaborationInfo();
    } catch (err) {
      console.error('Error declining invite:', err);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const userRef = doc(db, 'users', user!.id);
      const selectedTZ = COUNTRIES.find(c => c.name === country)?.timezone || 'Africa/Kigali';
      await setDoc(userRef, {
        display_name: displayName.trim(),
        reminder_email: reminderEmail.trim(),
        reminder_phone: reminderPhone.trim(),
        email_enabled: emailEnabled,
        whatsapp_enabled: whatsappEnabled,
        browser_notifications_enabled: browserNotificationsEnabled,
        reminder_time: reminderTime,
        currency,
        country,
        timezone: selectedTZ,
      }, { merge: true });

      await updateProfile({
        currency,
        country,
        timezone: selectedTZ,
      });

      // Try updating display name on Firebase Auth client
      try {
        if (auth.currentUser) {
          await firebaseUpdateProfile(auth.currentUser, {
            displayName: displayName.trim()
          });
        }
      } catch (authErr) {
        console.warn('Auth profile display name sync skipped:', authErr);
      }

      toast.success('Profile settings saved successfully!');
      setIsSettingsFormOpen(false);
    } catch (err) {
      console.error('Error saving settings to Firestore:', err);
      toast.error('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const links = [
    { to: '/dashboard', icon: "solar:widget-bold-duotone", label: 'Dashboard' },
    { to: '/finances', icon: "solar:wallet-bold-duotone", label: 'Finances' },
    { to: '/habits', icon: "solar:checklist-minimalistic-bold-duotone", label: 'Habits' },
    { to: '/applications', icon: "solar:case-bold-duotone", label: 'Applications' },
    ...(isAdmin ? [{ to: '/admin', icon: "solar:shield-keyhole-bold-duotone", label: 'Admin' }] : []),
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
        {links.map(({ to, icon, label }) => (
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
            <Icon icon={icon} className="h-5 w-5 text-primary" />
            {label}
          </Link>
        ))}
      </nav>

      {/* DISCORD-STYLE PROFILE FOOTER BAR */}
      <div className="mt-auto border-t border-border bg-muted/10 p-2 flex items-center justify-between gap-1.5 select-none">
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <div className="flex items-center gap-2 min-w-0 flex-1 hover:bg-muted/40 p-1.5 rounded-lg cursor-pointer transition-colors">
              <div className="relative flex-shrink-0">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="h-9 w-9 rounded-full object-cover shadow-sm" />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-sm">
                    {displayName?.[0] || user?.email?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card bg-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground truncate leading-none">
                  {displayName || user?.displayName || user?.email?.split('@')[0]}
                </p>
                <p className="text-[10px] text-muted-foreground truncate mt-0.5 leading-none">
                  {user?.email}
                </p>
              </div>
            </div>
          </DialogTrigger>

          {/* DISCORD-STYLE PROFILE DIALOG POPUP CARD */}
          <DialogContent className="max-w-[320px] bg-[#18191c] border border-zinc-800 shadow-2xl rounded-2xl p-0 overflow-hidden text-white select-none">
            {/* Banner top */}
            <div className="h-[60px] bg-[#E3DFD9] relative w-full" />

            {/* Avatar overlapping banner */}
            <div className="relative px-4 pb-2 h-10">
              <div className="absolute -top-[32px] left-4 h-16 w-16 rounded-full">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="h-16 w-16 rounded-full border-4 border-[#18191c] object-cover shadow-lg" />
                ) : (
                  <div className="h-16 w-16 rounded-full border-4 border-[#18191c] bg-primary flex items-center justify-center text-lg font-black text-primary-foreground shadow-lg">
                    {displayName?.[0] || user?.email?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <div className="absolute bottom-0 right-0 h-4.5 w-4.5 rounded-full border-3 border-[#18191c] bg-emerald-500" />
              </div>
            </div>

            {/* User Profile Info */}
            <div className="px-4 pt-10 pb-3 space-y-1">
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                {displayName || user?.displayName || user?.email?.split('@')[0]}
                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-300 uppercase tracking-wide">
                  {country === 'Rwanda' ? 'RW' : country.substring(0,2).toUpperCase()}
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400 leading-none">
                {user?.email}
              </p>
            </div>

            {/* Menu items block */}
            <div className="px-3 pb-3">
              <div className="bg-[#2f3136] rounded-xl border border-zinc-800 overflow-hidden">
                {/* Edit settings button */}
                <button 
                  onClick={() => {
                    setIsOpen(false);
                    setIsSettingsFormOpen(true);
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-3 hover:bg-[#393c43] text-xs font-semibold text-zinc-200 border-b border-zinc-800 transition-colors"
                >
                  <span className="flex items-center gap-2 text-left">
                    <Icon icon="solar:pen-bold-duotone" className="h-4.5 w-4.5 text-zinc-400" />
                    Edit Profile & Settings
                  </span>
                  <span className="text-zinc-500 text-xs">›</span>
                </button>

                {/* Sign Out button */}
                <button 
                  onClick={() => {
                    setIsOpen(false);
                    signOut();
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-3 hover:bg-[#393c43] text-xs font-semibold text-zinc-200 transition-colors"
                >
                  <span className="flex items-center gap-2 text-left">
                    <Icon icon="solar:logout-bold-duotone" className="h-4.5 w-4.5 text-zinc-400" />
                    Sign Out & Switch Account
                  </span>
                  <span className="text-zinc-500 text-xs">›</span>
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Settings button on Sidebar Bottom */}
        <div className="flex items-center gap-1 text-muted-foreground flex-shrink-0">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsSettingsFormOpen(true)}
            className="h-7 w-7 rounded-lg hover:text-foreground hover:bg-muted"
          >
            <Icon icon="solar:settings-bold-duotone" className="h-4.5 w-4.5" />
          </Button>
        </div>
      </div>

      {/* SETTINGS DIALOG FORM */}
      <Dialog open={isSettingsFormOpen} onOpenChange={setIsSettingsFormOpen}>
        <DialogContent className="max-w-md bg-card/95 backdrop-blur-xl border border-border/80 shadow-2xl rounded-3xl p-6 overflow-hidden pr-2">
          {/* Top Border Accent */}
          <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600" />
          
          <DialogHeader className="pb-3 border-b border-border/40">
            <DialogTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
              <div className="p-1 rounded-lg bg-primary/10 text-primary shadow-inner">
                <Icon icon="solar:settings-bold-duotone" className="h-5 w-5 animate-spin-slow" />
              </div>
              Profile & Settings
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Configure display name, currency preference, and daily notifications.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 select-none max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            {/* Theme Mode Toggle Card */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-muted/10">
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
                {theme === 'dark' ? <Icon icon="solar:sun-bold-duotone" className="h-4.5 w-4.5 text-amber-500 animate-pulse" /> : <Icon icon="solar:moon-bold-duotone" className="h-4.5 w-4.5 text-indigo-400" />}
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </Button>
            </div>

            {/* Name Edit Card */}
            <div className="space-y-2 p-3 rounded-xl border border-border/40 bg-muted/10">
              <Label htmlFor="display-name" className="text-xs font-semibold text-muted-foreground block mb-1">Display Name</Label>
              <Input 
                id="display-name" 
                placeholder="Your Name" 
                value={displayName} 
                onChange={e => setDisplayName(e.target.value)} 
                className="h-9 shadow-sm rounded-xl bg-background/50 border-border/50 focus:border-primary/50 text-xs"
              />
            </div>

            {/* Currency & Country / Timezone Selection */}
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl border border-border/40 bg-muted/10">
              <div className="space-y-1.5">
                <Label htmlFor="currency-select" className="text-xs font-semibold text-muted-foreground block mb-1">Preferred Currency</Label>
                <select
                  id="currency-select"
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl bg-background border border-border/50 text-xs focus:outline-none focus:border-primary"
                >
                  <option value="USD">USD ($)</option>
                  <option value="RWF">RWF (RWF)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="country-select" className="text-xs font-semibold text-muted-foreground block mb-1">Country (Timezone)</Label>
                <select
                  id="country-select"
                  value={country}
                  onChange={e => setCountry(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl bg-background border border-border/50 text-xs focus:outline-none focus:border-primary"
                >
                  {COUNTRIES.map(c => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Collaboration Settings Card */}
            <div className="space-y-3.5 p-3 rounded-xl border border-border/40 bg-muted/10">
              <div>
                <Label className="text-sm font-bold text-primary block">Collaboration Settings</Label>
                <p className="text-[10px] text-muted-foreground mt-0.5">Share and collaborate on habits, finances, or job applications.</p>
              </div>

              {/* Active Collaborators */}
              {activeCollaborators.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-border/30">
                  <div className="text-xs font-semibold text-muted-foreground mb-1">Active Collaborators</div>
                  <div className="space-y-1">
                    {activeCollaborators.map(collab => (
                      <div key={collab.id} className="flex items-center justify-between bg-background/50 border border-border/50 p-2 rounded-xl text-xs font-semibold text-foreground">
                        <span>{collab.display_name || collab.reminder_email}</span>
                        <span className="text-[9px] text-emerald-500 uppercase font-bold tracking-wider">Connected</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Received Invites */}
              {receivedInvites.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-border/30">
                  <div className="text-xs font-semibold text-amber-500 mb-1">Received Requests</div>
                  <div className="space-y-1">
                    {receivedInvites.map(invite => (
                      <div key={invite.id} className="flex items-center justify-between bg-amber-500/5 border border-amber-500/20 p-2 rounded-xl text-xs">
                        <span className="font-semibold text-foreground truncate max-w-[150px]">{invite.sender_name}</span>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => acceptInvite(invite)}
                            className="h-6 px-2.5 bg-emerald-500 text-white font-bold text-[10px] rounded-full uppercase transition-all active:scale-95"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => declineInvite(invite)}
                            className="h-6 px-2.5 bg-muted text-muted-foreground font-semibold text-[10px] rounded-full uppercase transition-all active:scale-95 border border-border"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Invite Form */}
              <div className="space-y-2 pt-2 border-t border-border/30">
                <Label htmlFor="invite-email" className="text-xs font-semibold text-muted-foreground block mb-1">Invite Partner by Email</Label>
                <div className="flex gap-2">
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="partner@email.com"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    className="h-8.5 rounded-xl bg-background/50 border-border/50 focus:border-primary/50 text-xs flex-1"
                  />
                  <Button
                    type="button"
                    onClick={sendCollaborationInvite}
                    disabled={sendingInvite}
                    size="sm"
                    className="h-8.5 text-[10px] font-bold uppercase rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 active:scale-95"
                  >
                    {sendingInvite ? 'Sending...' : 'Invite'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Browser Push Notifications Card */}
            <div className="p-3 rounded-xl border border-border/40 bg-muted/10">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold flex items-center gap-1.5">
                    <Icon icon="solar:notification-lines-by-center-bold-duotone" className="h-5 w-5 text-primary" />
                    Browser Push Alerts
                  </Label>
                  <p className="text-[10px] text-muted-foreground">Receive daily habit prompts</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleBrowserNotificationToggle(!browserNotificationsEnabled)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none ${
                    browserNotificationsEnabled ? 'bg-primary' : 'bg-muted border border-border'
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
                <div className="grid grid-cols-3 gap-2 mt-3.5 pt-3.5 border-t border-border/30 items-center animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="col-span-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={sendTestNotification}
                      className="w-full text-[10px] font-bold"
                    >
                      Send Test Alert
                    </Button>
                  </div>
                  <div>
                    <Input 
                      value={reminderTime} 
                      onChange={e => setReminderTime(e.target.value)} 
                      type="time"
                      className="h-8.5 text-xs shadow-sm rounded-xl bg-background/50 border-border/30 text-center font-semibold"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Email Reminders Card */}
            <div className="p-3 rounded-xl border border-border/40 bg-muted/10">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold flex items-center gap-1.5">
                    <Icon icon="solar:letter-bold-duotone" className="h-5 w-5 text-primary" />
                    Daily Email Updates
                  </Label>
                  <p className="text-[10px] text-muted-foreground">Receive updates in your inbox</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEmailEnabled(!emailEnabled)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none ${
                    emailEnabled ? 'bg-primary' : 'bg-muted border border-border'
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
                <div className="grid grid-cols-3 gap-2 mt-3.5 pt-3.5 border-t border-border/30 items-center animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="col-span-2">
                    <Input 
                      placeholder="name@email.com" 
                      value={reminderEmail} 
                      onChange={e => setReminderEmail(e.target.value)} 
                      type="email"
                      className="h-8.5 text-xs shadow-sm rounded-xl bg-background/50 border-border/30"
                    />
                  </div>
                  <div>
                    <Input 
                      value={reminderTime} 
                      onChange={e => setReminderTime(e.target.value)} 
                      type="time"
                      className="h-8.5 text-xs shadow-sm rounded-xl bg-background/50 border-border/30 text-center font-semibold"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* WhatsApp Reminders Card */}
            <div className="p-3 rounded-xl border border-border/40 bg-muted/10">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold flex items-center gap-1.5">
                    <Icon icon="solar:chat-round-line-bold-duotone" className="h-5 w-5 text-primary" />
                    WhatsApp Prompts
                  </Label>
                  <p className="text-[10px] text-muted-foreground">Receive logs directly on phone</p>
                </div>
                <button
                  type="button"
                  onClick={() => setWhatsappEnabled(!whatsappEnabled)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none ${
                    whatsappEnabled ? 'bg-primary' : 'bg-muted border border-border'
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
                <div className="grid grid-cols-3 gap-2 mt-3.5 pt-3.5 border-t border-border/30 items-center animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="col-span-2">
                    <Input 
                      placeholder="e.g. +1 555 123 4567" 
                      value={reminderPhone} 
                      onChange={e => setReminderPhone(e.target.value)} 
                      type="tel"
                      className="h-8.5 text-xs shadow-sm rounded-xl bg-background/50 border-border/30"
                    />
                  </div>
                  <div>
                    <Input 
                      value={reminderTime} 
                      onChange={e => setReminderTime(e.target.value)} 
                      type="time"
                      className="h-8.5 text-xs shadow-sm rounded-xl bg-background/50 border-border/30 text-center font-semibold"
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
                  setIsSettingsFormOpen(false);
                  signOut();
                }}
                className="w-full sm:w-auto shadow-sm gap-1.5 h-9 font-bold text-xs border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all duration-200 active:scale-95"
              >
                <Icon icon="solar:logout-bold-duotone" className="h-4.5 w-4.5" /> Sign Out
              </Button>
            </div>
            <div className="flex gap-2 w-full sm:w-auto justify-end">
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsSettingsFormOpen(false)} className="rounded-xl font-semibold text-xs text-muted-foreground hover:text-foreground">Cancel</Button>
              <Button 
                type="button" 
                size="sm" 
                onClick={saveSettings} 
                disabled={saving} 
                className="w-full sm:w-auto text-xs font-bold h-9 px-4 bg-primary text-primary-foreground hover:bg-primary/95 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>



    </aside>

    <div className="flex md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 bg-card/85 backdrop-blur-md border-t border-border/80 px-2 py-1 justify-around items-center select-none shadow-lg animate-in slide-in-from-bottom duration-300">
      {links.map(({ to, icon, label }) => (
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
          <Icon icon={icon} className="h-5 w-5 text-primary" />
          <span className="text-[9px] font-semibold">{label}</span>
        </Link>
      ))}

      {/* Settings Dialog Trigger for Mobile */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex flex-col items-center justify-center gap-1 rounded-lg py-1 text-3xs font-bold text-muted-foreground hover:text-foreground flex-1"
      >
        <Icon icon="solar:settings-bold-duotone" className="h-5 w-5 text-primary" />
        <span className="text-[9px] font-semibold">Settings</span>
      </button>
    </div>
  </>
  );
};

export default AppSidebar;
