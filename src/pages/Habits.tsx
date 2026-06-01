import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Check, Flame, Target } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import { toast } from 'sonner';

type Habit = { id: string; name: string; color: string };
type HabitLog = { habit_id: string; log_date: string };

const Habits = () => {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [newHabit, setNewHabit] = useState('');
  const [showForm, setShowForm] = useState(false);

  const today = new Date();
  const last7 = Array.from({ length: 7 }, (_, i) => subDays(today, 6 - i));

  useEffect(() => {
    if (user) { fetchHabits(); fetchLogs(); }
  }, [user]);

  const fetchHabits = async () => {
    const { data } = await supabase.from('habits').select('id, name, color').eq('user_id', user!.id).order('created_at');
    setHabits(data || []);
  };

  const fetchLogs = async () => {
    const start = format(subDays(today, 30), 'yyyy-MM-dd');
    const end = format(today, 'yyyy-MM-dd');
    const { data } = await supabase.from('habit_logs').select('habit_id, log_date').eq('user_id', user!.id).gte('log_date', start).lte('log_date', end);
    setLogs(data || []);
  };

  const addHabit = async () => {
    if (!newHabit.trim()) return;
    const colors = ['#14B8A6', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899', '#06B6D4'];
    const { error } = await supabase.from('habits').insert({
      user_id: user!.id,
      name: newHabit.trim(),
      color: colors[habits.length % colors.length],
    });
    if (error) { toast.error('Failed to add habit'); return; }
    setNewHabit('');
    setShowForm(false);
    fetchHabits();
    toast.success('Habit added');
  };

  const deleteHabit = async (id: string) => {
    await supabase.from('habits').delete().eq('id', id);
    fetchHabits(); fetchLogs();
    toast.success('Habit deleted');
  };

  const toggleLog = async (habitId: string, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const exists = logs.find(l => l.habit_id === habitId && l.log_date === dateStr);
    if (exists) {
      await supabase.from('habit_logs').delete().eq('habit_id', habitId).eq('log_date', dateStr);
    } else {
      await supabase.from('habit_logs').insert({ habit_id: habitId, user_id: user!.id, log_date: dateStr });
    }
    fetchLogs();
  };

  const isCompleted = (habitId: string, date: Date) =>
    logs.some(l => l.habit_id === habitId && l.log_date === format(date, 'yyyy-MM-dd'));

  const weeklyData = last7.map(d => {
    const dateStr = format(d, 'yyyy-MM-dd');
    const completed = habits.filter(h => logs.some(l => l.habit_id === h.id && l.log_date === dateStr)).length;
    return { day: format(d, 'EEE'), completed, total: habits.length };
  });

  const totalPossible = habits.length * 7;
  const totalCompleted = weeklyData.reduce((s, d) => s + d.completed, 0);
  const rate = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;

  const getStreak = () => {
    let streak = 0;
    for (let i = 0; i < 30; i++) {
      const d = format(subDays(today, i), 'yyyy-MM-dd');
      const allDone = habits.length > 0 && habits.every(h => logs.some(l => l.habit_id === h.id && l.log_date === d));
      if (allDone) streak++;
      else break;
    }
    return streak;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Habits</h1>
          <p className="text-sm text-muted-foreground">Build consistency, one day at a time</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} size="sm" className="gap-1">
          <Plus className="h-4 w-4" /> Add Habit
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="stat-card">
          <p className="text-sm text-muted-foreground">Completion Rate</p>
          <p className="mt-1 text-2xl font-bold text-primary">{rate}%</p>
          <div className="mt-2 h-1.5 rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${rate}%` }} />
          </div>
        </div>
        <div className="stat-card">
          <p className="text-sm text-muted-foreground">Current Streak</p>
          <div className="mt-1 flex items-center gap-2">
            <Flame className="h-5 w-5 text-amber-500" />
            <p className="text-2xl font-bold text-foreground">{getStreak()} days</p>
          </div>
        </div>
        <div className="stat-card">
          <p className="text-sm text-muted-foreground">Active Habits</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{habits.length}</p>
        </div>
      </div>

      {habits.length > 0 && (
        <div className="stat-card">
          <h2 className="text-lg font-semibold text-foreground mb-4">This Week</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} domain={[0, habits.length || 1]} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }} />
                <Bar dataKey="completed" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {showForm && (
        <div className="stat-card flex gap-3">
          <Input value={newHabit} onChange={e => setNewHabit(e.target.value)} placeholder="Habit name" onKeyDown={e => e.key === 'Enter' && addHabit()} className="flex-1" />
          <Button onClick={addHabit}>Add</Button>
        </div>
      )}

      {habits.length > 0 ? (
        <div className="stat-card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left text-sm font-medium text-muted-foreground pb-3 pr-4">Habit</th>
                {last7.map(d => (
                  <th key={d.toISOString()} className="text-center text-xs font-medium text-muted-foreground pb-3 px-2 min-w-[40px]">
                    <div>{format(d, 'EEE')}</div>
                    <div className="text-muted-foreground/60">{format(d, 'd')}</div>
                  </th>
                ))}
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {habits.map(h => (
                <tr key={h.id} className="border-t border-border/50">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: h.color }} />
                      <span className="text-sm font-medium text-foreground">{h.name}</span>
                    </div>
                  </td>
                  {last7.map(d => {
                    const done = isCompleted(h.id, d);
                    return (
                      <td key={d.toISOString()} className="py-3 px-2 text-center">
                        <button
                          onClick={() => toggleLog(h.id, d)}
                          className={`mx-auto flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                            done ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                          }`}
                        >
                          {done && <Check className="h-4 w-4" />}
                        </button>
                      </td>
                    );
                  })}
                  <td className="py-3">
                    <button onClick={() => deleteHabit(h.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground stat-card">
          <Target className="h-10 w-10 mb-3 text-muted-foreground/40" />
          <p className="text-sm">No habits yet</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowForm(true)}>Create your first habit</Button>
        </div>
      )}
    </div>
  );
};

export default Habits;
