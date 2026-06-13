import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { format } from 'date-fns';
import AppSidebar from './AppSidebar';

const AppLayout = () => {
  const { user, loading } = useAuth();
  const [notificationSettings, setNotificationSettings] = useState<{
    enabled: boolean;
    time: string;
  } | null>(null);

  // 1. Real-time Firestore Settings Listener
  useEffect(() => {
    if (!user) return;
    const userRef = doc(db, 'users', user.id);
    const unsubscribe = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setNotificationSettings({
          enabled: data.browser_notifications_enabled || false,
          time: data.reminder_time || '20:00',
        });
      }
    }, (err) => {
      console.error('Error listening to user notification settings:', err);
    });

    return () => unsubscribe();
  }, [user]);

  // 2. Background Loop to Check and Dispatch Push Notifications
  useEffect(() => {
    if (!user || !notificationSettings || !notificationSettings.enabled) return;

    const checkReminders = () => {
      const now = new Date();
      const currentHourMin = format(now, 'HH:mm');
      
      if (currentHourMin === notificationSettings.time) {
        const todayStr = format(now, 'yyyy-MM-dd');
        const lastNotified = localStorage.getItem('gotham_last_push_date');
        
        if (lastNotified !== todayStr && 'Notification' in window && Notification.permission === 'granted') {
          new Notification('GOTHAM Habit Reminder 🚀', {
            body: 'Hey! Time to log your habits and track your mindset for today. Keep your streak alive! 🔥',
            icon: '/logo.svg',
          });
          localStorage.setItem('gotham_last_push_date', todayStr);
        }
      }
    };

    // Check on mount/update and then every 30 seconds
    checkReminders();
    const intervalId = setInterval(checkReminders, 30000);

    return () => clearInterval(intervalId);
  }, [user, notificationSettings]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
