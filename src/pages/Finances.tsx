import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { 
  collection, query, where, getDocs, addDoc, deleteDoc, 
  doc, getDoc, setDoc, serverTimestamp 
} from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, Trash2, TrendingUp, TrendingDown, Wallet, PiggyBank, 
  CreditCard, Receipt, ShieldAlert, Sparkles, CheckCircle2, AlertTriangle, Pencil 
} from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { toast } from 'sonner';
import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, 
  DialogTitle, DialogFooter 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

type FinancialRecord = {
  id: string;
  type: string;
  amount: number;
  category: string;
  description: string | null;
  record_date: string;
};

type BudgetAllocation = {
  category: string;
  allocated: number;
};

const CATEGORIES = {
  income: ['Salary', 'Freelance', 'Investment', 'Other'],
  expense: ['Food', 'Transport', 'Rent', 'Shopping', 'Entertainment', 'Utilities', 'Health', 'Other'],
};

const BUDGET_PRESETS = [
  'Savings', 'Rent', 'Groceries', 'Debt', 'Food', 'Utilities', 
  'Transport', 'Entertainment', 'Shopping', 'Health', 'Investment', 'Other'
];

const COLORS = ['#14B8A6', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#84CC16'];

const getCategoryIcon = (category: string) => {
  const c = category.toLowerCase();
  if (c.includes('saving') || c.includes('invest')) return <PiggyBank className="h-4 w-4 text-emerald-400" />;
  if (c.includes('debt') || c.includes('loan') || c.includes('credit')) return <CreditCard className="h-4 w-4 text-rose-400" />;
  if (c.includes('rent') || c.includes('house') || c.includes('home') || c.includes('utilit')) return <Wallet className="h-4 w-4 text-blue-400" />;
  if (c.includes('grocer') || c.includes('food') || c.includes('eat') || c.includes('shop')) return <Receipt className="h-4 w-4 text-amber-400" />;
  return <Wallet className="h-4 w-4 text-slate-400" />;
};

const Finances = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'records' | 'planner'>('records');
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  // Budget Planner State
  const [plannedIncome, setPlannedIncome] = useState<number>(0);
  const [incomeInput, setIncomeInput] = useState('');
  const [budgetAllocations, setBudgetAllocations] = useState<BudgetAllocation[]>([]);
  const [isBudgetLoading, setIsBudgetLoading] = useState(true);
  const [allocCategory, setAllocCategory] = useState('');
  const [allocAmount, setAllocAmount] = useState('');

  // Edit Record States
  const [isEditRecordOpen, setIsEditRecordOpen] = useState(false);
  const [editRecordId, setEditRecordId] = useState('');
  const [editRecordType, setEditRecordType] = useState<'income' | 'expense'>('expense');
  const [editRecordAmount, setEditRecordAmount] = useState('');
  const [editRecordCategory, setEditRecordCategory] = useState('');
  const [editRecordDescription, setEditRecordDescription] = useState('');
  const [editRecordDate, setEditRecordDate] = useState('');

  useEffect(() => {
    if (user) {
      fetchRecords();
      fetchBudgets();
    }
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
      fetchedRecords.sort((a, b) => b.record_date.localeCompare(a.record_date));
      setRecords(fetchedRecords);
    } catch (err) {
      console.error('Error fetching financial records from Firestore:', err);
      toast.error('Failed to load records');
    }
  };

  const fetchBudgets = async () => {
    setIsBudgetLoading(true);
    const monthStr = format(selectedMonth, 'yyyy-MM');
    try {
      // 1. Fetch Planned Income meta
      const metaRef = doc(db, 'monthly_budgets_meta', `${user!.id}_${monthStr}`);
      const metaSnap = await getDoc(metaRef);
      let incomeVal = 0;
      if (metaSnap.exists()) {
        incomeVal = Number(metaSnap.data().planned_income) || 0;
      }
      setPlannedIncome(incomeVal);
      setIncomeInput(incomeVal > 0 ? incomeVal.toString() : '');

      // 2. Fetch category allocations
      const budgetRef = collection(db, 'monthly_budgets');
      const q = query(
        budgetRef,
        where('user_id', '==', user!.id),
        where('month', '==', monthStr)
      );
      const snap = await getDocs(q);
      const allocs: BudgetAllocation[] = [];
      snap.forEach((doc) => {
        const data = doc.data();
        allocs.push({
          category: data.category,
          allocated: Number(data.allocated) || 0
        });
      });
      setBudgetAllocations(allocs);
    } catch (err) {
      console.error('Error fetching budget plans from Firestore:', err);
    } finally {
      setIsBudgetLoading(false);
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

  const handleOpenEditRecord = (record: FinancialRecord) => {
    setEditRecordId(record.id);
    setEditRecordType(record.type as 'income' | 'expense');
    setEditRecordAmount(record.amount.toString());
    setEditRecordCategory(record.category);
    setEditRecordDescription(record.description || '');
    setEditRecordDate(record.record_date);
    setIsEditRecordOpen(true);
  };

  const handleUpdateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRecordAmount || !editRecordCategory) {
      toast.error('Amount and Category are required');
      return;
    }
    try {
      const recordRef = doc(db, 'financial_records', editRecordId);
      await setDoc(recordRef, {
        type: editRecordType,
        amount: parseFloat(editRecordAmount),
        category: editRecordCategory,
        description: editRecordDescription || null,
        record_date: editRecordDate,
      }, { merge: true });
      toast.success('Record updated successfully');
      setIsEditRecordOpen(false);
      fetchRecords();
    } catch (err) {
      console.error('Error updating record in Firestore:', err);
      toast.error('Failed to update record');
    }
  };

  const handleSaveIncome = async () => {
    const amt = parseFloat(incomeInput);
    if (isNaN(amt) || amt < 0) {
      toast.error('Please enter a valid planned paycheck amount');
      return;
    }
    const monthStr = format(selectedMonth, 'yyyy-MM');
    try {
      const metaRef = doc(db, 'monthly_budgets_meta', `${user!.id}_${monthStr}`);
      await setDoc(metaRef, {
        user_id: user!.id,
        month: monthStr,
        planned_income: amt,
        updated_at: serverTimestamp()
      }, { merge: true });
      setPlannedIncome(amt);
      toast.success('Planned paycheck updated!');
      fetchBudgets();
    } catch (err) {
      console.error('Error saving planned paycheck to Firestore:', err);
      toast.error('Failed to update paycheck');
    }
  };

  const handleSaveAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocCategory || !allocAmount) return;
    const amt = parseFloat(allocAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Please enter a valid allocation amount');
      return;
    }
    const monthStr = format(selectedMonth, 'yyyy-MM');
    try {
      const budgetId = `${user!.id}_${monthStr}_${allocCategory}`;
      const budgetRef = doc(db, 'monthly_budgets', budgetId);
      await setDoc(budgetRef, {
        user_id: user!.id,
        month: monthStr,
        category: allocCategory,
        allocated: amt,
        created_at: serverTimestamp()
      }, { merge: true });
      
      toast.success(`Allocated $${amt} for ${allocCategory}`);
      setAllocCategory('');
      setAllocAmount('');
      fetchBudgets();
    } catch (err) {
      console.error('Error saving budget allocation to Firestore:', err);
      toast.error('Failed to save allocation');
    }
  };

  const handleDeleteAllocation = async (catName: string) => {
    const monthStr = format(selectedMonth, 'yyyy-MM');
    try {
      const budgetId = `${user!.id}_${monthStr}_${catName}`;
      await deleteDoc(doc(db, 'monthly_budgets', budgetId));
      toast.success(`Budget for ${catName} removed`);
      fetchBudgets();
    } catch (err) {
      console.error('Error removing budget allocation from Firestore:', err);
      toast.error('Failed to remove budget');
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

  // Budget calculations
  const totalAllocated = budgetAllocations.reduce((sum, a) => sum + a.allocated, 0);
  const remainingToAllocate = plannedIncome - totalAllocated;
  const allocationPercent = plannedIncome > 0 ? Math.min(100, Math.round((totalAllocated / plannedIncome) * 100)) : 0;

  const getSpentForCategory = (cat: string) => {
    // Sum absolute values of financial records in this category (often logged as expenses)
    return records
      .filter(r => r.category.toLowerCase() === cat.toLowerCase())
      .reduce((sum, r) => sum + r.amount, 0);
  };

  return (
    <div className="space-y-6 pb-10">
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
          {activeTab === 'records' && (
            <Button onClick={() => setShowForm(!showForm)} size="sm" className="gap-1">
              <Plus className="h-4 w-4" /> Add Record
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-border/40 pb-1.5 gap-6 select-none">
        <button
          onClick={() => setActiveTab('records')}
          className={`pb-2 text-sm font-semibold transition-all relative ${
            activeTab === 'records' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Transactions & Overview
          {activeTab === 'records' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full animate-in fade-in duration-200" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('planner')}
          className={`pb-2 text-sm font-semibold transition-all relative ${
            activeTab === 'planner' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Monthly Paycheck Planner
          {activeTab === 'planner' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full animate-in fade-in duration-200" />
          )}
        </button>
      </div>

      {activeTab === 'records' ? (
        <>
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
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} disabled className="opacity-60 cursor-not-allowed" />
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
              <div key={r.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4 hover:shadow-sm hover:border-border/80 transition-all duration-200 group">
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
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-150">
                    <button 
                      onClick={() => handleOpenEditRecord(r)} 
                      className="text-muted-foreground hover:text-foreground transition-colors p-1.5 hover:bg-muted rounded-lg"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => deleteRecord(r.id)} 
                      className="text-muted-foreground hover:text-destructive transition-colors p-1.5 hover:bg-muted rounded-lg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
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
        </>
      ) : (
        <div className="space-y-6">
          {/* Paycheck Planner Info Card */}
          <div className="grid gap-6 md:grid-cols-3">
            <div className="stat-card md:col-span-2 flex flex-col justify-between space-y-4">
              <div>
                <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" /> Paycheck Allocation Strategy
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Allocate your paycheck into specific budget pots (Savings, Groceries, Rent, Debt) before the month starts to practice Zero-Based Budgeting.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-foreground">
                  <span>Paycheck Allocated ({allocationPercent}%)</span>
                  <span>${totalAllocated.toLocaleString()} of ${plannedIncome.toLocaleString()}</span>
                </div>
                <div className="h-3 w-full rounded-full bg-muted overflow-hidden border border-border/40 relative">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      remainingToAllocate < 0 
                        ? 'bg-rose-500' 
                        : remainingToAllocate === 0 && plannedIncome > 0
                        ? 'bg-emerald-500 glow-progress-green' 
                        : 'bg-primary glow-progress'
                    }`}
                    style={{ width: `${plannedIncome > 0 ? (totalAllocated / plannedIncome) * 100 : 0}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-xs mt-1.5">
                  {remainingToAllocate > 0 ? (
                    <span className="text-amber-500 font-semibold flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" /> ${remainingToAllocate.toLocaleString()} left to allocate
                    </span>
                  ) : remainingToAllocate === 0 && plannedIncome > 0 ? (
                    <span className="text-emerald-500 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Zero-based: Paycheck fully allocated!
                    </span>
                  ) : remainingToAllocate < 0 ? (
                    <span className="text-rose-500 font-semibold flex items-center gap-1">
                      <ShieldAlert className="h-3.5 w-3.5" /> Over-allocated by ${Math.abs(remainingToAllocate).toLocaleString()}!
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Setup planned income to start budgeting</span>
                  )}
                </div>
              </div>
            </div>

            <div className="stat-card flex flex-col justify-between gap-3">
              <div>
                <h3 className="font-bold text-foreground text-sm">Monthly Paycheck</h3>
                <p className="text-2xs text-muted-foreground mt-0.5">Enter your expected net income for this month</p>
              </div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="e.g. 4000"
                  value={incomeInput}
                  onChange={e => setIncomeInput(e.target.value)}
                  className="h-9 shadow-sm"
                />
                <Button onClick={handleSaveIncome} size="sm">Save</Button>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-10">
            {/* Allocations display */}
            <div className="lg:col-span-6 space-y-4">
              <div className="stat-card">
                <h3 className="font-bold text-foreground text-sm mb-4">Budget Allocations & Tracking</h3>

                {isBudgetLoading ? (
                  <div className="flex justify-center py-10 text-muted-foreground text-xs">
                    Loading allocations...
                  </div>
                ) : budgetAllocations.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
                    <p className="text-xs">No allocations defined for this month.</p>
                    <p className="text-3xs text-muted-foreground/60 mt-1">Use the planner on the right to allocate your paycheck.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {budgetAllocations.map(a => {
                      const spent = getSpentForCategory(a.category);
                      const percent = a.allocated > 0 ? Math.min(100, Math.round((spent / a.allocated) * 100)) : 0;
                      const isOverBudget = spent > a.allocated;

                      return (
                        <div key={a.category} className="space-y-2 p-3.5 rounded-xl border border-border bg-card/50 hover:bg-card hover:shadow-sm transition-all duration-200 group">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="p-2 rounded-lg bg-muted flex items-center justify-center">
                                {getCategoryIcon(a.category)}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-foreground truncate">{a.category}</h4>
                                <p className="text-3xs text-muted-foreground">
                                  ${spent.toLocaleString()} spent of ${a.allocated.toLocaleString()} allocated
                                </p>
                              </div>
                            </div>

                            <button
                              onClick={() => handleDeleteAllocation(a.category)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive hover:bg-muted rounded-lg transition-all"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="space-y-1">
                            <div className="h-2 w-full rounded-full bg-muted overflow-hidden relative">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isOverBudget ? 'bg-rose-500' : percent === 100 ? 'bg-emerald-500' : 'bg-primary'
                                }`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-semibold">
                              <span className={isOverBudget ? 'text-rose-500' : 'text-muted-foreground'}>
                                {percent}% spent
                              </span>
                              {isOverBudget ? (
                                <span className="text-rose-500">
                                  Over budget by ${(spent - a.allocated).toLocaleString()}!
                                </span>
                              ) : (
                                <span className="text-emerald-500">
                                  ${(a.allocated - spent).toLocaleString()} left
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Allocation Form */}
            <div className="lg:col-span-4">
              <form onSubmit={handleSaveAllocation} className="stat-card space-y-4">
                <h3 className="font-bold text-foreground text-sm">Add / Update Allocation</h3>
                <p className="text-2xs text-muted-foreground mt-0.5">
                  Set target budgets for savings goals or monthly expense categories.
                </p>

                <div className="space-y-3 select-none">
                  <div className="space-y-1">
                    <label className="text-3xs font-bold text-muted-foreground/80 uppercase">Category</label>
                    <Select value={allocCategory} onValueChange={setAllocCategory}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select Category" /></SelectTrigger>
                      <SelectContent>
                        {BUDGET_PRESETS.map(preset => (
                          <SelectItem key={preset} value={preset}>{preset}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-3xs font-bold text-muted-foreground/80 uppercase">Allocated Amount ($)</label>
                    <Input
                      type="number"
                      placeholder="e.g. 500"
                      value={allocAmount}
                      onChange={e => setAllocAmount(e.target.value)}
                      className="h-9 shadow-sm"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full text-xs h-9 gap-1.5 shadow-sm">
                  <Plus className="h-4 w-4" /> Allocate Budget
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Record Dialog Modal */}
      <Dialog open={isEditRecordOpen} onOpenChange={setIsEditRecordOpen}>
        <DialogContent className="max-w-md bg-card border border-border shadow-2xl rounded-2xl p-6">
          <form onSubmit={handleUpdateRecord} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Pencil className="h-5 w-5 text-primary" /> Edit Record
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Update the details of this financial transaction.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 select-none">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-record-type" className="text-xs font-bold text-muted-foreground/80 uppercase">Type</Label>
                  <Select value={editRecordType} onValueChange={(v: 'income' | 'expense') => { setEditRecordType(v); setEditRecordCategory(''); }}>
                    <SelectTrigger id="edit-record-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-record-amount" className="text-xs font-bold text-muted-foreground/80 uppercase">Amount</Label>
                  <Input 
                    id="edit-record-amount" 
                    type="number" 
                    placeholder="Amount" 
                    value={editRecordAmount} 
                    onChange={e => setEditRecordAmount(e.target.value)} 
                    step="0.01" 
                    required 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-record-category" className="text-xs font-bold text-muted-foreground/80 uppercase">Category</Label>
                  <Select value={editRecordCategory} onValueChange={setEditRecordCategory}>
                    <SelectTrigger id="edit-record-category"><SelectValue placeholder="Category" /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES[editRecordType].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-record-date" className="text-xs font-bold text-muted-foreground/80 uppercase">Date (Locked)</Label>
                  <Input id="edit-record-date" type="date" value={editRecordDate} onChange={e => setEditRecordDate(e.target.value)} disabled className="opacity-60 cursor-not-allowed" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-record-desc" className="text-xs font-bold text-muted-foreground/80 uppercase">Description (optional)</Label>
                <Input 
                  id="edit-record-desc" 
                  placeholder="Details..." 
                  value={editRecordDescription} 
                  onChange={e => setEditRecordDescription(e.target.value)} 
                />
              </div>
            </div>

            <DialogFooter className="pt-2 flex gap-2 justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsEditRecordOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Finances;
