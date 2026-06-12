import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Navigate } from 'react-router-dom';
import { Users, Wallet, Target } from 'lucide-react';

type Profile = { user_id: string; display_name: string | null; email: string | null; created_at: string };

const Admin = () => {
  const { isAdmin, loading } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, totalRecords: 0, totalHabits: 0 });

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    try {
      // 1. Fetch all users from Firestore
      const usersRef = collection(db, 'users');
      const usersSnap = await getDocs(usersRef);
      
      const fetchedProfiles: Profile[] = [];
      usersSnap.forEach((doc) => {
        const data = doc.data();
        fetchedProfiles.push({
          user_id: doc.id,
          display_name: data.display_name || null,
          email: data.email || null,
          created_at: data.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
        });
      });
      
      // Sort locally by joining date descending
      fetchedProfiles.sort((a, b) => b.created_at.localeCompare(a.created_at));
      setProfiles(fetchedProfiles);

      // 2. Fetch total financial records count
      const recordsRef = collection(db, 'financial_records');
      const recordsSnap = await getDocs(recordsRef);
      const totalRecords = recordsSnap.size;

      setStats({
        totalUsers: fetchedProfiles.length,
        totalRecords: totalRecords,
        totalHabits: 0,
      });
    } catch (err) {
      console.error('Error fetching admin data from Firestore:', err);
    }
  };

  if (loading) return null;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">Manage users and view platform stats</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="stat-card">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Users className="h-4 w-4" />Total Users</div>
          <p className="mt-1 text-2xl font-bold text-foreground">{stats.totalUsers}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Wallet className="h-4 w-4" />Financial Records</div>
          <p className="mt-1 text-2xl font-bold text-foreground">{stats.totalRecords}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Target className="h-4 w-4" />Active Users</div>
          <p className="mt-1 text-2xl font-bold text-foreground">{stats.totalUsers}</p>
        </div>
      </div>

      <div className="stat-card">
        <h2 className="text-lg font-semibold text-foreground mb-4">All Users</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground pb-3 uppercase tracking-wider">User</th>
                <th className="text-left text-xs font-medium text-muted-foreground pb-3 uppercase tracking-wider">Email</th>
                <th className="text-left text-xs font-medium text-muted-foreground pb-3 uppercase tracking-wider">Joined</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map(p => (
                <tr key={p.user_id} className="border-b border-border/50">
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                        {(p.display_name || p.email || '?')[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-foreground">{p.display_name || 'No name'}</span>
                    </div>
                  </td>
                  <td className="py-3 text-sm text-muted-foreground">{p.email}</td>
                  <td className="py-3 text-sm text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Admin;
