import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { 
  Briefcase, GraduationCap, Search, Plus, Trash2, ExternalLink, 
  Loader2, Sparkles, Filter, Pencil 
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';

type Application = {
  id: string;
  title: string;
  organization: string;
  type: 'job' | 'scholarship';
  status: 'Saved' | 'Applied' | 'Interviewing' | 'Offer' | 'Accepted' | 'Rejected';
  date: string;
  url?: string;
  notes?: string;
};

const Applications = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtering and Searching
  const [filterType, setFilterType] = useState<'all' | 'job' | 'scholarship'>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Dialog Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [appTitle, setAppTitle] = useState('');
  const [appOrg, setAppOrg] = useState('');
  const [appType, setAppType] = useState<'job' | 'scholarship'>('job');
  const [appStatus, setAppStatus] = useState<Application['status']>('Applied');
  const [appDate, setAppDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [appUrl, setAppUrl] = useState('');
  const [appNotes, setAppNotes] = useState('');

  // Edit Dialog Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editAppId, setEditAppId] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editOrg, setEditOrg] = useState('');
  const [editType, setEditType] = useState<'job' | 'scholarship'>('job');
  const [editStatus, setEditStatus] = useState<Application['status']>('Applied');
  const [editDate, setEditDate] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editNotes, setEditNotes] = useState('');

  useEffect(() => {
    if (user) {
      fetchApplications();
    }
  }, [user]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const appsRef = collection(db, 'applications');
      const q = query(appsRef, where('user_id', '==', user!.id));
      const snap = await getDocs(q);
      const fetched: Application[] = [];
      snap.forEach((doc) => {
        const data = doc.data();
        fetched.push({
          id: doc.id,
          title: data.title,
          organization: data.organization,
          type: data.type,
          status: data.status,
          date: data.date,
          url: data.url || '',
          notes: data.notes || '',
        });
      });
      fetched.sort((a, b) => b.date.localeCompare(a.date));
      setApplications(fetched);
    } catch (err) {
      console.error('Error fetching applications:', err);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleAddApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appTitle.trim() || !appOrg.trim()) {
      toast.error('Title and Organization are required');
      return;
    }
    try {
      await addDoc(collection(db, 'applications'), {
        user_id: user!.id,
        title: appTitle.trim(),
        organization: appOrg.trim(),
        type: appType,
        status: appStatus,
        date: appDate,
        url: appUrl.trim() || null,
        notes: appNotes.trim() || null,
        created_at: serverTimestamp(),
      });
      toast.success('Application added!');
      // Reset form states
      setAppTitle('');
      setAppOrg('');
      setAppType('job');
      setAppStatus('Applied');
      setAppDate(format(new Date(), 'yyyy-MM-dd'));
      setAppUrl('');
      setAppNotes('');
      setIsAddOpen(false);
      fetchApplications();
    } catch (err) {
      console.error('Error adding application:', err);
      toast.error('Failed to track application');
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: Application['status']) => {
    try {
      const appRef = doc(db, 'applications', id);
      await updateDoc(appRef, { status: newStatus });
      toast.success('Status updated');
      setApplications(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Failed to update status');
    }
  };

  const handleDeleteApplication = async (id: string) => {
    if (!confirm('Are you sure you want to delete this application record?')) return;
    try {
      await deleteDoc(doc(db, 'applications', id));
      toast.success('Application deleted');
      setApplications(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error('Error deleting application:', err);
      toast.error('Failed to delete application');
    }
  };

  const handleOpenEdit = (app: Application) => {
    setEditAppId(app.id);
    setEditTitle(app.title);
    setEditOrg(app.organization);
    setEditType(app.type);
    setEditStatus(app.status);
    setEditDate(app.date);
    setEditUrl(app.url || '');
    setEditNotes(app.notes || '');
    setIsEditOpen(true);
  };

  const handleUpdateApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim() || !editOrg.trim()) {
      toast.error('Title and Organization are required');
      return;
    }
    try {
      const appRef = doc(db, 'applications', editAppId);
      await updateDoc(appRef, {
        title: editTitle.trim(),
        organization: editOrg.trim(),
        type: editType,
        status: editStatus,
        date: editDate,
        url: editUrl.trim() || null,
        notes: editNotes.trim() || null,
      });
      toast.success('Application updated!');
      setIsEditOpen(false);
      fetchApplications();
    } catch (err) {
      console.error('Error updating application:', err);
      toast.error('Failed to update application');
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Applications</h1>
          <p className="text-sm text-muted-foreground">Track and manage jobs & scholarship applications</p>
        </div>
        <div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 shadow-sm">
                <Plus className="h-4 w-4" /> Add Application
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md bg-card border border-border shadow-2xl rounded-2xl p-6">
              <form onSubmit={handleAddApplication} className="space-y-4">
                <DialogHeader>
                  <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-primary" /> Track New Application
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Record details of a job or scholarship application.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="app-title" className="text-xs font-bold text-muted-foreground/80 uppercase">Title / Role</Label>
                    <Input id="app-title" placeholder="e.g. Software Engineer, Merit Scholarship" value={appTitle} onChange={e => setAppTitle(e.target.value)} required />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="app-org" className="text-xs font-bold text-muted-foreground/80 uppercase">Company / Organization</Label>
                    <Input id="app-org" placeholder="e.g. Google, University of Oxford" value={appOrg} onChange={e => setAppOrg(e.target.value)} required />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="app-type" className="text-xs font-bold text-muted-foreground/80 uppercase">Type</Label>
                      <Select value={appType} onValueChange={(v: 'job' | 'scholarship') => setAppType(v)}>
                        <SelectTrigger id="app-type"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="job">Job Application</SelectItem>
                          <SelectItem value="scholarship">Scholarship</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="app-status" className="text-xs font-bold text-muted-foreground/80 uppercase">Status</Label>
                      <Select value={appStatus} onValueChange={(v: Application['status']) => setAppStatus(v)}>
                        <SelectTrigger id="app-status"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Saved">Saved</SelectItem>
                          <SelectItem value="Applied">Applied</SelectItem>
                          <SelectItem value="Interviewing">Interviewing</SelectItem>
                          <SelectItem value="Offer">Offer</SelectItem>
                          <SelectItem value="Accepted">Accepted</SelectItem>
                          <SelectItem value="Rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="app-date" className="text-xs font-bold text-muted-foreground/80 uppercase">Date (Locked)</Label>
                      <Input id="app-date" type="date" value={appDate} onChange={e => setAppDate(e.target.value)} disabled className="opacity-60 cursor-not-allowed" />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="app-url" className="text-xs font-bold text-muted-foreground/80 uppercase">Website URL (optional)</Label>
                      <Input id="app-url" type="url" placeholder="https://..." value={appUrl} onChange={e => setAppUrl(e.target.value)} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="app-notes" className="text-xs font-bold text-muted-foreground/80 uppercase">Notes (optional)</Label>
                    <Input id="app-notes" placeholder="Interview dates, contact details, or progress notes" value={appNotes} onChange={e => setAppNotes(e.target.value)} />
                  </div>
                </div>

                <DialogFooter className="pt-2 flex gap-2 justify-end">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                  <Button type="submit" size="sm">Track Application</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Summary Panel */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 bg-muted/20 p-4 rounded-xl border border-border/40 text-center">
        <div>
          <div className="text-[10px] uppercase font-bold text-muted-foreground">Total Applications</div>
          <div className="text-xl font-extrabold text-foreground mt-1">{applications.length}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold text-blue-400">Applied</div>
          <div className="text-xl font-extrabold text-blue-500 mt-1">{applications.filter(a => a.status === 'Applied').length}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold text-amber-400">Interviewing</div>
          <div className="text-xl font-extrabold text-amber-500 mt-1">{applications.filter(a => a.status === 'Interviewing').length}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold text-emerald-400">Offers/Accepted</div>
          <div className="text-xl font-extrabold text-emerald-500 mt-1">{applications.filter(a => a.status === 'Offer' || a.status === 'Accepted').length}</div>
        </div>
        <div className="col-span-2 md:col-span-1">
          <div className="text-[10px] uppercase font-bold text-slate-400">Saved/Rejected</div>
          <div className="text-xl font-extrabold text-foreground mt-1">
            {applications.filter(a => a.status === 'Saved' || a.status === 'Rejected').length}
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between select-none">
        <div className="flex rounded-lg border border-border bg-muted/30 p-1 self-start select-none">
          <button
            onClick={() => setFilterType('all')}
            className={`rounded-md px-3.5 py-1 text-xs font-semibold transition-all ${
              filterType === 'all' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterType('job')}
            className={`rounded-md px-3.5 py-1 text-xs font-semibold transition-all ${
              filterType === 'job' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Jobs
          </button>
          <button
            onClick={() => setFilterType('scholarship')}
            className={`rounded-md px-3.5 py-1 text-xs font-semibold transition-all ${
              filterType === 'scholarship' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Scholarships
          </button>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search company or role..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs shadow-sm"
            />
          </div>
          
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-9 text-xs w-36 shadow-sm"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Saved">Saved</SelectItem>
              <SelectItem value="Applied">Applied</SelectItem>
              <SelectItem value="Interviewing">Interviewing</SelectItem>
              <SelectItem value="Offer">Offer</SelectItem>
              <SelectItem value="Accepted">Accepted</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Applications Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
          <p className="text-sm">Loading tracker details...</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {applications
              .filter(a => {
                const matchesType = filterType === 'all' || a.type === filterType;
                const matchesStatus = filterStatus === 'all' || a.status === filterStatus;
                const matchesSearch =
                  a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  a.organization.toLowerCase().includes(searchQuery.toLowerCase());
                return matchesType && matchesStatus && matchesSearch;
              })
              .map(app => {
                const statusColors = {
                  Saved: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
                  Applied: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                  Interviewing: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                  Offer: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                  Accepted: 'bg-green-500/10 text-green-400 border-green-500/20',
                  Rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
                };

                return (
                  <div key={app.id} className="relative rounded-xl border border-border/60 bg-card p-5 hover:shadow-lg hover:border-border/100 hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between gap-4 group">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 ${
                          app.type === 'job' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-purple-500/10 text-purple-400'
                        }`}>
                          {app.type === 'job' ? <Briefcase className="h-5 w-5" /> : <GraduationCap className="h-5 w-5" />}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-foreground truncate">{app.title}</h4>
                          <p className="text-xs text-muted-foreground truncate">{app.organization}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => handleOpenEdit(app)}
                          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteApplication(app.id)}
                          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-muted rounded-lg transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {app.notes && (
                      <p className="text-xs text-muted-foreground/80 bg-muted/30 p-2.5 rounded-lg border border-border/30 line-clamp-2">
                        {app.notes}
                      </p>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/30 select-none">
                      <span className="text-[11px] text-muted-foreground font-medium">
                        {format(new Date(app.date), 'MMM d, yyyy')}
                      </span>
                      
                      <div className="flex items-center gap-2">
                        {app.url && (
                          <a
                            href={app.url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                        
                        <Select
                          value={app.status}
                          onValueChange={(val: Application['status']) => handleUpdateStatus(app.id, val)}
                        >
                          <SelectTrigger className={`h-7 text-[10px] font-bold border rounded-md px-2 w-28 ${statusColors[app.status]}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="text-xs">
                            <SelectItem value="Saved">Saved</SelectItem>
                            <SelectItem value="Applied">Applied</SelectItem>
                            <SelectItem value="Interviewing">Interviewing</SelectItem>
                            <SelectItem value="Offer">Offer</SelectItem>
                            <SelectItem value="Accepted">Accepted</SelectItem>
                            <SelectItem value="Rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
          
          {applications.filter(a => {
            const matchesType = filterType === 'all' || a.type === filterType;
            const matchesStatus = filterStatus === 'all' || a.status === filterStatus;
            const matchesSearch =
              a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              a.organization.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesType && matchesStatus && matchesSearch;
          }).length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <p className="text-sm">No applications found.</p>
            </div>
          )}
        </>
      )}

      {/* Edit Dialog Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md bg-card border border-border shadow-2xl rounded-2xl p-6">
          <form onSubmit={handleUpdateApplication} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Pencil className="h-5 w-5 text-primary" /> Edit Application
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Update the details of this job or scholarship application.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-title" className="text-xs font-bold text-muted-foreground/80 uppercase">Title / Role</Label>
                <Input id="edit-title" placeholder="e.g. Software Engineer" value={editTitle} onChange={e => setEditTitle(e.target.value)} required />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-org" className="text-xs font-bold text-muted-foreground/80 uppercase">Company / Organization</Label>
                <Input id="edit-org" placeholder="e.g. Google" value={editOrg} onChange={e => setEditOrg(e.target.value)} required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-type" className="text-xs font-bold text-muted-foreground/80 uppercase">Type</Label>
                  <Select value={editType} onValueChange={(v: 'job' | 'scholarship') => setEditType(v)}>
                    <SelectTrigger id="edit-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="job">Job Application</SelectItem>
                      <SelectItem value="scholarship">Scholarship</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-status" className="text-xs font-bold text-muted-foreground/80 uppercase">Status</Label>
                  <Select value={editStatus} onValueChange={(v: Application['status']) => setEditStatus(v)}>
                    <SelectTrigger id="edit-status"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Saved">Saved</SelectItem>
                      <SelectItem value="Applied">Applied</SelectItem>
                      <SelectItem value="Interviewing">Interviewing</SelectItem>
                      <SelectItem value="Offer">Offer</SelectItem>
                      <SelectItem value="Accepted">Accepted</SelectItem>
                      <SelectItem value="Rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-date" className="text-xs font-bold text-muted-foreground/80 uppercase">Date (Locked)</Label>
                  <Input id="edit-date" type="date" value={editDate} onChange={e => setEditDate(e.target.value)} disabled className="opacity-60 cursor-not-allowed" />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-url" className="text-xs font-bold text-muted-foreground/80 uppercase">Website URL (optional)</Label>
                  <Input id="edit-url" type="url" placeholder="https://..." value={editUrl} onChange={e => setEditUrl(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-notes" className="text-xs font-bold text-muted-foreground/80 uppercase">Notes (optional)</Label>
                <Input id="edit-notes" placeholder="Interview details, contact info" value={editNotes} onChange={e => setEditNotes(e.target.value)} />
              </div>
            </div>

            <DialogFooter className="pt-2 flex gap-2 justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsEditOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Applications;
