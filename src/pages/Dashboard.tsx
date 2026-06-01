import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
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
    const start = startOfMonth(now);
    const end = endOfMonth(now);

    const { data: records } = await supabase
      .from('financial_records')
      .select('type, amount')
      .eq('user_id', user!.id)
      .gte('record_date', format(start, 'yyyy-MM-dd'))
      .lte('record_date', format(end, 'yyyy-MM-dd'));

    const income = records?.filter(r => r.type === 'income').reduce((s, r) => s + Number(r.amount), 0) || 0;
    const expenses = records?.filter(r => r.type === 'expense').reduce((s, r) => s + Number(r.amount), 0) || 0;

    const { count: habitsCount } = await supabase
      .from('habits')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user!.id);

    const { count: streakDays } = await supabase
      .from('habit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user!.id);

    setStats({ income, expenses, habitsCount: habitsCount || 0, streakDays: streakDays || 0 });
  };

  const fetchMonthlyData = async () => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const start = format(startOfMonth(d), 'yyyy-MM-dd');
      const end = format(endOfMonth(d), 'yyyy-MM-dd');
      months.push({ month: format(d, 'MMM'), start, end });
    }

    const { data } = await supabase
      .from('financial_records')
      .select('type, amount, record_date')
      .eq('user_id', user!.id)
      .gte('record_date', months[0].start)
      .lte('record_date', months[months.length - 1].end);

    const chartData = months.map(m => {
      const monthRecords = data?.filter(r => r.record_date >= m.start && r.record_date <= m.end) || [];
      return {
        month: m.month,
        income: monthRecords.filter(r => r.type === 'income').reduce((s, r) => s + Number(r.amount), 0),
        expenses: monthRecords.filter(r => r.type === 'expense').reduce((s, r) => s + Number(r.amount), 0),
      };
    });
    setMonthlyData(chartData);
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
          Welcome back, {user?.user_metadata?.full_name?.split(' ')[0] || 'there'}
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
