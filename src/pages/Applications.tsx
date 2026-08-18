import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db, storage } from '@/lib/firebase';
import { 
  collection, query, where, getDocs, addDoc, updateDoc, 
  deleteDoc, doc, serverTimestamp 
} from 'firebase/firestore';
import { 
  ref, uploadBytes, getDownloadURL, deleteObject 
} from 'firebase/storage';
import { 
  Briefcase, GraduationCap, Search, Plus, Trash2, ExternalLink, 
  Loader2, Sparkles, Filter, Pencil, Share2, FileText, Link as LinkIcon,
  Calendar, MapPin, Check, X, AlertTriangle, User, DollarSign, RefreshCw,
  LayoutGrid, Kanban, Rss, Files, Sparkle, Link2, Award, Gift, Building
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Application = {
  id: string;
  title: string;
  company: string;
  type: 'job' | 'scholarship';
  status: 'Interested' | 'Applied' | 'Interviewing' | 'Offered' | 'Rejected' | 'Archived';
  location?: string;
  compensation?: string;
  deadline?: string;
  url?: string;
  notes?: string;
  contacts?: string;
  linked_files: string[];
  user_id?: string;
  statuses?: Record<string, string>;
};

type FileItem = {
  id?: string;
  name: string;
  extension: string;
  size: number;
  mtime: string;
  url?: string;
  isCloud?: boolean;
};

type ScrapedJob = {
  jobId?: string;
  title: string;
  company: string;
  location: string;
  link: string;
  logo: string;
  postDate: string;
  source: string;
  description?: string;
  deadline?: string;
  matchScore?: number;
  matchReasoning?: string;
  missingSkills?: string[];
  aiPowered?: boolean;
};

type RSSFeedSection = {
  source: string;
  error?: boolean;
  message?: string;
  items: ScrapedJob[];
};

const COLUMNS: { key: Application['status']; label: string; color: string; border: string; bg: string; dot: string }[] = [
  { key: 'Interested', label: 'Interested', color: 'text-slate-400', border: 'border-slate-500/20', bg: 'bg-slate-500/5', dot: 'bg-slate-500' },
  { key: 'Applied', label: 'Applied', color: 'text-blue-400', border: 'border-blue-500/20', bg: 'bg-blue-500/5', dot: 'bg-blue-500' },
  { key: 'Interviewing', label: 'Interviewing', color: 'text-amber-400', border: 'border-amber-500/20', bg: 'bg-amber-500/5', dot: 'bg-amber-500' },
  { key: 'Offered', label: 'Offered', color: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/5', dot: 'bg-emerald-500' },
  { key: 'Rejected', label: 'Rejected', color: 'text-red-400', border: 'border-red-500/20', bg: 'bg-red-500/5', dot: 'bg-red-500' },
  { key: 'Archived', label: 'Archived', color: 'text-zinc-500', border: 'border-zinc-500/20', bg: 'bg-zinc-500/5', dot: 'bg-zinc-500' }
];

const ANNOTATION_PROJECTS: ScrapedJob[] = [
  {
    title: 'French Audio Data Collection & Transcription',
    company: 'Appen CrowdGen',
    location: 'Kigali, Rwanda / Remote',
    link: 'https://crowdgen.com',
    logo: '',
    postDate: 'Posted 2 hours ago',
    source: 'Appen Portal',
    deadline: 'September 15, 2026',
    matchScore: 95,
    matchReasoning: 'Bilingual French/English transcription matching your ALU/Software Developer profile. Highly suitable for Domari Ltd crowd forces.',
    missingSkills: [],
    description: `
      <p class="mb-3">We are collecting 50 hours of conversational French audio recorded by native French speakers from different African regions (Rwanda, Congo, Senegal, Ivory Coast).</p>
      <p class="mb-3"><strong>Scope of Work:</strong> Each speaker records 30 minutes of natural conversations based on prompt scenarios. Audio files must be transcribed and aligned in text format.</p>
      <p class="mb-2"><strong>Domari Force Requirements:</strong></p>
      <ul class="list-disc ml-4 mb-3">
        <li>Bilingual French/English transcriptionists</li>
        <li>10 native audio recorders</li>
        <li>Bilingual quality verification controllers</li>
      </ul>
    `
  },
  {
    title: 'Pedestrian & Traffic Sign Image Segmentation',
    company: 'Lidar Vision AI (OneForma)',
    location: 'Remote (Global)',
    link: 'https://my.oneforma.com',
    logo: '',
    postDate: 'Posted 1 day ago',
    source: 'OneForma Portal',
    deadline: 'October 30, 2026',
    matchScore: 85,
    matchReasoning: 'Image annotation and semantic labeling project matching Domari Ltd annotation capabilities. Requires high-precision polygonal bounding boxes.',
    missingSkills: ['Precision Labeling Tools'],
    description: `
      <p class="mb-3">High-accuracy semantic bounding box segmentation of urban street scenes, labeling pedestrians, traffic signs, lane markers, and vehicle boundaries for autonomous driving model training.</p>
      <p class="mb-3"><strong>Scope of Work:</strong> Annotate 20,000 street-level images with high-accuracy polygonal segmentation boxes.</p>
      <p class="mb-2"><strong>Qualifications:</strong></p>
      <ul class="list-disc ml-4 mb-3">
        <li>Precision labeling tools experience (CVAT, Labelbox)</li>
        <li>Double-check validation verification pipeline</li>
        <li>Ability to handle 2,000 images per week</li>
      </ul>
    `
  },
  {
    title: 'African Languages Video Action Localization',
    company: 'African Language Consortium',
    location: 'Kigali, Rwanda / Remote',
    link: 'https://www.linkedin.com/jobs/search?keywords=Video%20Annotation',
    logo: '',
    postDate: 'Posted 3 days ago',
    source: 'LinkedIn Jobs',
    deadline: 'September 30, 2026',
    matchScore: 80,
    matchReasoning: 'Video segmentation and labeling project requiring frame-by-frame action localization. Fits translation and video annotation forces.',
    missingSkills: [],
    description: `
      <p class="mb-3">Identify and label frame-by-frame starting and ending points for specific actions in 500 sports and activity video clips.</p>
      <p class="mb-3"><strong>Scope of Work:</strong> Annotate start/stop timestamps, classify action categories (e.g. running, jumping, speaking), and add French translation context notes.</p>
      <p class="mb-2"><strong>Required Forces:</strong></p>
      <ul class="list-disc ml-4 mb-3">
        <li>Video annotation tooling knowledge</li>
        <li>Fast turn-around frame labelers</li>
        <li>Bilingual supervisors (English & French)</li>
      </ul>
    `
  },
  {
    title: 'French-to-Kinyarwanda Translation Dataset Alignment',
    company: 'Consortium of Translation Services',
    location: 'Kigali, Rwanda',
    link: 'https://www.linkedin.com/jobs/search?keywords=French%20Kinyarwanda%20Translation',
    logo: '',
    postDate: 'Posted 5 days ago',
    source: 'LinkedIn Jobs',
    deadline: 'September 10, 2026',
    matchScore: 90,
    matchReasoning: 'Bilingual text alignment project. Requires translation validation of 100,000 Kinyarwanda/French sentence pairs.',
    missingSkills: [],
    description: `
      <p class="mb-3">Verify and align 100,000 parallel sentence pairs translated from French to Kinyarwanda for local machine learning translator training.</p>
      <p class="mb-3"><strong>Scope of Work:</strong> Review translated pairs, correct grammar/dialect mismatch, and log rating scores for sentence accuracy.</p>
      <p class="mb-2"><strong>Required Qualifications:</strong></p>
      <ul class="list-disc ml-4 mb-3">
        <li>Bilingual French and Kinyarwanda fluency</li>
        <li>Translation or linguistics training</li>
        <li>Collaborator verification pipeline</li>
      </ul>
    `
  }
];

// Schema mapper to maintain backwards-compatibility with GothSpace Dashboard
const toDBStatus = (status: string): string => {
  if (status === 'Interested') return 'Saved';
  if (status === 'Offered') return 'Offer';
  return status;
};

const fromDBStatus = (status: string): Application['status'] => {
  if (status === 'Saved') return 'Interested';
  if (status === 'Offer') return 'Offered';
  return status as Application['status'];
};

const extractSections = (text: string) => {
  const sections = {
    qualifications: [] as string[],
    benefits: [] as string[],
  };

  if (!text) return sections;
  
  const cleanText = text.replace(/<[^>]*>/g, '\n').replace(/\n+/g, '\n');
  const lines = cleanText.split('\n');
  let currentSection: 'qualifications' | 'benefits' | null = null;

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;

    if (/(qualification|requirement|skill|experience|must\s*have|criteria|who\s*you\s*are)/i.test(trimmed)) {
      currentSection = 'qualifications';
      return;
    }
    if (/(benefit|offer|compensation|perk|what\s*we\s*offer|salary)/i.test(trimmed)) {
      currentSection = 'benefits';
      return;
    }
    if (/(about\s*us|company|description|role|responsibilit|task|duty)/i.test(trimmed)) {
      currentSection = null;
      return;
    }

    if (currentSection === 'qualifications' && sections.qualifications.length < 5) {
      if (trimmed.length > 10 && trimmed.length < 150) {
        sections.qualifications.push(trimmed.replace(/^[-•*+]\s*/, ''));
      }
    }
    if (currentSection === 'benefits' && sections.benefits.length < 5) {
      if (trimmed.length > 10 && trimmed.length < 150) {
        sections.benefits.push(trimmed.replace(/^[-•*+]\s*/, ''));
      }
    }
  });

  return sections;
};

const HelperOfflineWarning = ({ featureName }: { featureName: string }) => (
  <div className="flex flex-col items-center justify-center p-8 text-center space-y-3 bg-amber-500/5 border border-amber-500/20 rounded-2xl max-w-lg mx-auto my-10">
    <AlertTriangle className="h-7 w-7 text-amber-400 animate-bounce" />
    <h3 className="text-sm font-bold text-foreground">Local Helper Offline</h3>
    <p className="text-xs text-muted-foreground leading-relaxed">
      The <strong>{featureName}</strong> feature requires GothSpace's local helper server to be running on your machine.
    </p>
    <p className="text-xs text-muted-foreground leading-relaxed mt-1">
      Please run <code className="bg-muted px-1.5 py-0.5 rounded text-[10px] text-primary font-bold">npm run dev</code> on your local computer to activate this.
    </p>
  </div>
);

export default function Applications() {
  const { user, profile } = useAuth();
  
  // Navigation & View Mode
  const [activeTab, setActiveTab] = useState<'board' | 'discovery' | 'files'>('board');
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  // Connection errors when backend Express server is offline (e.g. in deployed cloud build)
  const [filesApiError, setFilesApiError] = useState(false);
  const [scrapersApiError, setScrapersApiError] = useState(false);

  // Discovery: Search & Scrapers
  const [discTab, setDiscTab] = useState<'custom' | 'linkedin' | 'rss' | 'domari' | 'annotation'>('custom');
  const [keywords, setKeywords] = useState('Software Engineer');
  const [discLocation, setDiscLocation] = useState('Rwanda');
  const [linkedinJobs, setLinkedinJobs] = useState<ScrapedJob[]>([]);
  const [loadingLinkedin, setLoadingLinkedin] = useState(false);
  const [rssFeeds, setRssFeeds] = useState<RSSFeedSection[]>([]);
  const [loadingRss, setLoadingRss] = useState(false);

  // Custom Scraper
  const [customUrl, setCustomUrl] = useState('');
  const [loadingCustom, setLoadingCustom] = useState(false);
  const [customScrapedJob, setCustomScrapedJob] = useState<ScrapedJob | null>(null);

  // Interactive details modal for discovered opportunities
  const [activeJobDetails, setActiveJobDetails] = useState<ScrapedJob | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Files integration
  const [files, setFiles] = useState<FileItem[]>([]);
  const [cloudFiles, setCloudFiles] = useState<FileItem[]>([]);
  const [uploadingCv, setUploadingCv] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);

  // Edit / Add Modal Details State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  
  // Modal Fields
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [type, setType] = useState<Application['type']>('job');
  const [status, setStatus] = useState<Application['status']>('Interested');
  const [location, setLocation] = useState('');
  const [compensation, setCompensation] = useState('');
  const [deadline, setDeadline] = useState('');
  const [appUrl, setAppUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [contacts, setContacts] = useState('');
  const [linkedFiles, setLinkedFiles] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      fetchApplications();
      fetchCloudFiles();
    }
  }, [user, profile?.collaborator_ids?.length]);

  useEffect(() => {
    if (activeTab === 'discovery') {
      if (discTab === 'linkedin' && linkedinJobs.length === 0) {
        handleSearchLinkedIn();
      } else if (discTab === 'rss' && rssFeeds.length === 0) {
        loadRssFeeds();
      }
    } else if (activeTab === 'files') {
      loadFilesList();
      fetchCloudFiles();
    }
  }, [activeTab, discTab]);

  // Fetch applications list
  const fetchApplications = async () => {
    setLoading(true);
    const userIds = [user!.id, ...(profile?.collaborator_ids || [])];
    try {
      const q = query(
        collection(db, 'applications'),
        where('user_id', 'in', userIds)
      );
      const snap = await getDocs(q);
      const fetched: Application[] = [];
      snap.forEach((doc) => {
        const data = doc.data();
        const appUserStatus = data.statuses?.[user!.id] || data.status || 'Saved';
        fetched.push({
          id: doc.id,
          title: data.title || '',
          company: data.organization || data.company || '',
          type: data.type || 'job',
          status: fromDBStatus(appUserStatus),
          location: data.location || '',
          compensation: data.compensation || '',
          deadline: data.date || data.deadline || '',
          url: data.url || '',
          notes: data.notes || '',
          contacts: data.contacts || '',
          linked_files: data.linked_files || [],
          user_id: data.user_id,
          statuses: data.statuses || {},
        });
      });
      setApplications(fetched);
    } catch (err) {
      console.error('Error fetching applications:', err);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  // Fetch cloud uploaded CVs from Firestore
  const fetchCloudFiles = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'user_cvs'), where('user_id', '==', user.id));
      const snap = await getDocs(q);
      const fetched: FileItem[] = [];
      snap.forEach(doc => {
        const data = doc.data();
        fetched.push({
          id: doc.id,
          name: data.name,
          extension: data.extension || '.pdf',
          size: data.size || 0,
          mtime: data.mtime || new Date().toISOString(),
          url: data.url,
          isCloud: true
        });
      });
      setCloudFiles(fetched);
    } catch (err) {
      console.error('Error loading cloud CVs:', err);
    }
  };

  // Drag & Drop
  const handleDragStart = (e: React.DragEvent, appId: string) => {
    e.dataTransfer.setData('text/plain', appId);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: Application['status']) => {
    e.preventDefault();
    const appId = e.dataTransfer.getData('text/plain');
    if (appId) {
      handleUpdateStatus(appId, targetStatus);
    }
  };

  const handleUpdateStatus = async (appId: string, newStatus: Application['status']) => {
    try {
      const app = applications.find(a => a.id === appId);
      const updatedStatuses = {
        ...(app?.statuses || {}),
        [user!.id]: toDBStatus(newStatus)
      };

      await updateDoc(doc(db, 'applications', appId), {
        [`statuses.${user!.id}`]: toDBStatus(newStatus),
        status: toDBStatus(newStatus), // legacy fallback
        updated_at: serverTimestamp()
      });
      
      toast.success(`Moved to ${newStatus}`);
      setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus, statuses: updatedStatuses } : a));
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Failed to update status');
    }
  };

  // Custom Scraper URL Submit
  const handleCustomScrape = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) {
      toast.error('Please enter a job listing URL');
      return;
    }
    setLoadingCustom(true);
    setCustomScrapedJob(null);
    setScrapersApiError(false);

    fetch(`/api/discovery/custom-scrape?url=${encodeURIComponent(customUrl.trim())}`)
      .then(res => {
        if (!res.ok) throw new Error('Offline');
        return res.json();
      })
      .then(data => {
        if (data.title) {
          setCustomScrapedJob(data);
          toast.success('Scraped job details & analyzed CV fit!');
        } else {
          toast.error('Failed to parse details.');
        }
      })
      .catch(() => {
        setScrapersApiError(true);
        toast.error('Failed to connect to scraper helper.');
      })
      .finally(() => setLoadingCustom(false));
  };

  // Scrapers & Discovery (LinkedIn & RSS)
  const handleSearchLinkedIn = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoadingLinkedin(true);
    setScrapersApiError(false);
    fetch(`/api/discovery/linkedin?keywords=${encodeURIComponent(keywords)}&location=${encodeURIComponent(discLocation)}`)
      .then(res => {
        if (!res.ok) throw new Error('Offline');
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) setLinkedinJobs(data);
      })
      .catch(() => {
        setScrapersApiError(true);
      })
      .finally(() => setLoadingLinkedin(false));
  };

  const loadRssFeeds = () => {
    setLoadingRss(true);
    setScrapersApiError(false);
    fetch('/api/discovery/rss')
      .then(res => {
        if (!res.ok) throw new Error('Offline');
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) setRssFeeds(data);
      })
      .catch(() => {
        setScrapersApiError(true);
      })
      .finally(() => setLoadingRss(false));
  };

  const handleTrackOpportunity = async (opportunity: ScrapedJob) => {
    if (applications.some(app => app.url === opportunity.link)) {
      toast.info('You are already tracking this opportunity!');
      return;
    }

    const type = opportunity.source === 'Bright Scholarship' ? 'scholarship' : 'job';
    const dbStatusStr = 'Saved';
    
    // GUARANTEED FIRESTORE COMPATIBILITY: Default all fields to prevent passing 'undefined' values
    try {
      await addDoc(collection(db, 'applications'), {
        user_id: user!.id,
        title: opportunity.title || 'Untitled Opportunity',
        organization: opportunity.company || 'Unknown Organization',
        location: opportunity.location || '',
        status: dbStatusStr,
        statuses: {
          [user!.id]: dbStatusStr
        },
        url: opportunity.link || '',
        type: type,
        date: opportunity.deadline || '',
        notes: opportunity.description || '',
        linked_files: [],
        created_at: serverTimestamp()
      });

      toast.success('Opportunity tracked successfully!');
      setIsDetailsModalOpen(false);
      fetchApplications();
    } catch (err) {
      console.error('Error tracking opportunity:', err);
      toast.error('Failed to track opportunity');
    }
  };

  const handleOpenDetails = (job: ScrapedJob) => {
    setActiveJobDetails(job);
    setIsDetailsModalOpen(true);
  };

  // Files Browser
  const loadFilesList = () => {
    setLoadingFiles(true);
    setFilesApiError(false);
    fetch('/api/files')
      .then(res => {
        if (!res.ok) throw new Error('Offline');
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setFiles(data);
          // Auto-select first CV/resume if possible
          const filtered = data.filter(f => f.name.toLowerCase().includes('cv') || f.name.toLowerCase().includes('resume'));
          const cloudFiltered = cloudFiles.filter(f => f.name.toLowerCase().includes('cv') || f.name.toLowerCase().includes('resume'));
          
          if (!selectedFile) {
            if (cloudFiltered.length > 0) {
              handleSelectFile(cloudFiltered[0]);
            } else if (filtered.length > 0) {
              handleSelectFile(filtered[0]);
            }
          }
        }
      })
      .catch(() => {
        setFilesApiError(true);
      })
      .finally(() => setLoadingFiles(false));
  };

  const handleSelectFile = (file: FileItem) => {
    setSelectedFile(file);
    setLoadingContent(true);
    setFileContent('');

    // If it's a cloud file, it has a direct download URL—no need to read local disk content
    if (file.isCloud) {
      setLoadingContent(false);
      return;
    }

    if (['.md', '.txt', '.html'].includes(file.extension)) {
      fetch(`/api/files/content?name=${encodeURIComponent(file.name)}`)
        .then(res => {
          if (!res.ok) throw new Error('Offline');
          return res.json();
        })
        .then(data => {
          if (data.content) setFileContent(data.content);
        })
        .catch(() => toast.error('Failed to read file content'))
        .finally(() => setLoadingContent(false));
    } else {
      setLoadingContent(false);
    }
  };

  // Firebase Cloud CV Upload Handler
  const handleUploadCV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Only PDF documents are supported for upload');
      return;
    }

    setUploadingCv(true);
    try {
      const storageRef = ref(storage, `cvs/${user!.id}/${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);

      await addDoc(collection(db, 'user_cvs'), {
        user_id: user!.id,
        name: file.name,
        url: downloadUrl,
        extension: '.pdf',
        size: file.size,
        mtime: new Date().toISOString()
      });

      toast.success('CV uploaded to cloud successfully!');
      fetchCloudFiles();
    } catch (err) {
      console.error('Error uploading CV:', err);
      toast.error('Failed to upload CV. Make sure Storage Rules are enabled.');
    } finally {
      setUploadingCv(false);
    }
  };

  const handleDeleteCloudCV = async (e: React.MouseEvent, file: FileItem) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete ${file.name} from your cloud CV vault?`)) return;

    try {
      // Delete from storage
      const storageRef = ref(storage, `cvs/${user!.id}/${file.name}`);
      await deleteObject(storageRef).catch(() => {});

      // Delete record from Firestore
      await deleteDoc(doc(db, 'user_cvs', file.id!));
      toast.success('CV removed from cloud vault');
      
      if (selectedFile?.name === file.name) {
        setSelectedFile(null);
        setFileContent('');
      }
      fetchCloudFiles();
    } catch (err) {
      console.error('Error deleting cloud CV:', err);
      toast.error('Failed to delete CV from cloud');
    }
  };

  // Clickable links, dividers, important triggers, and clean highlights
  const parseMarkdown = (markdown: string): string => {
    return markdown
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Headers
      .replace(/^### (.*$)/gim, '<h3 class="text-xs font-bold text-foreground mt-4 mb-1.5 uppercase tracking-wider text-primary">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-sm font-black text-foreground mt-5 mb-2.5 border-b border-border/40 pb-1.5 uppercase tracking-widest">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-base font-black text-foreground mt-6 mb-3.5 border-l-4 border-primary pl-2.5">$1</h1>')
      // Markdown Lists
      .replace(/^\s*-\s(.*$)/gim, '<li class="ml-4 list-disc text-muted-foreground/90 py-0.5 text-xs">$1</li>')
      // Bold / Italic
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-foreground bg-muted/40 px-1 rounded">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic text-muted-foreground">$1</em>')
      // Clean Dividers (Horizontal lines)
      .replace(/^---/gm, '<hr class="border-border/40 my-5" />')
      // Render Clickable Markdown Links
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noreferrer" class="text-primary hover:underline font-bold inline-flex items-center gap-1 hover:text-primary/80 transition-colors">$1 <svg class="h-2.5 w-2.5 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a>')
      // Important highlights
      .replace(/^>\s*\[IMPORTANT\]/gim, '<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 uppercase tracking-widest mb-1.5">⚠️ Important</span>')
      .replace(/^>\s*\[WARNING\]/gim, '<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-widest mb-1.5">⚠️ Warning</span>')
      .replace(/\n/gim, '<br />');
  };

  const handleAssignFile = async (appId: string, fileName: string) => {
    const app = applications.find(a => a.id === appId);
    if (!app) return;

    const filesList = app.linked_files || [];
    if (!filesList.includes(fileName)) {
      const updatedFiles = [...filesList, fileName];
      try {
        await updateDoc(doc(db, 'applications', appId), {
          linked_files: updatedFiles,
          updated_at: serverTimestamp()
        });
        setApplications(prev => prev.map(a => a.id === appId ? { ...a, linked_files: updatedFiles } : a));
        toast.success('Document linked!');
      } catch (err) {
        toast.error('Failed to link file');
      }
    }
  };

  const handleUnassignFile = async (appId: string, fileName: string) => {
    const app = applications.find(a => a.id === appId);
    if (!app) return;

    const updatedFiles = (app.linked_files || []).filter(f => f !== fileName);
    try {
      await updateDoc(doc(db, 'applications', appId), {
        linked_files: updatedFiles,
        updated_at: serverTimestamp()
      });
      setApplications(prev => prev.map(a => a.id === appId ? { ...a, linked_files: updatedFiles } : a));
      toast.success('Document unlinked');
    } catch (err) {
      toast.error('Failed to unlink file');
    }
  };

  // Add / Edit Modal Controls
  const handleOpenAddModal = () => {
    setSelectedApp(null);
    setTitle('');
    setCompany('');
    setType('job');
    setStatus('Interested');
    setLocation('');
    setCompensation('');
    setDeadline('');
    setAppUrl('');
    setNotes('');
    setContacts('');
    setLinkedFiles([]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (app: Application) => {
    setSelectedApp(app);
    setTitle(app.title);
    setCompany(app.company);
    setType(app.type);
    setStatus(app.status);
    setLocation(app.location || '');
    setCompensation(app.compensation || '');
    setDeadline(app.deadline || '');
    setAppUrl(app.url || '');
    setNotes(app.notes || '');
    setContacts(app.contacts || '');
    setLinkedFiles(app.linked_files || []);
    setIsModalOpen(true);
  };

  const handleSaveApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !company.trim()) {
      toast.error('Job Title and Company Name are required.');
      return;
    }

    const appUserStatus = toDBStatus(status);
    const updatedStatuses = {
      ...(selectedApp?.statuses || {}),
      [user!.id]: appUserStatus
    };

    // GUARANTEED FIRESTORE COMPATIBILITY: Default all fields to prevent passing 'undefined' values
    const appData = {
      title: title.trim(),
      organization: company.trim(),
      type: type,
      status: appUserStatus, // legacy fallback
      statuses: updatedStatuses,
      location: location.trim() || '',
      compensation: compensation.trim() || '',
      date: deadline || '',
      url: appUrl.trim() || '',
      notes: notes.trim() || '',
      contacts: contacts.trim() || '',
      linked_files: linkedFiles,
      updated_at: serverTimestamp()
    };

    try {
      if (selectedApp) {
        // Edit
        await updateDoc(doc(db, 'applications', selectedApp.id), appData);
        toast.success('Application updated successfully!');
      } else {
        // Add
        await addDoc(collection(db, 'applications'), {
          ...appData,
          user_id: user!.id,
          created_at: serverTimestamp()
        });
        toast.success('Application added!');
      }
      setIsModalOpen(false);
      fetchApplications();
    } catch (err) {
      console.error('Error saving application:', err);
      toast.error('Failed to save application');
    }
  };

  const handleDeleteApp = async (appId: string) => {
    if (!confirm('Are you sure you want to delete this application?')) return;
    try {
      await deleteDoc(doc(db, 'applications', appId));
      toast.success('Application deleted');
      setApplications(prev => prev.filter(a => a.id !== appId));
    } catch (err) {
      toast.error('Failed to delete application');
    }
  };

  const handleShareLink = (app: Application) => {
    const shareUrl = `${window.location.origin}/share/app/${app.id}`;
    navigator.clipboard.writeText(shareUrl)
      .then(() => toast.success('Shortened share link copied to clipboard!'))
      .catch(() => toast.error('Failed to copy link'));
  };

  const handleToggleFile = (fileName: string) => {
    setLinkedFiles(prev =>
      prev.includes(fileName) ? prev.filter(f => f !== fileName) : [...prev, fileName]
    );
  };

  const trackedUrls = applications.map(app => app.url).filter(Boolean);

  // Merge local files and cloud files, avoiding duplicates
  const allFilesList = [
    ...cloudFiles,
    ...files
      .filter(f => !cloudFiles.some(cf => cf.name === f.name))
      .map(f => ({ ...f, isCloud: false }))
  ];

  // Filter Files List to only show CV or Resume documents as requested
  const cvFilesOnly = allFilesList.filter(file => 
    file.name.toLowerCase().includes('cv') || 
    file.name.toLowerCase().includes('resume')
  );

  // Domari Ltd corporate pipeline items
  const domariPipelineApps = applications.filter(app => 
    app.company.toLowerCase().includes('domari') || 
    app.notes?.toLowerCase().includes('domari')
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight animate-fade-in">Applications Hub</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Track, discover, and link workspace files to your professional pipelines.</p>
        </div>

        <div className="flex items-center gap-3 animate-fade-in">
          <Button onClick={handleOpenAddModal} size="sm" className="gap-1.5 font-bold uppercase tracking-wider text-2xs rounded-xl shadow-lg">
            <Plus className="h-3.5 w-3.5" /> New Application
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex border-b border-border/40 pb-px">
        <button
          onClick={() => setActiveTab('board')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 transition-all -mb-px ${
            activeTab === 'board' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Kanban className="h-3.5 w-3.5" /> Kanban Board
        </button>
        <button
          onClick={() => setActiveTab('discovery')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 transition-all -mb-px ${
            activeTab === 'discovery' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Rss className="h-3.5 w-3.5" /> Opportunity Discovery
        </button>
        <button
          onClick={() => setActiveTab('files')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 transition-all -mb-px ${
            activeTab === 'files' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Files className="h-3.5 w-3.5" /> Workspace Documents
        </button>
      </div>

      {/* View Loader */}
      {loading && applications.length === 0 && activeTab === 'board' ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
          <p className="text-xs uppercase font-extrabold tracking-wider">Syncing from cloud...</p>
        </div>
      ) : (
        <>
          {/* ========================================== */}
          {/* TAB 1: KANBAN BOARD                        */}
          {/* ========================================== */}
          {activeTab === 'board' && (
            <div className="overflow-x-auto -mx-6 px-6 pb-4">
              <div className="flex gap-4 min-w-[1000px] items-start">
                {COLUMNS.map(col => {
                  const colApps = applications.filter(app => app.status === col.key);

                  return (
                    <div 
                      key={col.key}
                      className={`flex-1 min-w-[240px] max-w-[320px] rounded-2xl border ${col.border} ${col.bg} p-4 flex flex-col gap-3 min-h-[500px]`}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleDrop(e, col.key)}
                    >
                      {/* Column Header */}
                      <div className="flex items-center justify-between border-b border-border/40 pb-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                          <span className={`text-[10px] font-black uppercase tracking-widest ${col.color}`}>{col.label}</span>
                        </div>
                        <span className="text-[10px] font-extrabold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{colApps.length}</span>
                      </div>

                      {/* Column Cards */}
                      <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[600px] pr-0.5">
                        {colApps.length === 0 ? (
                          <div className="text-center py-10 border border-dashed border-border/40 rounded-xl text-3xs text-muted-foreground uppercase font-extrabold tracking-widest">
                            Drop cards here
                          </div>
                        ) : (
                          colApps.map(app => {
                            // Check urgency
                            const isUrgent = app.deadline && (
                              (new Date(app.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24) <= 3
                            ) && app.status !== 'Rejected' && app.status !== 'Archived';

                            return (
                              <div
                               key={app.id}
                               draggable
                               onDragStart={(e) => handleDragStart(e, app.id)}
                               onClick={() => handleOpenEditModal(app)}
                               className="stat-card p-3.5 space-y-3 cursor-grab active:cursor-grabbing hover:border-primary/40 hover:shadow-lg transition-all relative group bg-card/65 backdrop-blur-sm w-full min-w-0 overflow-hidden"
                             >
                               <div>
                                 <div className="flex items-start justify-between gap-1">
                                   <h3 className="text-xs font-bold text-foreground leading-snug group-hover:text-primary transition-colors truncate">{app.title}</h3>
                                   <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                     <button onClick={() => handleShareLink(app)} className="p-1 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground" title="Copy public share link">
                                       <Share2 className="h-3 w-3" />
                                     </button>
                                     <button onClick={() => handleDeleteApp(app.id)} className="p-1 hover:bg-red-500/10 rounded-md text-muted-foreground hover:text-red-500" title="Delete application">
                                       <Trash2 className="h-3 w-3" />
                                     </button>
                                   </div>
                                 </div>
                                 <p className="text-3xs text-muted-foreground font-semibold mt-0.5 truncate">{app.company}</p>
                               </div>

                               {/* Tags */}
                               <div className="flex flex-wrap gap-1.5">
                                 {app.location && (
                                   <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded-md border border-border/40 max-w-[120px] truncate">
                                     <MapPin className="h-2.5 w-2.5 flex-shrink-0" /> {app.location}
                                   </span>
                                 )}
                                 {app.deadline && (
                                   <span className={`inline-flex items-center gap-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md border max-w-full ${
                                     isUrgent ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-muted/60 text-muted-foreground border-border/40'
                                   }`}>
                                     <Calendar className="h-2.5 w-2.5 flex-shrink-0" />
                                     <span className="truncate">{app.deadline}</span>
                                   </span>
                                 )}
                                 {app.linked_files && app.linked_files.length > 0 && (
                                   <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded-md border border-indigo-500/20">
                                     <LinkIcon className="h-2.5 w-2.5 flex-shrink-0" /> {app.linked_files.length} file{app.linked_files.length > 1 ? 's' : ''}
                                   </span>
                                 )}
                               </div>

                               {/* Dropdown Status Shifter */}
                               <div className="flex flex-col gap-1.5 border-t border-border/40 pt-2.5" onClick={e => e.stopPropagation()}>
                                 <span className="text-[9px] text-muted-foreground uppercase font-black tracking-wider">My Pipeline Stage:</span>
                                 <select
                                   value={app.status}
                                   onChange={(e) => handleUpdateStatus(app.id, e.target.value as Application['status'])}
                                   className="bg-muted border border-border/60 text-foreground font-bold px-2 py-1 rounded-md cursor-pointer outline-none focus:border-primary text-[10px] w-full"
                                 >
                                   {COLUMNS.map(c => (
                                     <option key={c.key} value={c.key}>{c.label}</option>
                                   ))}
                                 </select>
                               </div>
                             </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* TAB 2: OPPORTUNITY DISCOVERY                */}
          {/* ========================================== */}
          {activeTab === 'discovery' && (
            <div className="space-y-6">
              {/* Feeds Sub-Tabs */}
              <div className="flex flex-wrap items-center gap-4 border-b border-border/30 pb-px">
                <button
                  onClick={() => setDiscTab('custom')}
                  className={`text-xs font-bold pb-2 border-b-2 transition-all ${
                    discTab === 'custom' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
                  }`}
                >
                  ✨ AI Link Matcher
                </button>
                <button
                  onClick={() => setDiscTab('domari')}
                  className={`text-xs font-bold pb-2 border-b-2 transition-all ${
                    discTab === 'domari' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
                  }`}
                >
                  🏢 Domari Pipelines
                </button>
                <button
                  onClick={() => setDiscTab('annotation')}
                  className={`text-xs font-bold pb-2 border-b-2 transition-all ${
                    discTab === 'annotation' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
                  }`}
                >
                  🏷️ Annotation & Data Collection
                </button>
                <button
                  onClick={() => setDiscTab('linkedin')}
                  className={`text-xs font-bold pb-2 border-b-2 transition-all ${
                    discTab === 'linkedin' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
                  }`}
                >
                  LinkedIn Guest Feed
                </button>
                <button
                  onClick={() => setDiscTab('rss')}
                  className={`text-xs font-bold pb-2 border-b-2 transition-all ${
                    discTab === 'rss' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
                  }`}
                >
                  Curated Portals (RSS)
                </button>
              </div>

              {/* Custom Scraper URL card */}
              {discTab === 'custom' && (
                <div className="space-y-6 max-w-3xl mx-auto">
                  {scrapersApiError ? (
                    <HelperOfflineWarning featureName="AI Custom Link Matcher" />
                  ) : (
                    <>
                      <div className="stat-card p-6 space-y-4">
                        <div>
                          <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5"><Sparkle className="h-4 w-4 text-primary animate-pulse" /> AI Job & Opportunity Matcher</h2>
                          <p className="text-3xs text-muted-foreground uppercase font-extrabold tracking-widest mt-0.5">Scrape any job listing URL and evaluate it against your CV</p>
                        </div>

                        <form onSubmit={handleCustomScrape} className="flex gap-2.5 items-center">
                          <div className="relative flex-1">
                            <Link2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              value={customUrl}
                              onChange={e => setCustomUrl(e.target.value)}
                              placeholder="Paste job listing URL here (e.g. LinkedIn, Job Portal, Google Jobs...)"
                              className="pl-9 h-9 text-xs bg-muted/40 border-border/60 rounded-xl"
                              required
                            />
                          </div>
                          <Button type="submit" disabled={loadingCustom} className="h-9 font-bold uppercase tracking-wider text-2xs rounded-xl shadow-lg">
                            {loadingCustom ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : 'Scrape & Match'}
                          </Button>
                        </form>
                      </div>

                      {/* Scraped Job Details & AI match */}
                      {loadingCustom ? (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                          <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                          <p className="text-xs uppercase font-extrabold tracking-wider">Parsing HTML & Running AI matching...</p>
                        </div>
                      ) : customScrapedJob ? (
                        <div 
                          onClick={() => handleOpenDetails(customScrapedJob)}
                          className="stat-card p-6 space-y-5 animate-fade-in cursor-pointer hover:border-primary/30 transition-all bg-card/65"
                        >
                          {/* Top Job Banner */}
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-border/40 pb-4">
                            <div className="space-y-1">
                              <h3 className="text-base font-black text-foreground tracking-tight leading-snug">{customScrapedJob.title}</h3>
                              <p className="text-xs font-bold text-primary">{customScrapedJob.company}</p>
                              <div className="flex flex-wrap gap-2 text-3xs text-muted-foreground font-semibold mt-1">
                                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {customScrapedJob.location}</span>
                                <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> {customScrapedJob.compensation}</span>
                                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Deadline: {customScrapedJob.deadline}</span>
                              </div>
                            </div>

                            {/* AI Match Gauge */}
                            <div className="flex items-center gap-3 bg-muted/40 border border-border/50 p-3 rounded-2xl">
                              <div className="text-center">
                                <div className={`text-lg font-black ${
                                  customScrapedJob.matchScore && customScrapedJob.matchScore >= 75 ? 'text-emerald-400' :
                                  customScrapedJob.matchScore && customScrapedJob.matchScore >= 50 ? 'text-amber-400' : 'text-red-400'
                                }`}>
                                  {customScrapedJob.matchScore}%
                                </div>
                                <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground leading-none">Match Score</span>
                              </div>
                              <div className="h-8 w-px bg-border/40" />
                              <div className="text-left">
                                <span className="inline-flex text-[9px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20">
                                  {customScrapedJob.aiPowered ? 'AI Verified' : 'Local Scanner'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Summary */}
                          <div className="space-y-2">
                            <p className="text-3xs text-muted-foreground uppercase font-extrabold tracking-widest">Job Analysis</p>
                            <p className="text-xs text-muted-foreground/90 line-clamp-3 leading-relaxed font-sans">{customScrapedJob.matchReasoning}</p>
                            <span className="text-[10px] text-primary hover:underline font-bold block mt-1">Click to view complete details, qualifications, and benefits &rarr;</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-20 text-xs text-muted-foreground border border-dashed border-border rounded-2xl">
                          Paste a URL link of any job listing and click "Scrape & Match" to evaluate.
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Domari Pipelines Tab */}
              {discTab === 'domari' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-base font-black text-foreground flex items-center gap-1.5"><Building className="h-5 w-5 text-primary" /> Domari Ltd Pipeline Dashboard</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Track, consult, and organize contract pipelines and RFPs targeted for Domari Ltd forces.</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="stat-card p-4 text-center space-y-1">
                      <div className="text-lg font-black text-primary">{domariPipelineApps.length}</div>
                      <span className="text-3xs text-muted-foreground font-black uppercase tracking-widest">Active Domari Projects</span>
                    </div>
                    <div className="stat-card p-4 text-center space-y-1">
                      <div className="text-lg font-black text-blue-400">
                        {domariPipelineApps.filter(a => a.status === 'Applied').length}
                      </div>
                      <span className="text-3xs text-muted-foreground font-black uppercase tracking-widest">Proposals Submitted</span>
                    </div>
                    <div className="stat-card p-4 text-center space-y-1">
                      <div className="text-lg font-black text-emerald-400">
                        {domariPipelineApps.filter(a => a.status === 'Offered').length}
                      </div>
                      <span className="text-3xs text-muted-foreground font-black uppercase tracking-widest">Contracts Won</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <span className="text-3xs text-muted-foreground font-black uppercase tracking-widest">Active Domari Contracts</span>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {domariPipelineApps.map(app => (
                        <div 
                          key={app.id} 
                          onClick={() => handleOpenEditModal(app)}
                          className="stat-card p-4.5 bg-card/50 hover:border-primary/20 cursor-pointer space-y-3 transition-colors"
                        >
                          <div>
                            <h3 className="text-xs font-bold text-foreground truncate">{app.title}</h3>
                            <p className="text-[10px] text-primary font-bold mt-0.5">{app.company}</p>
                          </div>
                          <div className="flex items-center justify-between text-3xs border-t border-border/40 pt-2.5">
                            <span className="text-muted-foreground">Status:</span>
                            <span className="font-extrabold uppercase bg-muted px-2 py-0.5 rounded border border-border/60">{app.status}</span>
                          </div>
                        </div>
                      ))}
                      {domariPipelineApps.length === 0 && (
                        <div className="col-span-full text-center py-10 border border-dashed border-border text-xs text-muted-foreground rounded-2xl">
                          No corporate contracts registered yet. Track opportunities or add new proposals for Domari Ltd.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Annotation & Data Collection Tab */}
              {discTab === 'annotation' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-base font-black text-foreground flex items-center gap-1.5"><Award className="h-5 w-5 text-primary" /> Curated Annotation & Data Projects</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Inspect translation, video/image labeling, and French transcription workloads for Domari forces.</p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {ANNOTATION_PROJECTS.map(job => {
                      const isTracked = trackedUrls.includes(job.link);
                      return (
                        <div 
                          key={job.link}
                          onClick={() => handleOpenDetails(job)}
                          className="stat-card flex flex-col justify-between p-4.5 hover:border-primary/20 cursor-pointer bg-card/65 transition-colors space-y-4"
                        >
                          <div className="space-y-3">
                            <div>
                              <h3 className="text-xs font-bold text-foreground leading-snug line-clamp-2">{job.title}</h3>
                              <p className="text-[10px] text-primary font-bold mt-0.5">{job.company}</p>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              <span className="inline-flex text-[9px] font-black uppercase bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded">
                                {job.matchScore}% AI Fit
                              </span>
                              <span className="inline-flex text-[9px] font-black uppercase bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded">
                                {job.source}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between border-t border-border/30 pt-3 text-3xs">
                            <span className="text-muted-foreground">{job.postDate}</span>
                            <span className="text-primary font-bold hover:underline">Inspect Project &rarr;</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* LinkedIn Guest Feed search form */}
              {discTab === 'linkedin' && (
                <div className="space-y-4">
                  {scrapersApiError ? (
                    <HelperOfflineWarning featureName="LinkedIn Jobs Scraper" />
                  ) : (
                    <>
                      <form onSubmit={handleSearchLinkedIn} className="stat-card grid gap-4 sm:grid-cols-3 items-end">
                        <div className="space-y-1.5">
                          <Label className="text-2xs font-extrabold uppercase tracking-widest text-muted-foreground">Keywords</Label>
                          <Input 
                            value={keywords} 
                            onChange={e => setKeywords(e.target.value)} 
                            placeholder="Job title, keywords..." 
                            className="h-9 text-xs bg-muted/30 border-border/40 rounded-xl"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-2xs font-extrabold uppercase tracking-widest text-muted-foreground">Location</Label>
                          <Input 
                            value={discLocation} 
                            onChange={e => setDiscLocation(e.target.value)} 
                            placeholder="City, country..." 
                            className="h-9 text-xs bg-muted/30 border-border/40 rounded-xl"
                          />
                        </div>
                        <Button type="submit" disabled={loadingLinkedin} className="h-9 font-bold uppercase tracking-wider text-2xs rounded-xl">
                          {loadingLinkedin ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : 'Search Jobs'}
                        </Button>
                      </form>

                      {loadingLinkedin ? (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                          <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
                          <p className="text-3xs uppercase font-extrabold tracking-widest">Searching LinkedIn...</p>
                        </div>
                      ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {linkedinJobs.map(job => (
                            <div 
                              key={job.jobId || job.link} 
                              onClick={() => handleOpenDetails(job)}
                              className="stat-card flex flex-col justify-between p-4 space-y-4 hover:border-primary/20 cursor-pointer bg-card/65 transition-colors"
                            >
                              <div className="space-y-3">
                                <div className="flex gap-3">
                                  {job.logo ? (
                                      <img src={job.logo} alt={job.company} className="h-10 w-10 rounded-xl border border-border/40 bg-white p-0.5 object-contain" />
                                    ) : (
                                      <div className="h-10 w-10 rounded-xl border border-border/40 bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-sm">
                                        {job.company[0]?.toUpperCase() || 'J'}
                                      </div>
                                    )}
                                  <div className="min-w-0">
                                    <h3 className="text-xs font-bold text-foreground truncate">{job.title}</h3>
                                    <p className="text-3xs text-muted-foreground font-semibold mt-0.5 truncate">{job.company}</p>
                                    <p className="text-3xs text-muted-foreground flex items-center gap-1.5 mt-0.5"><MapPin className="h-2.5 w-2.5" /> {job.location}</p>
                                  </div>
                                </div>
                                <span className="inline-flex text-[9px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-md">LinkedIn Guest</span>
                              </div>

                              <div className="flex items-center justify-between border-t border-border/30 pt-3">
                                <span className="text-[10px] text-muted-foreground">{job.postDate}</span>
                                <span className="text-3xs text-primary font-bold hover:underline">View details &rarr;</span>
                              </div>
                            </div>
                          ))}
                          {!loadingLinkedin && linkedinJobs.length === 0 && (
                            <div className="col-span-full text-center py-20 text-xs text-muted-foreground border border-dashed border-border rounded-2xl">
                              Enter search terms and press Search to discover jobs.
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* RSS Tab Content */}
              {discTab === 'rss' && (
                <div className="space-y-6">
                  {scrapersApiError ? (
                    <HelperOfflineWarning featureName="WordPress Feeds Scraper" />
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-3xs font-extrabold tracking-widest text-muted-foreground uppercase">
                          Feeds from opportunitiesforeveryone.net & brightscholarship.com
                        </span>
                        <Button onClick={loadRssFeeds} disabled={loadingRss} size="sm" variant="outline" className="gap-1.5 h-8 text-3xs font-extrabold uppercase">
                          <RefreshCw className={`h-3 w-3 ${loadingRss ? 'animate-spin' : ''}`} /> Refresh Feeds
                        </Button>
                      </div>

                      {loadingRss ? (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                          <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
                          <p className="text-3xs uppercase font-extrabold tracking-widest">Parsing WordPress RSS Portals...</p>
                        </div>
                      ) : (
                        <div className="space-y-8">
                          {rssFeeds.map(feed => (
                            <div key={feed.source} className="space-y-4">
                              <h2 className="text-sm font-black text-foreground border-b border-border/40 pb-1.5 uppercase tracking-wide flex items-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-primary" /> {feed.source}
                              </h2>

                              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {feed.items.map((item, idx) => (
                                  <div 
                                    key={item.link + idx} 
                                    onClick={() => handleOpenDetails(item)}
                                    className="stat-card flex flex-col justify-between p-4 space-y-4 hover:border-primary/20 cursor-pointer bg-card/65 transition-colors"
                                  >
                                    <div className="space-y-3">
                                      <div>
                                        <h3 className="text-xs font-bold text-foreground leading-snug line-clamp-2">{item.title}</h3>
                                        <p className="text-3xs text-muted-foreground flex items-center gap-1.5 mt-1">
                                          <Calendar className="h-2.5 w-2.5 text-muted-foreground" /> {item.deadline ? `Deadline: ${item.deadline}` : 'Check Listing'}
                                        </p>
                                      </div>
                                      <span className="inline-flex text-[9px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-md">Portal RSS</span>
                                      <div 
                                        className="text-3xs text-muted-foreground line-clamp-3 leading-relaxed" 
                                        dangerouslySetInnerHTML={{ __html: item.description || '' }}
                                      />
                                    </div>

                                    <div className="flex items-center justify-between border-t border-border/30 pt-3">
                                      <span className="text-[10px] text-muted-foreground">
                                        {item.pubDate ? format(new Date(item.pubDate), 'MMM d, yyyy') : ''}
                                      </span>
                                      <span className="text-3xs text-primary font-bold hover:underline">View details &rarr;</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ========================================== */}
          {/* TAB 3: WORKSPACE DOCUMENTS                 */}
          {/* ========================================== */}
          {activeTab === 'files' && (
            <div className="grid gap-6 md:grid-cols-4 animate-fade-in">
              {/* Left pane: file list */}
              <div className="stat-card p-4 space-y-4 md:col-span-1">
                {/* Cloud CV Upload Box */}
                <div className="border border-dashed border-border/60 p-3.5 rounded-xl bg-muted/10 flex flex-col items-center justify-center text-center gap-2">
                  <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">☁️ Cloud CV Vault</span>
                  <p className="text-[9px] text-muted-foreground max-w-[180px] leading-snug">Upload your PDF CV to access and view it directly from the deployed cloud app.</p>
                  <label className="inline-flex h-7 items-center justify-center rounded-lg bg-primary px-3 text-[10px] font-bold uppercase text-primary-foreground cursor-pointer hover:bg-primary/95 transition-all">
                    {uploadingCv ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <Plus className="h-3 w-3 mr-1" />}
                    Upload PDF CV
                    <input type="file" accept=".pdf" onChange={handleUploadCV} className="hidden" disabled={uploadingCv} />
                  </label>
                </div>

                <div className="flex items-center justify-between border-b border-border/40 pb-2 mt-4">
                  <span className="text-3xs font-black uppercase tracking-widest text-muted-foreground">My CV Documents</span>
                  <Button onClick={loadFilesList} disabled={loadingFiles} size="xs" variant="ghost" className="h-6 text-[10px] font-bold uppercase">
                    Refresh
                  </Button>
                </div>

                {loadingFiles && (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                )}

                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {cvFilesOnly.map(file => (
                    <div
                      key={file.name}
                      onClick={() => handleSelectFile(file)}
                      className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer hover:bg-muted/30 transition-all ${
                        selectedFile?.name === file.name 
                          ? 'border-primary/50 bg-primary/5' 
                          : 'border-border/40 bg-card/40'
                      }`}
                    >
                      <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-foreground truncate flex items-center justify-between gap-1" title={file.name}>
                          <span className="truncate">{file.name}</span>
                          {file.isCloud && (
                            <span className="text-[7px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1 rounded flex-shrink-0">Cloud</span>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center justify-between">
                          <span>{file.extension.toUpperCase()} • {Math.round(file.size / 1024)} KB</span>
                          {file.isCloud && (
                            <button
                              onClick={(e) => handleDeleteCloudCV(e, file)}
                              className="text-red-400 hover:text-red-500 p-0.5"
                              title="Delete from cloud"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {!loadingFiles && cvFilesOnly.length === 0 && (
                    <div className="text-center py-8 text-3xs text-muted-foreground uppercase font-extrabold tracking-widest">
                      No CV or Resume files found. Upload a PDF CV above!
                    </div>
                  )}
                </div>
              </div>

              {/* Right pane: file content viewer */}
              <div className="stat-card p-5 md:col-span-3 flex flex-col min-h-[400px]">
                {selectedFile ? (
                  <div className="flex-1 flex flex-col space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/40 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-sm font-bold text-foreground">{selectedFile.name}</h2>
                          {(selectedFile.extension === '.pdf' || selectedFile.isCloud) && (
                            <a 
                              href={selectedFile.url || `/api/files/view?name=${encodeURIComponent(selectedFile.name)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:text-primary/80 transition-all"
                              title="Open PDF in new tab"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Last Modified: {new Date(selectedFile.mtime).toLocaleString()}
                        </p>
                      </div>

                      {/* Dropdown link assignment */}
                      <div className="flex justify-end w-full sm:w-auto">
                        <select
                          defaultValue=""
                          onChange={e => {
                            if (e.target.value) {
                              handleAssignFile(e.target.value, selectedFile.name);
                              e.target.value = "";
                            }
                          }}
                          className="bg-muted border border-border text-foreground text-xs font-bold px-3 py-1.5 rounded-xl outline-none focus:border-primary cursor-pointer w-full max-w-[220px] sm:w-[200px]"
                        >
                          <option value="" disabled>Link to Application...</option>
                          {applications
                            .filter(app => !app.linked_files || !app.linked_files.includes(selectedFile.name))
                            .map(app => (
                              <option key={app.id} value={app.id}>{app.company} — {app.title}</option>
                            ))
                          }
                        </select>
                      </div>
                    </div>

                    {/* Linked Applications Indicator */}
                    {applications.filter(app => app.linked_files && app.linked_files.includes(selectedFile.name)).length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 bg-indigo-500/5 border border-indigo-500/10 p-2.5 rounded-xl">
                        <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400">Linked Apps:</span>
                        {applications
                          .filter(app => app.linked_files && app.linked_files.includes(selectedFile.name))
                          .map(app => (
                            <span 
                              key={app.id}
                              className="inline-flex items-center gap-1.5 text-[10px] font-bold bg-muted px-2 py-0.5 rounded-md border border-border/40"
                            >
                              {app.company} ({app.title})
                              <button 
                                onClick={() => handleUnassignFile(app.id, selectedFile.name)}
                                className="text-red-400 hover:text-red-500 font-extrabold text-xs leading-none"
                              >
                                ×
                              </button>
                            </span>
                          ))
                        }
                      </div>
                    )}

                    {/* Markdown / PDF Content */}
                    <div className="flex-1 overflow-y-auto max-h-[800px]">
                      {loadingContent ? (
                        <div className="flex items-center justify-center py-20">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      ) : selectedFile.isCloud ? (
                        /* CLOUD PREVIEW (using Firebase storage download URL directly) */
                        <iframe
                          key={selectedFile.name}
                          src={selectedFile.url}
                          className="w-full h-[750px] border border-border/40 rounded-2xl bg-card"
                          title="Cloud PDF Preview"
                        />
                      ) : selectedFile.extension === '.pdf' ? (
                        /* PDF PREVIEW IFRAME VIEW WITH WIDTH AUTOFIT */
                        <iframe
                          key={selectedFile.name}
                          src={`/api/files/view?name=${encodeURIComponent(selectedFile.name)}#zoom=page-width`}
                          className="w-full h-[750px] border border-border/40 rounded-2xl bg-card"
                          title="PDF Preview"
                        />
                      ) : ['.md', '.txt', '.html'].includes(selectedFile.extension) ? (
                        <div 
                          className="text-xs text-muted-foreground/90 leading-relaxed font-sans border border-border/40 p-4.5 rounded-2xl bg-muted/10"
                          dangerouslySetInnerHTML={{ __html: parseMarkdown(fileContent) }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center py-20 space-y-4">
                          <AlertTriangle className="h-8 w-8 text-amber-400" />
                          <p className="text-xs text-muted-foreground">This file type is not previewable directly.</p>
                          <a 
                            href={`/api/files/view?name=${encodeURIComponent(selectedFile.name)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-9 items-center justify-center rounded-xl bg-muted border border-border px-4 text-xs font-bold uppercase hover:bg-muted/80 transition-colors gap-1.5"
                          >
                            Open Document <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-center">
                    <FileText className="h-10 w-10 mb-2 opacity-40 text-indigo-400" />
                    <p className="text-3xs uppercase font-extrabold tracking-widest">Select a document to preview and link</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ========================================== */}
      {/* DISCOVERED OPPORTUNITY DETAILS DIALOG      */}
      {/* ========================================== */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="max-w-2xl bg-card border border-border/80 rounded-3xl shadow-2xl backdrop-blur-2xl max-h-[85vh] overflow-y-auto">
          {activeJobDetails && (() => {
            const sections = extractSections(activeJobDetails.description || '');
            const isTracked = trackedUrls.includes(activeJobDetails.link);
            return (
              <>
                <DialogHeader className="border-b border-border/40 pb-4">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="inline-flex text-[9px] font-black uppercase tracking-wider bg-primary/15 text-primary border border-primary/20 px-2 py-0.5 rounded">
                      {activeJobDetails.source}
                    </span>
                    {activeJobDetails.aiPowered && (
                      <span className="inline-flex text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
                        AI Verified Fit
                      </span>
                    )}
                  </div>
                  <DialogTitle className="text-lg font-black text-foreground tracking-tight leading-snug">
                    {activeJobDetails.title}
                  </DialogTitle>
                  <p className="text-sm font-bold text-muted-foreground mt-0.5">{activeJobDetails.company}</p>
                </DialogHeader>

                <div className="space-y-5 py-4">
                  {/* Grid Cards: Deadline, Match, Location */}
                  <div className="grid gap-3 sm:grid-cols-3">
                    {/* Location & Wage */}
                    <div className="p-3.5 bg-muted/40 border border-border/60 rounded-2xl flex flex-col justify-between">
                      <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Location</span>
                      <div className="flex items-center gap-1.5 mt-2 font-bold text-xs text-foreground">
                        <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate">{activeJobDetails.location || 'Not specified'}</span>
                      </div>
                      {activeJobDetails.postDate && (
                        <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1 font-semibold">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" /> {activeJobDetails.postDate}
                        </div>
                      )}
                    </div>

                    {/* Deadline Card - Amber Highlight */}
                    <div className="p-3.5 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex flex-col justify-between">
                      <span className="text-[9px] font-black uppercase tracking-widest text-amber-400">Deadline</span>
                      <div className="flex items-center gap-1.5 mt-2 font-bold text-xs text-amber-300">
                        <Calendar className="h-4 w-4 text-amber-400 flex-shrink-0" />
                        <span className="truncate">{activeJobDetails.deadline || 'See Details'}</span>
                      </div>
                      <span className="text-[9px] text-amber-400/80 mt-1 font-semibold">Verify page prior to applying</span>
                    </div>

                    {/* Match Score Card - Purple/Emerald Highlight */}
                    <div className="p-3.5 bg-purple-500/5 border border-purple-500/20 rounded-2xl flex flex-col justify-between">
                      <span className="text-[9px] font-black uppercase tracking-widest text-purple-400">CV Compatibility</span>
                      <div className="flex items-center gap-1.5 mt-2 font-bold text-xs text-purple-300">
                        <Sparkles className="h-4 w-4 text-purple-400 flex-shrink-0" />
                        <span>{activeJobDetails.matchScore || 'Local Scan'}% Match</span>
                      </div>
                      {activeJobDetails.aiPowered ? (
                        <span className="text-[9px] text-purple-400/80 mt-1 font-semibold">AI analysis verified</span>
                      ) : (
                        <span className="text-[9px] text-purple-400/80 mt-1 font-semibold">Keyword matched</span>
                      )}
                    </div>
                  </div>

                  {/* AI Reasoning Text if present */}
                  {activeJobDetails.matchReasoning && (
                    <div className="bg-purple-950/20 border border-purple-500/25 p-4.5 rounded-2xl space-y-1.5">
                      <h4 className="text-3xs uppercase font-extrabold tracking-widest text-purple-400 flex items-center gap-1">
                        <Sparkle className="h-3.5 w-3.5 text-purple-400 animate-pulse" /> Why This Matches Your Profile
                      </h4>
                      <p className="text-xs text-muted-foreground/90 leading-relaxed font-sans">{activeJobDetails.matchReasoning}</p>
                    </div>
                  )}

                  {/* Dynamic Color Blocks: Qualifications (Purple) & Benefits (Emerald) */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Qualifications Block - Purple */}
                    <div className="p-4 bg-indigo-500/5 border border-indigo-500/25 rounded-2xl space-y-2">
                      <h4 className="text-2xs font-extrabold uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
                        <Award className="h-4 w-4 text-indigo-400" /> Key Qualifications
                      </h4>
                      {sections.qualifications.length > 0 ? (
                        <ul className="space-y-1.5">
                          {sections.qualifications.map((qStr, idx) => (
                            <li key={idx} className="text-xs text-muted-foreground/90 list-disc ml-4 font-sans leading-relaxed">{qStr}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-3xs text-muted-foreground/80 font-sans leading-relaxed">
                          Consult full listing for specific required certifications, degree conditions, or tech stacks.
                        </p>
                      )}
                    </div>

                    {/* Benefits Block - Emerald */}
                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/25 rounded-2xl space-y-2">
                      <h4 className="text-2xs font-extrabold uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                        <Gift className="h-4 w-4 text-emerald-400" /> Benefits & Compensation
                      </h4>
                      {sections.benefits.length > 0 ? (
                        <ul className="space-y-1.5">
                          {sections.benefits.map((bStr, idx) => (
                            <li key={idx} className="text-xs text-muted-foreground/90 list-disc ml-4 font-sans leading-relaxed">{bStr}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-3xs text-muted-foreground/80 font-sans leading-relaxed">
                          Consult full listing details for insurance, health stipends, remote setups, or workspace allowances.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Job Description full text */}
                  <div className="space-y-2">
                    <span className="text-3xs uppercase font-extrabold text-muted-foreground tracking-widest">Full Opportunity Details</span>
                    <div 
                      className="text-xs text-muted-foreground/90 leading-relaxed font-sans border border-border/40 p-4.5 rounded-2xl max-h-[300px] overflow-y-auto bg-muted/10 prose prose-invert"
                      dangerouslySetInnerHTML={{ __html: activeJobDetails.description || '' }}
                    />
                  </div>
                </div>

                <DialogFooter className="border-t border-border/40 pt-4 flex gap-2.5">
                  <a
                    href={activeJobDetails.link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 items-center justify-center rounded-xl bg-muted border border-border px-4 text-2xs font-bold uppercase hover:bg-muted/80 transition-colors gap-1.5"
                  >
                    Go to Portal <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <Button
                    onClick={() => handleTrackOpportunity(activeJobDetails)}
                    disabled={isTracked}
                    className="font-bold uppercase tracking-wider text-2xs rounded-xl shadow-lg h-9"
                  >
                    {isTracked ? 'Tracked ✓' : 'Track Opportunity'}
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ========================================== */}
      {/* EDIT / CREATE APPLICATION DIALOG           */}
      {/* ========================================== */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg bg-card border border-border/80 rounded-3xl shadow-2xl backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-foreground tracking-tight">
              {selectedApp ? 'Edit Application Details' : 'Track New Application'}
            </DialogTitle>
            <DialogDescription className="text-3xs uppercase font-extrabold tracking-widest text-muted-foreground mt-1">
              {selectedApp ? 'Update fields or documents link in Firestore' : 'Fill in coordinates to track in Firestore'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveApplication} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              {/* Job Title */}
              <div className="space-y-1.5">
                <Label className="text-2xs font-extrabold uppercase tracking-widest text-muted-foreground">Job Title *</Label>
                <Input 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  placeholder="e.g. Full-Stack Developer" 
                  required 
                  className="h-9 text-xs bg-muted/40 border-border/50 rounded-xl"
                />
              </div>

              {/* Company */}
              <div className="space-y-1.5">
                <Label className="text-2xs font-extrabold uppercase tracking-widest text-muted-foreground">Company Name *</Label>
                <Input 
                  value={company} 
                  onChange={e => setCompany(e.target.value)} 
                  placeholder="e.g. Domari Ltd" 
                  required 
                  className="h-9 text-xs bg-muted/40 border-border/50 rounded-xl"
                />
              </div>

              {/* Type */}
              <div className="space-y-1.5">
                <Label className="text-2xs font-extrabold uppercase tracking-widest text-muted-foreground">Type</Label>
                <Select value={type} onValueChange={(val: any) => setType(val)}>
                  <SelectTrigger className="h-9 text-xs bg-muted/40 border-border/50 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border border-border">
                    <SelectItem value="job">Job Listing</SelectItem>
                    <SelectItem value="scholarship">Scholarship Opportunity</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <Label className="text-2xs font-extrabold uppercase tracking-widest text-muted-foreground">Stage / Status</Label>
                <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                  <SelectTrigger className="h-9 text-xs bg-muted/40 border-border/50 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border border-border">
                    {COLUMNS.map(c => (
                      <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Location */}
              <div className="space-y-1.5">
                <Label className="text-2xs font-extrabold uppercase tracking-widest text-muted-foreground font-semibold flex items-center gap-1"><MapPin className="h-3 w-3" /> Location</Label>
                <Input 
                  value={location} 
                  onChange={e => setLocation(e.target.value)} 
                  placeholder="e.g. Kigali, Rwanda / Remote" 
                  className="h-9 text-xs bg-muted/40 border-border/50 rounded-xl"
                />
              </div>

              {/* Compensation */}
              <div className="space-y-1.5">
                <Label className="text-2xs font-extrabold uppercase tracking-widest text-muted-foreground font-semibold flex items-center gap-1"><DollarSign className="h-3 w-3" /> Compensation</Label>
                <Input 
                  value={compensation} 
                  onChange={e => setCompensation(e.target.value)} 
                  placeholder="e.g. $1,500/mo or Competitive" 
                  className="h-9 text-xs bg-muted/40 border-border/50 rounded-xl"
                />
              </div>

              {/* Deadline */}
              <div className="space-y-1.5">
                <Label className="text-2xs font-extrabold uppercase tracking-widest text-muted-foreground font-semibold flex items-center gap-1"><Calendar className="h-3 w-3" /> Deadline / Due Date</Label>
                <Input 
                  value={deadline} 
                  onChange={e => setDeadline(e.target.value)} 
                  placeholder="e.g. August 30, 2026" 
                  className="h-9 text-xs bg-muted/40 border-border/50 rounded-xl"
                />
              </div>

              {/* Listing URL */}
              <div className="space-y-1.5">
                <Label className="text-2xs font-extrabold uppercase tracking-widest text-muted-foreground font-semibold flex items-center gap-1"><LinkIcon className="h-3 w-3" /> Source URL</Label>
                <Input 
                  value={appUrl} 
                  onChange={e => setAppUrl(e.target.value)} 
                  placeholder="https://..." 
                  className="h-9 text-xs bg-muted/40 border-border/50 rounded-xl"
                />
              </div>

              {/* Contacts */}
              <div className="space-y-1.5 col-span-2">
                <Label className="text-2xs font-extrabold uppercase tracking-widest text-muted-foreground font-semibold flex items-center gap-1"><User className="h-3 w-3" /> Key Contacts</Label>
                <Input 
                  value={contacts} 
                  onChange={e => setContacts(e.target.value)} 
                  placeholder="e.g. John Doe (Recruiter) — john@company.com" 
                  className="h-9 text-xs bg-muted/40 border-border/50 rounded-xl"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5 col-span-2">
                <Label className="text-2xs font-extrabold uppercase tracking-widest text-muted-foreground">Description & Checklist Notes</Label>
                <textarea 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  placeholder="Interview details, tasks, requirements, checklist..." 
                  className="w-full text-xs bg-muted/40 border border-border/50 rounded-xl p-3 outline-none focus:border-primary min-h-[80px]"
                />
              </div>

              {/* Link files checklist */}
              {cvFilesOnly.length > 0 && (
                <div className="space-y-2 col-span-2">
                  <Label className="text-2xs font-extrabold uppercase tracking-widest text-muted-foreground">Link Workspace Documents</Label>
                  <div className="max-h-[110px] overflow-y-auto border border-border/40 p-2.5 rounded-xl bg-muted/20 flex flex-col gap-2">
                    {cvFilesOnly.map(file => (
                      <label key={file.name} className="flex items-center gap-2 text-3xs font-bold text-muted-foreground hover:text-foreground cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={linkedFiles.includes(file.name)}
                          onChange={() => handleToggleFile(file.name)}
                          className="accent-primary h-3.5 w-3.5"
                        />
                        {file.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="border-t border-border/30 pt-4 flex gap-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="h-9 font-bold uppercase tracking-wider text-2xs rounded-xl">
                Cancel
              </Button>
              <Button type="submit" className="h-9 font-bold uppercase tracking-wider text-2xs rounded-xl">
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
