import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { toast } from 'sonner';

type FinancialRecord = {
  id: string;
  type: string;
  amount: number;
  category: string;
  description: string | null;
  record_date: string;
};

const CATEGORIES = {
  income: ['Salary', 'Freelance', 'Investment', 'Other'],
  expense: ['Food', 'Transport', 'Rent', 'Shopping', 'Entertainment', 'Utilities', 'Health', 'Other'],
};

const COLORS = ['#14B8A6', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#84CC16'];

const Finances = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  useEffect(() => {
    if (user) fetchRecords();
  }, [user, selectedMonth]);

  const fetchRecords = async () => {
    const start = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
    const end = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');
    
    try {
      const recordsRef = collection(db, 'financial_records');
      const q = query(
        recordsRef,
        where('user_id', '==', user!.id),
        where('record_date', '>=', start),
        where('record_date', '<=', end)
      );
      const querySnapshot = await getDocs(q);
      const fetchedRecords: FinancialRecord[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedRecords.push({
          id: doc.id,
          type: data.type,
          amount: Number(data.amount),
          category: data.category,
          description: data.description || null,
          record_date: data.record_date,
        });
      });
      // Sort locally to avoid needing complex composite index setups in Firestore
      fetchedRecords.sort((a, b) => b.record_date.localeCompare(a.record_date));
      setRecords(fetchedRecords);
    } catch (err) {
      console.error('Error fetching financial records from Firestore:', err);
      toast.error('Failed to load records');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category) return;
    
    try {
      await addDoc(collection(db, 'financial_records'), {
        user_id: user!.id,
        type,
        amount: parseFloat(amount),
        category,
        description: description || null,
        record_date: date,
        created_at: serverTimestamp()
      });
      toast.success('Record added');
      setAmount(''); setCategory(''); setDescription('');
      setShowForm(false);
      fetchRecords();
    } catch (err) {
      console.error('Error adding record to Firestore:', err);
      toast.error('Failed to add record');
    }
  };

  const deleteRecord = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'financial_records', id));
      toast.success('Record deleted');
      fetchRecords();
    } catch (err) {
      console.error('Error deleting record from Firestore:', err);
      toast.error('Failed to delete record');
    }
  };

  const income = records.filter(r => r.type === 'income').reduce((s, r) => s + Number(r.amount), 0);
  const expenses = records.filter(r => r.type === 'expense').reduce((s, r) => s + Number(r.amount), 0);

  const expenseByCategory = records
    .filter(r => r.type === 'expense')
    .reduce((acc, r) => {
      acc[r.category] = (acc[r.category] || 0) + Number(r.amount);
      return acc;
    }, {} as Record<string, number>);

  const pieData = Object.entries(expenseByCategory).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Finances</h1>
          <p className="text-sm text-muted-foreground">{format(selectedMonth, 'MMMM yyyy')}</p>
        </div>
        <div className="flex gap-2">
          <Input
            type="month"
            value={format(selectedMonth, 'yyyy-MM')}
            onChange={e => setSelectedMonth(new Date(e.target.value + '-01'))}
            className="w-40"
          />
          <Button onClick={() => setShowForm(!showForm)} size="sm" className="gap-1">
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="stat-card">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><TrendingUp className="h-4 w-4 text-emerald-500" />Income</div>
          <p className="mt-1 text-2xl font-bold text-foreground">${income.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><TrendingDown className="h-4 w-4 text-red-500" />Expenses</div>
          <p className="mt-1 text-2xl font-bold text-foreground">${expenses.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">Balance</div>
          <p className={`mt-1 text-2xl font-bold ${income - expenses >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            ${(income - expenses).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Pie chart */}
      {pieData.length > 0 && (
        <div className="stat-card">
          <h2 className="text-lg font-semibold text-foreground mb-4">Expense Breakdown</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" paddingAngle={2}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 mt-4 justify-center">
            {pieData.map((entry, i) => (
              <div key={entry.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                {entry.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="stat-card space-y-4">
          <h3 className="font-semibold text-foreground">Add Record</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select value={type} onValueChange={(v: 'income' | 'expense') => { setType(v); setCategory(''); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
            <Input type="number" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} step="0.01" required />
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES[type].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <Input placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} />
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      )}

      {/* Records list */}
      <div className="space-y-2">
        {records.map(r => (
          <div key={r.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${r.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                {r.type === 'income' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{r.category}</p>
                <p className="text-xs text-muted-foreground">{r.description || format(new Date(r.record_date), 'MMM d, yyyy')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`font-semibold ${r.type === 'income' ? 'text-emerald-500' : 'text-red-500'}`}>
                {r.type === 'income' ? '+' : '-'}${Number(r.amount).toLocaleString()}
              </span>
              <button onClick={() => deleteRecord(r.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {records.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <p className="text-sm">No records for this month</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowForm(true)}>Add your first record</Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Finances;
