import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { 
  TrendingUp, TrendingDown, Target, Calendar, Briefcase, 
  ArrowRight, Loader2, GraduationCap, CheckCircle2 
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { useNavigate } from 'react-router-dom';

type Application = {
  id: string;
  title: string;
  organization: string;
  type: 'job' | 'scholarship';
  status: 'Saved' | 'Applied' | 'Interviewing' | 'Offer' | 'Accepted' | 'Rejected';
  date: string;
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ income: 0, expenses: 0, habitsCount: 0, streakDays: 0 });
  const [monthlyData, setMonthlyData] = useState<{ month: string; income: number; expenses: number }[]>([]);
  
  // Applications summary states
  const [applications, setApplications] = useState<Application[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchStats();
    fetchMonthlyData();
    fetchApplicationsSummary();
  }, [user]);

  const fetchStats = async () => {
    const now = new Date();
    const startStr = format(startOfMonth(now), 'yyyy-MM-dd');
    const endStr = format(endOfMonth(now), 'yyyy-MM-dd');

    try {
      // 1. Fetch financial records for current month
      const recordsRef = collection(db, 'financial_records');
      const recordsQuery = query(
        recordsRef,
        where('user_id', '==', user!.id),
        where('record_date', '>=', startStr),
        where('record_date', '<=', endStr)
      );
      const recordsSnap = await getDocs(recordsQuery);
      const records: any[] = [];
      recordsSnap.forEach(doc => {
        records.push(doc.data());
      });

      const income = records.filter(r => r.type === 'income').reduce((s, r) => s + Number(r.amount), 0) || 0;
      const expenses = records.filter(r => r.type === 'expense').reduce((s, r) => s + Number(r.amount), 0) || 0;

      // 2. Fetch habits count
      const habitsRef = collection(db, 'habits');
      const habitsQuery = query(habitsRef, where('user_id', '==', user!.id));
      const habitsSnap = await getDocs(habitsQuery);
      const habitsCount = habitsSnap.size;

      // 3. Fetch check-ins count
      const logsRef = collection(db, 'habit_logs');
      const logsQuery = query(logsRef, where('user_id', '==', user!.id));
      const logsSnap = await getDocs(logsQuery);
      const streakDays = logsSnap.size;

      setStats({ income, expenses, habitsCount, streakDays });
    } catch (err) {
      console.error('Error fetching dashboard stats from Firestore:', err);
    }
  };

  const fetchMonthlyData = async () => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const start = format(startOfMonth(d), 'yyyy-MM-dd');
      const end = format(endOfMonth(d), 'yyyy-MM-dd');
      months.push({ month: format(d, 'MMM'), start, end });
    }

    try {
      const recordsRef = collection(db, 'financial_records');
      const recordsQuery = query(
        recordsRef,
        where('user_id', '==', user!.id),
        where('record_date', '>=', months[0].start),
        where('record_date', '<=', months[months.length - 1].end)
      );
      
      const recordsSnap = await getDocs(recordsQuery);
      const records: any[] = [];
      recordsSnap.forEach(doc => {
        records.push(doc.data());
      });

      const chartData = months.map(m => {
        const monthRecords = records.filter(r => r.record_date >= m.start && r.record_date <= m.end) || [];
        return {
          month: m.month,
          income: monthRecords.filter(r => r.type === 'income').reduce((s, r) => s + Number(r.amount), 0),
          expenses: monthRecords.filter(r => r.type === 'expense').reduce((s, r) => s + Number(r.amount), 0),
        };
      });
      setMonthlyData(chartData);
    } catch (err) {
      console.error('Error fetching monthly charts from Firestore:', err);
    }
  };

  const fetchApplicationsSummary = async () => {
    setLoadingApps(true);
    try {
      const appsRef = collection(db, 'applications');
      const userIds = [user!.id, ...(profile?.collaborator_ids || [])];
      const q = query(appsRef, where('user_id', 'in', userIds));
      const snap = await getDocs(q);
      const fetched: Application[] = [];
      snap.forEach((doc) => {
        const data = doc.data();
        fetched.push({
          id: doc.id,
          title: data.title,
          organization: data.organization,
          type: data.type,
          status: data.statuses?.[user!.id] || data.status || 'Saved',
          date: data.date || '',
        });
      });
      // Sort by date descending
      fetched.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      setApplications(fetched);
    } catch (err) {
      console.error('Error fetching applications for summary:', err);
    } finally {
      setLoadingApps(false);
    }
  };

  const statCards = [
    { label: 'Income this month', value: `$${stats.income.toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-500' },
    { label: 'Expenses this month', value: `$${stats.expenses.toLocaleString()}`, icon: TrendingDown, color: 'text-red-500' },
    { label: 'Active Habits', value: stats.habitsCount, icon: Target, color: 'text-primary' },
    { label: 'Total Check-ins', value: stats.streakDays, icon: Calendar, color: 'text-amber-500' },
  ];

  // Get status color configs
  const getStatusColorClass = (status: string) => {
    switch(status) {
      case 'Saved': return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      case 'Applied': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Interviewing': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Offer': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Accepted': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'Rejected': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'there'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Here's your overview for {format(new Date(), 'MMMM yyyy')}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{label}</p>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {/* APPLICATIONS SUMMARY CARD */}
      <div className="stat-card space-y-5">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">Applications Summary</h2>
          </div>
          <button 
            onClick={() => navigate('/applications')}
            className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline transition-all"
          >
            Manage Applications <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {loadingApps ? (
          <div className="flex justify-center py-6 text-muted-foreground text-xs gap-1.5 items-center">
            <Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading summary...
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-5">
            {/* Quick Metrics */}
            <div className="md:col-span-2 grid grid-cols-2 gap-3 bg-muted/20 p-4 rounded-xl border border-border/30 justify-center align-middle">
              <div className="text-center p-2">
                <div className="text-3xs uppercase font-extrabold text-muted-foreground tracking-wider">Total</div>
                <div className="text-xl font-black text-foreground mt-0.5">{applications.length}</div>
              </div>
              <div className="text-center p-2">
                <div className="text-3xs uppercase font-extrabold text-blue-400 tracking-wider">Applied</div>
                <div className="text-xl font-black text-blue-500 mt-0.5">{applications.filter(a => a.status === 'Applied').length}</div>
              </div>
              <div className="text-center p-2">
                <div className="text-3xs uppercase font-extrabold text-amber-400 tracking-wider">Interviews</div>
                <div className="text-xl font-black text-amber-500 mt-0.5">{applications.filter(a => a.status === 'Interviewing').length}</div>
              </div>
              <div className="text-center p-2">
                <div className="text-3xs uppercase font-extrabold text-emerald-400 tracking-wider">Offers</div>
                <div className="text-xl font-black text-emerald-500 mt-0.5">{applications.filter(a => a.status === 'Offer' || a.status === 'Accepted').length}</div>
              </div>
            </div>

            {/* Recent Items List */}
            <div className="md:col-span-3 space-y-2">
              <div className="text-3xs uppercase font-extrabold text-muted-foreground tracking-wider mb-2">Recent Applications</div>
              {applications.slice(0, 3).map(app => (
                <div 
                  key={app.id}
                  onClick={() => navigate('/applications')}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border/40 hover:bg-muted/30 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`p-1.5 rounded-md flex-shrink-0 ${
                      app.type === 'job' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-purple-500/10 text-purple-400'
                    }`}>
                      {app.type === 'job' ? <Briefcase className="h-3.5 w-3.5" /> : <GraduationCap className="h-3.5 w-3.5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">{app.title}</div>
                      <div className="text-3xs text-muted-foreground truncate">{app.organization}</div>
                    </div>
                  </div>

                  <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md border ${getStatusColorClass(app.status)}`}>
                    {app.status}
                  </span>
                </div>
              ))}

              {applications.length === 0 && (
                <div className="text-center py-6 text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                  No applications tracked yet.
                  <button 
                    onClick={() => navigate('/applications')} 
                    className="block text-3xs text-primary font-bold hover:underline mx-auto mt-1"
                  >
                    Track your first application
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="stat-card">
        <h2 className="text-lg font-semibold text-foreground mb-4">Financial Overview</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: 12,
                }}
              />
              <Bar dataKey="income" fill="hsl(var(--chart-income))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" fill="hsl(var(--chart-expense))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
