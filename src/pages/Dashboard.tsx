import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { TrendingUp, TrendingDown, Target, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ income: 0, expenses: 0, habitsCount: 0, streakDays: 0 });
  const [monthlyData, setMonthlyData] = useState<{ month: string; income: number; expenses: number }[]>([]);

  useEffect(() => {
    if (!user) return;
    fetchStats();
    fetchMonthlyData();
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

  const statCards = [
    { label: 'Income this month', value: `$${stats.income.toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-500' },
    { label: 'Expenses this month', value: `$${stats.expenses.toLocaleString()}`, icon: TrendingDown, color: 'text-red-500' },
    { label: 'Active Habits', value: stats.habitsCount, icon: Target, color: 'text-primary' },
    { label: 'Total Check-ins', value: stats.streakDays, icon: Calendar, color: 'text-amber-500' },
  ];

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
