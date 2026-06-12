import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { 
  collection, query, where, getDocs, addDoc, deleteDoc, 
  doc, setDoc, serverTimestamp, writeBatch 
} from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, Trash2, Check, Flame, Target, 
  ChevronLeft, ChevronRight, BarChart3, TrendingUp, Sparkles, 
  Smile, Activity, BrainCircuit, HeartHandshake, Eye, EyeOff, X, Award
} from 'lucide-react';
import { 
  format, subDays, addMonths, startOfMonth, endOfMonth, 
  eachDayOfInterval, isToday, isSameDay, parseISO 
} from 'date-fns';
import { 
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
  LineChart, Line, Legend
} from 'recharts';
import { toast } from 'sonner';

type Habit = { id: string; name: string; color: string };
type HabitLog = { habit_id: string; log_date: string };
type MindsetLog = {
  log_date: string;
  mood?: number;
  energy?: number;
  focus?: number;
  motivation?: number;
};

type MetricType = 'mood' | 'energy' | 'focus' | 'motivation';

const Habits = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [mindsetLogs, setMindsetLogs] = useState<MindsetLog[]>([]);
  
  const [newHabit, setNewHabit] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  // Popover state for editing mindset values inline
  const [activeMindsetEdit, setActiveMindsetEdit] = useState<{
    dateStr: string;
    metric: MetricType;
    currentValue?: number;
  } | null>(null);

  // Month date calculations
  const start = startOfMonth(selectedDate);
  const end = endOfMonth(selectedDate);
  const daysInMonth = eachDayOfInterval({ start, end });
  const startStr = format(start, 'yyyy-MM-dd');
  const endStr = format(end, 'yyyy-MM-dd');

  // Group days into 5 weeks for layout grouping
  const weeks = [
    { 
      name: 'Week 1', 
      days: daysInMonth.filter(d => d.getDate() <= 7), 
      colorClass: 'habit-header-week-1', 
      cellClass: 'habit-cell-week-1', 
      checkColor: '#8B5CF6' 
    },
    { 
      name: 'Week 2', 
      days: daysInMonth.filter(d => d.getDate() > 7 && d.getDate() <= 14), 
      colorClass: 'habit-header-week-2', 
      cellClass: 'habit-cell-week-2', 
      checkColor: '#3B82F6' 
    },
    { 
      name: 'Week 3', 
      days: daysInMonth.filter(d => d.getDate() > 14 && d.getDate() <= 21), 
      colorClass: 'habit-header-week-3', 
      cellClass: 'habit-cell-week-3', 
      checkColor: '#14B8A6' 
    },
    { 
      name: 'Week 4', 
      days: daysInMonth.filter(d => d.getDate() > 21 && d.getDate() <= 28), 
      colorClass: 'habit-header-week-4', 
      cellClass: 'habit-cell-week-4', 
      checkColor: '#EC4899' 
    },
    { 
      name: 'Week 5', 
      days: daysInMonth.filter(d => d.getDate() > 28), 
      colorClass: 'habit-header-week-5', 
      cellClass: 'habit-cell-week-5', 
      checkColor: '#6B7280' 
    },
  ].filter(w => w.days.length > 0);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchHabits(),
        fetchLogs(),
        fetchMindsetLogs(),
      ]);
    } catch (err) {
      console.error('Error fetching data from Firestore:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHabits = async () => {
    const habitsRef = collection(db, 'habits');
    const q = query(habitsRef, where('user_id', '==', user!.id));
    const snap = await getDocs(q);
    const fetchedHabits: Habit[] = [];
    snap.forEach((doc) => {
      const data = doc.data();
      fetchedHabits.push({
        id: doc.id,
        name: data.name,
        color: data.color || '#14B8A6',
      });
    });
    setHabits(fetchedHabits);
  };

  const fetchLogs = async () => {
    const logsRef = collection(db, 'habit_logs');
    const q = query(
      logsRef,
      where('user_id', '==', user!.id),
      where('log_date', '>=', startStr),
      where('log_date', '<=', endStr)
    );
    const snap = await getDocs(q);
    const fetchedLogs: HabitLog[] = [];
    snap.forEach((doc) => {
      const data = doc.data();
      fetchedLogs.push({
        habit_id: data.habit_id,
        log_date: data.log_date,
      });
    });
    setLogs(fetchedLogs);
  };

  const fetchMindsetLogs = async () => {
    const mindsetRef = collection(db, 'mindset_logs');
    const q = query(
      mindsetRef,
      where('user_id', '==', user!.id),
      where('log_date', '>=', startStr),
      where('log_date', '<=', endStr)
    );
    const snap = await getDocs(q);
    const fetchedMindsets: MindsetLog[] = [];
    snap.forEach((doc) => {
      const data = doc.data();
      fetchedMindsets.push({
        log_date: data.log_date,
        mood: data.mood,
        energy: data.energy,
        focus: data.focus,
        motivation: data.motivation,
      });
    });
    setMindsetLogs(fetchedMindsets);
  };

  const addHabit = async () => {
    if (!newHabit.trim()) return;
    const colors = ['#8B5CF6', '#3B82F6', '#14B8A6', '#EC4899', '#F59E0B', '#06B6D4'];
    
    try {
      await addDoc(collection(db, 'habits'), {
        user_id: user!.id,
        name: newHabit.trim(),
        color: colors[habits.length % colors.length],
        created_at: serverTimestamp()
      });
      setNewHabit('');
      setShowForm(false);
      fetchHabits();
      toast.success('Habit added successfully!');
    } catch (err) {
      console.error('Error adding habit to Firestore:', err);
      toast.error('Failed to add habit');
    }
  };

  const deleteHabit = async (id: string) => {
    if (!confirm('Are you sure you want to delete this habit and all its logged history?')) return;
    try {
      await deleteDoc(doc(db, 'habits', id));
      
      const logsQuery = query(collection(db, 'habit_logs'), where('habit_id', '==', id));
      const logsSnap = await getDocs(logsQuery);
      const batch = writeBatch(db);
      logsSnap.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      fetchHabits(); 
      fetchLogs();
      toast.success('Habit deleted');
    } catch (err) {
      console.error('Error deleting habit from Firestore:', err);
      toast.error('Failed to delete habit');
    }
  };

  const toggleLog = async (habitId: string, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const logExists = logs.some(l => l.habit_id === habitId && l.log_date === dateStr);
    
    // Optimistic Update
    const originalLogs = [...logs];
    let updatedLogs;
    if (logExists) {
      updatedLogs = logs.filter(l => !(l.habit_id === habitId && l.log_date === dateStr));
    } else {
      updatedLogs = [...logs, { habit_id: habitId, log_date: dateStr }];
    }
    setLogs(updatedLogs);

    try {
      const logsQuery = query(
        collection(db, 'habit_logs'), 
        where('user_id', '==', user!.id),
        where('habit_id', '==', habitId),
        where('log_date', '==', dateStr)
      );
      const snap = await getDocs(logsQuery);
      
      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
      } else {
        await addDoc(collection(db, 'habit_logs'), {
          habit_id: habitId,
          user_id: user!.id,
          log_date: dateStr,
          completed: true,
          created_at: serverTimestamp()
        });
      }
      // Fetch in background to ensure sync
      fetchLogs();
    } catch (err) {
      console.error('Error toggling habit log in Firestore:', err);
      toast.error('Failed to update habit');
      setLogs(originalLogs); // Revert
    }
  };

  const saveMindset = async (dateStr: string, metric: MetricType, value: number | null) => {
    // Optimistic Update
    const originalLogs = [...mindsetLogs];
    const logIndex = mindsetLogs.findIndex(l => l.log_date === dateStr);
    let updatedLogs = [...mindsetLogs];
    
    if (logIndex >= 0) {
      const updatedLog = { ...updatedLogs[logIndex] };
      if (value === null) {
        delete (updatedLog as any)[metric];
      } else {
        (updatedLog as any)[metric] = value;
      }
      updatedLogs[logIndex] = updatedLog;
    } else if (value !== null) {
      const newLog = { log_date: dateStr, [metric]: value };
      updatedLogs.push(newLog);
    }
    setMindsetLogs(updatedLogs);
    setActiveMindsetEdit(null);

    try {
      const docRef = doc(db, 'mindset_logs', `${user!.id}_${dateStr}`);
      const currentLog = originalLogs.find(l => l.log_date === dateStr) || {};
      
      const updatedData = {
        user_id: user!.id,
        log_date: dateStr,
        mood: currentLog.mood,
        energy: currentLog.energy,
        focus: currentLog.focus,
        motivation: currentLog.motivation,
        updated_at: serverTimestamp(),
      };

      if (value === null) {
        delete (updatedData as any)[metric];
      } else {
        (updatedData as any)[metric] = value;
      }

      // Filter out any undefined properties so Firestore doesn't reject the write
      Object.keys(updatedData).forEach(key => {
        if ((updatedData as any)[key] === undefined) {
          delete (updatedData as any)[key];
        }
      });

      await setDoc(docRef, updatedData, { merge: true });
      fetchMindsetLogs();
    } catch (err) {
      console.error('Error saving mindset log to Firestore:', err);
      toast.error('Failed to save mindset rating');
      setMindsetLogs(originalLogs); // Revert
    }
  };

  const isCompleted = (habitId: string, date: Date) =>
    logs.some(l => l.habit_id === habitId && l.log_date === format(date, 'yyyy-MM-dd'));

  const getDayProgress = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const total = habits.length;
    if (total === 0) return { percent: 0, done: 0, notDone: 0 };
    
    const done = habits.filter(h => logs.some(l => l.habit_id === h.id && l.log_date === dateStr)).length;
    return {
      percent: Math.round((done / total) * 100),
      done,
      notDone: total - done
    };
  };

  const getMonthStats = () => {
    const totalPossible = habits.length * daysInMonth.length;
    const totalCompleted = logs.length;
    const progressPercent = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;
    
    return {
      habitsCount: habits.length,
      completedLogsCount: totalCompleted,
      progressPercent
    };
  };

  const getStreak = () => {
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const dStr = format(subDays(today, i), 'yyyy-MM-dd');
      const dayLogs = logs.filter(l => l.log_date === dStr);
      if (habits.length > 0 && dayLogs.length === habits.length) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  };

  const getMindsetCellBg = (val: number | undefined, metric: MetricType) => {
    if (!val) return 'transparent';
    const opacity = val / 10;
    switch (metric) {
      case 'mood': return `hsl(262 60% 55% / ${opacity})`;
      case 'energy': return `hsl(168 60% 40% / ${opacity})`;
      case 'focus': return `hsl(200 70% 50% / ${opacity})`;
      case 'motivation': return `hsl(38 92% 50% / ${opacity})`;
    }
  };

  // Recharts Monthly Progress Data
  const progressChartData = daysInMonth.map(d => {
    const stats = getDayProgress(d);
    return {
      day: format(d, 'd'),
      Progress: stats.percent
    };
  });

  // Recharts Mindset Data
  const mindsetChartData = daysInMonth.map(d => {
    const dateStr = format(d, 'yyyy-MM-dd');
    const log = mindsetLogs.find(l => l.log_date === dateStr);
    return {
      day: format(d, 'd'),
      Mood: log?.mood || null,
      Energy: log?.energy || null,
      Focus: log?.focus || null,
      Motivation: log?.motivation || null,
    };
  });

  const stats = getMonthStats();

  return (
    <div className="space-y-8 pb-10">
      {/* HEADER CONTROLS */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSelectedDate(addMonths(selectedDate, -1))}
              className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {format(selectedDate, 'MMMM yyyy')}
            </h1>
            <button 
              onClick={() => setSelectedDate(addMonths(selectedDate, 1))}
              className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Track your habits & daily mindset metrics</p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={() => setShowForm(!showForm)} size="sm" className="gap-1.5 shadow-sm">
            <Plus className="h-4 w-4" /> Add Habit
          </Button>
        </div>
      </div>

      {/* QUICK HABIT ADD FORM */}
      {showForm && (
        <div className="stat-card flex flex-col gap-4 max-w-md animate-in fade-in slide-in-from-top-3 duration-200">
          <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Create New Habit
          </h3>
          <div className="flex gap-2">
            <Input 
              value={newHabit} 
              onChange={e => setNewHabit(e.target.value)} 
              placeholder="e.g. Read 10 pages 📚, Drink Water 💧" 
              onKeyDown={e => e.key === 'Enter' && addHabit()} 
              className="flex-1" 
            />
            <Button onClick={addHabit}>Create</Button>
          </div>
        </div>
      )}

      {/* OVERALL MONTH PROGRESS */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="stat-card flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Number of habits</p>
            <p className="mt-2 text-3xl font-extrabold text-foreground">{stats.habitsCount}</p>
          </div>
          <Target className="h-5 w-5 text-primary opacity-50 mt-4 align-bottom" />
        </div>
        
        <div className="stat-card flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Completed habits</p>
            <p className="mt-2 text-3xl font-extrabold text-foreground">{stats.completedLogsCount}</p>
          </div>
          <Check className="h-5 w-5 text-emerald-500 opacity-50 mt-4" />
        </div>

        <div className="stat-card sm:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Progress</p>
              <span className="text-sm font-bold text-foreground">{stats.progressPercent}%</span>
            </div>
            <div className="mt-4 h-3 w-full rounded-full bg-muted overflow-hidden relative border border-border/40">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  stats.progressPercent > 50 ? 'bg-emerald-500 glow-progress-green' : 'bg-primary glow-progress'
                }`}
                style={{ width: `${stats.progressPercent}%` }} 
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">Total completions rate across this month</p>
        </div>
      </div>

      {/* LOADING STATE */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin mb-4" />
          <p className="text-sm">Loading tracker details...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
          
          {/* LEFT AREA: HABIT & MINDSET GRID, CHARTS */}
          <div className="lg:col-span-7 space-y-6 overflow-hidden">
            
            {/* HABIT GRID TABLE */}
            <div className="stat-card overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-4 border-b border-border/40 pb-3">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" /> Habit & Mindset Log Sheet
                </h2>
                <div className="text-xs text-muted-foreground">
                  * Click habit squares to toggle, click mindset cells to rate 1-10
                </div>
              </div>

              <div className="overflow-x-auto custom-scrollbar pb-3 select-none">
                <table className="w-full border-collapse">
                  <thead>
                    {/* Week Level headers */}
                    <tr>
                      <th className="text-left text-xs font-bold text-muted-foreground/80 pb-2 min-w-[150px] pr-4 border-r border-border/40">My Habits</th>
                      {weeks.map(week => (
                        <th 
                          key={week.name} 
                          colSpan={week.days.length} 
                          className={`text-center font-bold text-2xs uppercase tracking-wider py-1 border-r border-border/50 text-[10px] rounded-t-md border-t border-x ${week.colorClass}`}
                        >
                          {week.name}
                        </th>
                      ))}
                    </tr>
                    
                    {/* Days names */}
                    <tr>
                      <th className="border-r border-border/40" />
                      {weeks.map(week => 
                        week.days.map(day => (
                          <th 
                            key={day.toISOString()} 
                            className={`text-center text-[10px] font-semibold py-1 px-1 min-w-[28px] border-r border-border/30 last:border-r-2 ${week.cellClass}`}
                          >
                            {format(day, 'EEE').substring(0, 2)}
                          </th>
                        ))
                      )}
                    </tr>

                    {/* Date numbers */}
                    <tr className="border-b border-border">
                      <th className="border-r border-border/40" />
                      {weeks.map(week => 
                        week.days.map(day => (
                          <th 
                            key={day.toISOString()} 
                            className={`text-center text-xs font-bold pb-2 px-1 border-r border-border/30 last:border-r-2 ${
                              isToday(day) ? 'text-primary bg-primary/10 rounded-b-md' : 'text-muted-foreground/75'
                            }`}
                          >
                            {format(day, 'd')}
                          </th>
                        ))
                      )}
                    </tr>
                  </thead>
                  
                  <tbody>
                    {/* HABITS ROWS */}
                    {habits.map(h => (
                      <tr key={h.id} className="hover:bg-muted/30 border-b border-border/30 group">
                        <td className="py-2.5 pr-4 border-r border-border/40 max-w-[150px] truncate">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: h.color }} />
                              <span className="text-xs font-semibold text-foreground truncate">{h.name}</span>
                            </div>
                            <button 
                              onClick={() => deleteHabit(h.id)} 
                              className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-muted-foreground hover:text-destructive hover:bg-muted transition-all"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </td>
                        {weeks.map(week => 
                          week.days.map(day => {
                            const done = isCompleted(h.id, day);
                            return (
                              <td 
                                key={day.toISOString()} 
                                className="py-2.5 px-0.5 text-center border-r border-border/30 last:border-r-2"
                              >
                                <button
                                  onClick={() => toggleLog(h.id, day)}
                                  className={`mx-auto flex h-[22px] w-[22px] items-center justify-center rounded border transition-all ${
                                    done 
                                      ? 'border-transparent text-white shadow-sm font-bold' 
                                      : 'border-border/80 bg-background/50 hover:bg-muted/80 text-transparent hover:text-muted-foreground/30'
                                  }`}
                                  style={{ backgroundColor: done ? week.checkColor : 'transparent' }}
                                >
                                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                                </button>
                              </td>
                            );
                          })
                        )}
                      </tr>
                    ))}

                    {habits.length === 0 && (
                      <tr>
                        <td colSpan={daysInMonth.length + 1} className="py-8 text-center text-xs text-muted-foreground">
                          No habits added yet. Add your first habit above!
                        </td>
                      </tr>
                    )}

                    {/* DAILY SUM STATS FOOTERS */}
                    <tr className="border-t-2 border-border/80 bg-muted/20 font-medium">
                      <td className="py-2 pl-2 text-2xs font-semibold text-muted-foreground border-r border-border/40 uppercase tracking-wider text-[10px]">Progress</td>
                      {weeks.map(week => 
                        week.days.map(day => {
                          const stats = getDayProgress(day);
                          return (
                            <td key={day.toISOString()} className="py-2 text-center text-[10px] border-r border-border/30 last:border-r-2 font-bold text-foreground">
                              {stats.percent}%
                            </td>
                          );
                        })
                      )}
                    </tr>

                    <tr className="bg-muted/10 font-medium">
                      <td className="py-1.5 pl-2 text-2xs font-semibold text-emerald-500/80 border-r border-border/40 uppercase tracking-wider text-[10px]">Done</td>
                      {weeks.map(week => 
                        week.days.map(day => {
                          const stats = getDayProgress(day);
                          return (
                            <td key={day.toISOString()} className="py-1.5 text-center text-[10px] border-r border-border/30 last:border-r-2 text-emerald-500 font-bold">
                              {stats.done}
                            </td>
                          );
                        })
                      )}
                    </tr>

                    <tr className="border-b border-border/80 bg-muted/10 font-medium">
                      <td className="py-1.5 pl-2 text-2xs font-semibold text-muted-foreground/60 border-r border-border/40 uppercase tracking-wider text-[10px]">Not Done</td>
                      {weeks.map(week => 
                        week.days.map(day => {
                          const stats = getDayProgress(day);
                          return (
                            <td key={day.toISOString()} className="py-1.5 text-center text-[10px] border-r border-border/30 last:border-r-2 text-muted-foreground/60">
                              {stats.notDone}
                            </td>
                          );
                        })
                      )}
                    </tr>

                    {/* GAP ROW */}
                    <tr>
                      <td colSpan={daysInMonth.length + 1} className="py-3 bg-muted/40 border-y border-border" />
                    </tr>

                    {/* MINDSET TRACKER SECTION HEADER */}
                    <tr className="bg-muted/20">
                      <td className="py-2 pl-2 text-xs font-bold text-foreground border-r border-border/40 uppercase tracking-wider flex items-center gap-1.5">
                        <Smile className="h-3.5 w-3.5 text-purple-500" /> Mindset
                      </td>
                      <td colSpan={daysInMonth.length} className="py-2 text-2xs text-muted-foreground italic pl-3 border-b border-border/20">
                        Rate metrics from 1 (lowest) to 10 (highest)
                      </td>
                    </tr>

                    {/* MINDSET METRIC ROWS */}
                    {(['mood', 'energy', 'focus', 'motivation'] as MetricType[]).map(metric => {
                      const icons = {
                        mood: <Smile className="h-3.5 w-3.5 text-purple-400" />,
                        energy: <Activity className="h-3.5 w-3.5 text-teal-400" />,
                        focus: <BrainCircuit className="h-3.5 w-3.5 text-blue-400" />,
                        motivation: <HeartHandshake className="h-3.5 w-3.5 text-amber-400" />
                      };
                      return (
                        <tr key={metric} className="hover:bg-muted/30 border-b border-border/30">
                          <td className="py-2.5 pr-4 border-r border-border/40 font-semibold text-xs text-foreground capitalize flex items-center gap-2">
                            {icons[metric]} {metric}
                          </td>
                          {weeks.map(week => 
                            week.days.map(day => {
                              const dStr = format(day, 'yyyy-MM-dd');
                              const mLog = mindsetLogs.find(l => l.log_date === dStr);
                              const val = mLog ? (mLog as any)[metric] : undefined;
                              return (
                                <td 
                                  key={day.toISOString()} 
                                  className="p-0 border-r border-border/30 last:border-r-2 relative"
                                >
                                  <button
                                    onClick={() => setActiveMindsetEdit({ 
                                      dateStr: dStr, 
                                      metric, 
                                      currentValue: val 
                                    })}
                                    className="w-full h-[32px] text-center text-xs font-bold transition-all hover:brightness-110 flex items-center justify-center"
                                    style={{ 
                                      backgroundColor: getMindsetCellBg(val, metric),
                                      color: val ? '#ffffff' : 'hsl(var(--muted-foreground) / 0.5)'
                                    }}
                                  >
                                    {val || '-'}
                                  </button>

                                  {/* Absolute Custom Inline Popover overlay */}
                                  {activeMindsetEdit && 
                                   activeMindsetEdit.dateStr === dStr && 
                                   activeMindsetEdit.metric === metric && (
                                    <div className="absolute left-1/2 -translate-x-1/2 bottom-[34px] z-50 bg-card border border-border rounded-xl shadow-2xl p-2.5 flex flex-col gap-2 min-w-[210px] animate-in fade-in zoom-in-95 duration-150">
                                      <div className="flex items-center justify-between border-b border-border/50 pb-1.5 mb-1 select-none">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                          Rate {metric} ({format(day, 'MMM d')})
                                        </span>
                                        <button 
                                          onClick={() => setActiveMindsetEdit(null)}
                                          className="text-muted-foreground hover:text-foreground p-0.5 rounded-md hover:bg-muted"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </div>
                                      <div className="grid grid-cols-5 gap-1 select-none">
                                        {Array.from({ length: 10 }, (_, i) => i + 1).map(v => (
                                          <button
                                            key={v}
                                            onClick={() => saveMindset(dStr, metric, v)}
                                            className={`h-7 w-7 text-xs font-bold rounded-lg border hover:bg-primary hover:text-white hover:border-transparent transition-all ${
                                              val === v ? 'bg-primary text-white border-transparent' : 'border-border bg-background'
                                            }`}
                                          >
                                            {v}
                                          </button>
                                        ))}
                                      </div>
                                      <div className="border-t border-border/50 pt-1 flex justify-end">
                                        <button
                                          onClick={() => saveMindset(dStr, metric, null)}
                                          className="text-[10px] font-medium text-destructive hover:underline"
                                        >
                                          Clear Rating
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </td>
                              );
                            })
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* MONTH HABIT COMPLETION AREA CHART */}
            <div className="stat-card">
              <h3 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
                <BarChart3 className="h-4.5 w-4.5 text-primary" /> Habit Completion Profile
              </h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={progressChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorProgress" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" />
                    <XAxis dataKey="day" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 11 }}
                      formatter={(val: number) => [`${val}%`, 'Daily Progress']}
                    />
                    <Area type="monotone" dataKey="Progress" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorProgress)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* MONTH MINDSET LINE CHART */}
            <div className="stat-card">
              <h3 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="h-4.5 w-4.5 text-primary" /> Mindset & Energy Tracking
              </h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mindsetChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" />
                    <XAxis dataKey="day" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} domain={[1, 10]} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 11 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="Mood" stroke="#8B5CF6" strokeWidth={2.5} dot={{ r: 3 }} connectNulls activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="Energy" stroke="#14B8A6" strokeWidth={2.5} dot={{ r: 3 }} connectNulls activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="Focus" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 3 }} connectNulls activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="Motivation" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 3 }} connectNulls activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* RIGHT AREA: ANALYTICS SIDEBAR */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* STREAK WIDGET */}
            <div className="stat-card bg-gradient-to-br from-amber-500/10 via-transparent to-transparent flex items-center justify-between border-amber-500/20">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Perfect Streak</p>
                <p className="text-2xl font-black text-foreground mt-1 flex items-center gap-1.5">
                  <Flame className="h-6 w-6 text-amber-500 animate-pulse fill-amber-500/20" />
                  {getStreak()} Days
                </p>
                <p className="text-3xs text-muted-foreground mt-1">Consequent days completing all habits</p>
              </div>
              <Award className="h-10 w-10 text-amber-500/30" />
            </div>

            {/* HABITS BREAKDOWN RATE CARD */}
            <div className="stat-card">
              <h3 className="font-bold text-sm text-foreground mb-4 flex items-center gap-2 border-b border-border/40 pb-2">
                <Target className="h-4 w-4 text-primary" /> Habit Performance
              </h3>
              
              <div className="space-y-4">
                {habits.map(h => {
                  const habitLogsCount = logs.filter(l => l.habit_id === h.id).length;
                  const rate = daysInMonth.length > 0 ? Math.round((habitLogsCount / daysInMonth.length) * 100) : 0;
                  return (
                    <div key={h.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground truncate max-w-[150px]">{h.name}</span>
                        <span className="font-bold text-muted-foreground">{rate}% ({habitLogsCount}/{daysInMonth.length})</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-300"
                          style={{ 
                            width: `${rate}%`, 
                            backgroundColor: h.color 
                          }}
                        />
                      </div>
                    </div>
                  );
                })}

                {habits.length === 0 && (
                  <p className="text-xs text-muted-foreground py-4 text-center">No active habits to analyze.</p>
                )}
              </div>
            </div>

            {/* WEEKLY BREAKDOWN PROGRESS CARD */}
            <div className="stat-card">
              <h3 className="font-bold text-sm text-foreground mb-4 flex items-center gap-2 border-b border-border/40 pb-2">
                <BarChart3 className="h-4 w-4 text-primary" /> Weekly Progress
              </h3>

              <div className="space-y-4">
                {weeks.map(week => {
                  const weekPossible = week.days.length * habits.length;
                  const weekLogsCount = logs.filter(l => 
                    week.days.some(day => l.log_date === format(day, 'yyyy-MM-dd'))
                  ).length;
                  
                  const weekRate = weekPossible > 0 ? Math.round((weekLogsCount / weekPossible) * 100) : 0;
                  
                  return (
                    <div key={week.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className={`font-semibold ${week.cellClass}`}>{week.name}</span>
                        <span className="font-bold text-foreground">{weekRate}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-300"
                          style={{ 
                            width: `${weekRate}%`,
                            backgroundColor: week.checkColor
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
};

export default Habits;
