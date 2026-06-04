/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  FilePlus, 
  History, 
  Home, 
  Users, 
  Settings, 
  BarChart3, 
  CreditCard,
  ChevronDown,
  Search,
  Bell,
  Menu,
  TrendingUp,
  AlertTriangle,
  ClipboardList,
  LogOut,
  LogIn
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { MOCK_DASHBOARD_DATA } from './data';
import { auth, signInWithGoogle, logout, onAuthStateChanged, User } from './lib/firebase';
import { translations, Language, formatNumber, formatInteger } from './i18n';

const cn = (...classes: string[]) => classes.filter(Boolean).join(' ');

const SidebarItem = ({ icon: Icon, label, active = false, onClick }: { icon: any, label: string, active?: boolean, onClick?: () => void }) => (
  <div 
    onClick={onClick}
    className={cn(
      "flex items-center gap-3 px-6 py-3 cursor-pointer transition-all duration-300 border-l-4",
      active 
        ? 'bg-aqua-primary/10 text-aqua-primary border-aqua-primary shadow-[inset_10px_0_20px_rgba(0,174,239,0.1)]' 
        : 'text-aqua-muted hover:text-white hover:bg-white/5 border-transparent'
    )}
  >
    <Icon size={18} strokeWidth={active ? 2.5 : 2} />
    <span className={`text-xs uppercase tracking-[0.2em] font-bold ${active ? 'opacity-100' : 'opacity-80'}`}>{label}</span>
  </div>
);

const KPIStore = ({ title, value, color }: { title: string, value: string | number, color: string }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="glass-card p-6 border border-white/5 relative overflow-hidden group"
  >
    <div className="absolute -top-12 -right-12 w-24 h-24 bg-aqua-primary/10 rounded-full blur-3xl group-hover:bg-aqua-primary/20 transition-all" />
    <p className="text-aqua-muted text-[10px] uppercase tracking-[0.2em] font-extrabold mb-2">{title}</p>
    <h3 className="text-3xl font-mono font-bold text-white tracking-tighter">{value}</h3>
    <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: '70%' }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="h-full bg-gradient-to-r from-aqua-primary to-aqua-accent"
      />
    </div>
  </motion.div>
);

export default function App() {
  const [language, setLanguage] = useState<Language>('PT');
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [jobs, setJobs] = useState<any[]>([]);
  const [jobDescription, setJobDescription] = useState('');
  const [geneticFile, setGeneticFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [uploadStage, setUploadStage] = useState<'idle' | 'validating' | 'sending' | 'processing' | 'completed' | 'error'>('idle');

  // Dynamic Selected Run State
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedJobData, setSelectedJobData] = useState<any | null>(null);
  const [aiInsightsText, setAiInsightsText] = useState<{ summary: string; riskAlert: string } | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  const t = translations[language];

  // Auth synchronization
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to Firestore Analytical Jobs
  useEffect(() => {
    if (user) {
      const unsubscribePromise = import('./services/jobService').then(m => 
        m.subscribeToJobs(user.uid, (fetchedJobs) => {
          setJobs(fetchedJobs);
        })
      );
      return () => {
        unsubscribePromise.then(fn => fn());
      };
    }
  }, [user]);

  // Handle dynamic loading of evaluations and triggering of Gemini AI executive insights
  useEffect(() => {
    if (!selectedJobId) {
      setSelectedJobData(null);
      setAiInsightsText(null);
      return;
    }

    const cached = localStorage.getItem(`job_res_${selectedJobId}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setSelectedJobData(parsed);

        // Fetch customized Gemini-3.5-flash insights server-side
        setInsightsLoading(true);
        fetch('/api/generate-insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metrics: parsed.metrics,
            warnings: parsed.warnings,
            language: language,
            fileName: parsed.fileName || 'dna_evaluate.xlsx'
          })
        })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setAiInsightsText({
              summary: data.summary,
              riskAlert: data.riskAlert
            });
          }
          setInsightsLoading(false);
        })
        .catch(e => {
          console.error("Failed to generate AI executive insights:", e);
          setAiInsightsText({
            summary: language === 'PT' ? parsed.summary : (language === 'NL' ? "Dynamische populatieanalyse toont fokwaarde stijging." : parsed.summary || "High performing breeders concentrated."),
            riskAlert: parsed.warnings?.[0] || "Validate parent indices details."
          });
          setInsightsLoading(false);
        });

      } catch (e) {
        console.error("Cache read error for job details:", e);
        setSelectedJobData(null);
      }
    } else {
      // Dynamic fallback: Load from GCS via backend API
      setSelectedJobData(null);
      setAiInsightsText(null);
      setInsightsLoading(true);

      fetch(`/api/analysis/${selectedJobId}`)
        .then(res => {
          if (!res.ok) {
            throw new Error(`Cloud server returned HTTP ${res.status}`);
          }
          return res.json();
        })
        .then(data => {
          if (data.success) {
            setSelectedJobData(data);
            
            // Cache downloaded analysis results to local storage
            try {
              localStorage.setItem(`job_res_${selectedJobId}`, JSON.stringify(data));
            } catch (err) {
              console.warn("Storage caching operation failure:", err);
            }

            // Now, run insights based on downloaded metrics
            return fetch('/api/generate-insights', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                metrics: data.metrics,
                warnings: data.warnings,
                language: language,
                fileName: data.fileName || 'dna_evaluate.xlsx'
              })
            })
            .then(res => res.json())
            .then(aiResult => {
              if (aiResult.success) {
                setAiInsightsText({
                  summary: aiResult.summary,
                  riskAlert: aiResult.riskAlert
                });
              } else {
                setAiInsightsText({
                  summary: language === 'PT' ? data.summary : (language === 'NL' ? "Dynamische populatieanalyse toont fokwaarde stijging." : data.summary || "High performing breeders concentrated."),
                  riskAlert: data.warnings?.[0] || "Validate parent indices details."
                });
              }
              setInsightsLoading(false);
            });
          } else {
            throw new Error(data.message || "Failed to download database files.");
          }
        })
        .catch(err => {
          console.error("GCS job retrieval or insights generation failed:", err);
          setSelectedJobData(null);
          setAiInsightsText(null);
          setInsightsLoading(false);
        });
    }
  }, [selectedJobId, language]);

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = () => logout();

  const handleNewJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !geneticFile) return;
    
    setIsUploading(true);
    setValidationError(null);
    setUploadStage('validating');
    try {
      const { uploadGeneticDataAndCreateJob } = await import('./services/jobService');
      const resultObj = await uploadGeneticDataAndCreateJob(geneticFile, jobDescription, user.uid, (stage) => {
        setUploadStage(stage);
      });
      
      setIsUploading(false);
      setIsModalOpen(false);
      setJobDescription('');
      setGeneticFile(null);
      setUploadStage('idle');
      setShowSuccess(true);
      
      // Auto-select the newly finished job on evaluation panel
      if (resultObj && resultObj.jobId) {
        setSelectedJobId(resultObj.jobId);
        setActiveTab('Dashboard');
      }

      setTimeout(() => setShowSuccess(false), 5000);
    } catch (error: any) {
      console.error("Job creation failed", error);
      setUploadStage('error');
      setValidationError(error.message || "Failed to upload and start pipeline. Please verify network or dataset structure.");
      setIsUploading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="h-screen bg-aqua-bg flex items-center justify-center font-sans overflow-hidden">
        {/* Animated Background Bubbles */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute bg-aqua-primary/30 rounded-full blur-xl"
              initial={{ x: Math.random() * 100 + '%', y: '110%', width: Math.random() * 100 + 50 }}
              animate={{ 
                y: '-20%',
                x: [null, (Math.random() - 0.5) * 20 + '%']
              }}
              transition={{ 
                duration: Math.random() * 10 + 10,
                repeat: Infinity,
                ease: "linear",
                delay: Math.random() * 10
              }}
              style={{ aspectRatio: '1/1' }}
            />
          ))}
        </div>
        <div className="flex flex-col items-center gap-6 relative z-10">
          <div className="w-16 h-16 border-2 border-aqua-primary/20 border-t-aqua-primary rounded-full animate-spin neon-glow" />
          <div className="text-center">
            <h1 className="text-xl font-black tracking-[0.5em] text-white animate-pulse">AQUA BREEDING</h1>
            <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-aqua-muted mt-2">Initializing Ecosystem...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen bg-aqua-bg flex items-center justify-center p-6 font-sans relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-aqua-primary/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-aqua-secondary/10 rounded-full blur-[120px]" />
          <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] bg-aqua-accent/5 rounded-full blur-[100px]" />
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-2xl glass-card border border-white/5 overflow-hidden relative z-10 shadow-[0_40px_100px_rgba(0,0,0,0.6)]"
        >
          <div className="grid md:grid-cols-2">
            <div className="p-12 aqua-gradient text-white flex flex-col justify-center relative overflow-hidden border-r border-white/10">
              <div className="absolute top-0 left-0 w-full h-full opacity-20">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(255,255,255,0.4),transparent)]" />
              </div>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <TrendingUp size={64} className="mb-8 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
                <h1 className="text-5xl font-black tracking-tighter leading-none mb-4">AQUA<br/>BREEDING</h1>
                <div className="h-1 w-16 bg-white mb-6" />
                <p className="text-sm font-medium text-white/80 leading-relaxed uppercase tracking-widest">
                  Next-Gen Genetic Analytics <br/> for Sustainable Aquaculture
                </p>
              </motion.div>
            </div>
            
            <div className="p-12 flex flex-col justify-center bg-aqua-card/20">
              <div className="mb-10">
                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">Enterprise Access</h2>
                <p className="text-sm text-aqua-muted leading-relaxed">
                  Connect to the world's most advanced aquatic breeding intelligence platform.
                </p>
              </div>
              
              <button 
                onClick={handleLogin}
                className="w-full py-4 aqua-gradient rounded-full flex items-center justify-center gap-4 hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_10px_30px_rgba(0,174,239,0.3)] group"
              >
                <div className="w-8 h-8 bg-white/20 backdrop-blur-md overflow-hidden rounded-full flex items-center justify-center border border-white/30">
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-4 h-4" />
                </div>
                <span className="text-sm font-black text-white uppercase tracking-widest">Secure Sign In</span>
              </button>
              
              <div className="mt-12 flex items-center gap-4">
                <div className="flex -space-x-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-aqua-bg bg-aqua-card flex items-center justify-center text-[8px] font-bold text-aqua-muted">
                      AQ
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-aqua-muted font-bold uppercase tracking-widest">Trusted by 500+ global hatcheries</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Choose display values dynamically based on selectedJobState
  const activeKpis = selectedJobData ? selectedJobData.kpis : MOCK_DASHBOARD_DATA.kpis;
  const activeHistogram = selectedJobData ? selectedJobData.histogram : MOCK_DASHBOARD_DATA.histogram;
  const activeTopAnimals = selectedJobData ? selectedJobData.topAnimals : MOCK_DASHBOARD_DATA.topAnimals;
  const activeBottomAnimals = selectedJobData ? selectedJobData.bottomAnimals : MOCK_DASHBOARD_DATA.bottomAnimals;

  return (
    <div className="flex h-screen bg-aqua-bg font-sans text-white overflow-hidden relative">
      {/* Background Bubbles */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-10">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute bg-aqua-primary/20 rounded-full blur-3xl"
            initial={{ x: Math.random() * 100 + '%', y: '110%', width: Math.random() * 150 + 100 }}
            animate={{ y: '-20%', x: [null, (Math.random() - 0.5) * 20 + '%'] }}
            transition={{ duration: Math.random() * 20 + 20, repeat: Infinity, ease: "linear" }}
            style={{ aspectRatio: '1/1' }}
          />
        ))}
      </div>

      {/* Success Notification */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="fixed top-8 right-8 z-[100] aqua-gradient text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/20 neon-glow"
          >
            <div className="bg-white/20 p-2 rounded-full">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="font-bold text-sm uppercase tracking-widest font-mono">Ecosystem Synced</p>
              <p className="text-[10px] opacity-80 uppercase tracking-widest">Cloud Model Calculated Solutions</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className="w-64 bg-aqua-card/50 backdrop-blur-2xl flex flex-col shrink-0 border-r border-white/5 relative z-10 animate-fade-in">
        <div className="p-8 flex items-center gap-3">
          <div className="w-10 h-10 aqua-gradient rounded-xl flex items-center justify-center shadow-lg shadow-aqua-primary/20">
            <TrendingUp size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-widest leading-none">AQUA</h1>
            <p className="text-[10px] text-aqua-primary uppercase tracking-[0.3em] mt-1 font-extrabold leading-none">BREEDING</p>
          </div>
        </div>
        
        <nav className="flex-1 mt-6">
          <SidebarItem icon={LayoutDashboard} label={t.dashboard} active={activeTab === 'Dashboard'} onClick={() => setActiveTab('Dashboard')} />
          <div onClick={() => setIsModalOpen(true)}>
            <SidebarItem icon={FilePlus} label={t.newJob} />
          </div>
          <SidebarItem icon={History} label={t.history} active={activeTab === 'History'} onClick={() => setActiveTab('History')} />
          <SidebarItem icon={Home} label={t.farms} active={activeTab === 'Farms'} onClick={() => setActiveTab('Farms')} />
          <SidebarItem icon={Users} label={t.animals} active={activeTab === 'Animals'} onClick={() => setActiveTab('Animals')} />
          <SidebarItem icon={BarChart3} label={t.reports} active={activeTab === 'Reports'} onClick={() => setActiveTab('Reports')} />
          <SidebarItem icon={CreditCard} label={t.billing} active={activeTab === 'Billing'} onClick={() => setActiveTab('Billing')} />
          <SidebarItem icon={Settings} label={t.settings} active={activeTab === 'Settings'} onClick={() => setActiveTab('Settings')} />
        </nav>

        <div className="p-6">
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <p className="text-[10px] text-aqua-muted uppercase tracking-[0.2em] mb-2 font-black text-center">Node Health</p>
            <div className="flex justify-between items-center text-white/60 text-[10px] font-bold">
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-aqua-accent rounded-full animate-pulse" />
                Aqua-AI Core
              </span>
              <span className="text-aqua-accent">ONLINE</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-y-auto relative z-10">
        {/* Header */}
        <header className="h-20 bg-aqua-bg/50 backdrop-blur-md border-b border-white/5 px-8 flex items-center justify-between shrink-0 sticky top-0 z-50">
          <div className="flex items-center gap-4">
            <div 
              onClick={() => { setSelectedJobId(null); setActiveTab('Dashboard'); }}
              className="flex items-center gap-3 px-4 py-2 bg-aqua-card/50 rounded-full text-white/80 cursor-pointer hover:bg-aqua-card transition-all border border-white/5 group"
            >
              <div className="w-2 h-2 bg-aqua-primary rounded-full group-hover:animate-ping" />
              <span className="text-xs font-black uppercase tracking-widest">
                {selectedJobId ? `Run: ${selectedJobId} [Reset View]` : "Global Ecosystem"}
              </span>
              <ChevronDown size={14} className="opacity-40" />
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-aqua-muted" size={16} />
              <input 
                type="text" 
                placeholder={t.searchPlaceholder} 
                className="pl-12 pr-6 py-2.5 bg-aqua-card/50 border border-white/5 rounded-full text-[11px] font-bold uppercase tracking-[0.1em] w-80 focus:outline-none focus:ring-1 focus:ring-aqua-primary transition-all text-white placeholder:text-aqua-muted"
              />
            </div>

            <div className="flex items-center gap-5">
              <div className="relative cursor-pointer group">
                <Bell size={20} className="text-aqua-muted group-hover:text-white transition-colors" />
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 aqua-gradient text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-aqua-bg shadow-sm">3</span>
              </div>

              <div className="h-8 w-px bg-white/10 mx-2" />

              <div className="relative">
                <button 
                  onClick={() => setIsLangOpen(!isLangOpen)}
                  className="flex items-center gap-1 p-1 bg-aqua-card/50 rounded-full border border-white/5 hover:border-aqua-primary transition-all group"
                >
                  <img 
                    src={`https://flagcdn.com/w40/${language === 'PT' ? 'br' : language === 'EN' ? 'us' : 'nl'}.png`}
                    alt={language}
                    className="w-6 h-6 rounded-full object-cover border border-white/10"
                  />
                  <ChevronDown size={13} className={cn("text-aqua-muted transition-transform group-hover:text-aqua-primary", isLangOpen ? "rotate-180" : "")} />
                </button>
                <AnimatePresence>
                  {isLangOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsLangOpen(false)} />
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute top-full right-0 mt-3 w-56 bg-aqua-card border border-white/10 rounded-[24px] shadow-2xl z-50 overflow-hidden border-t-4 border-t-aqua-primary backdrop-blur-xl"
                      >
                        <div 
                          onClick={() => { setLanguage('PT'); setIsLangOpen(false); }}
                          className={cn("flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-white/5 transition-colors", language === 'PT' ? "bg-white/5" : "")}
                        >
                          <img src="https://flagcdn.com/w40/br.png" alt="PT" className="w-5 h-5 rounded-full object-cover border border-white/10" />
                          <span className="text-[11px] font-bold text-white uppercase tracking-tight">Português (PT)</span>
                        </div>
                        <div 
                          onClick={() => { setLanguage('EN'); setIsLangOpen(false); }}
                          className={cn("flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-white/5 transition-colors", language === 'EN' ? "bg-white/5" : "")}
                        >
                          <img src="https://flagcdn.com/w40/us.png" alt="EN" className="w-5 h-5 rounded-full object-cover border border-white/10" />
                          <span className="text-[11px] font-bold text-white uppercase tracking-tight">English (EN)</span>
                        </div>
                        <div 
                          onClick={() => { setLanguage('NL'); setIsLangOpen(false); }}
                          className={cn("flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-white/5 transition-colors", language === 'NL' ? "bg-white/5" : "")}
                        >
                          <img src="https://flagcdn.com/w40/nl.png" alt="NL" className="w-5 h-5 rounded-full object-cover border border-white/10" />
                          <span className="text-[11px] font-bold text-white uppercase tracking-tight">Nederlands (NL)</span>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              <div className="h-8 w-px bg-white/10 mx-2" />

              <div className="flex items-center gap-3 cursor-pointer group relative">
                <div className="text-right hidden md:block">
                  <p className="text-[11px] font-black text-white uppercase tracking-widest">{user.displayName || "Geneticist"}</p>
                  <p className="text-[9px] text-aqua-primary font-bold italic tracking-tighter uppercase font-mono">Breeder Officer</p>
                </div>
                <div className="relative">
                  <img 
                    src={user.photoURL || "https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=150"} 
                    alt="Profile" 
                    className="w-10 h-10 rounded-xl border border-white/10 shadow-sm group-hover:border-aqua-primary transition-all object-cover neon-glow"
                  />
                  {/* Profile Dropdown */}
                  <div className="absolute top-full right-0 mt-3 w-56 bg-aqua-card border border-white/10 rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[200] p-2 overflow-hidden border-t-4 border-t-aqua-primary backdrop-blur-xl">
                    <div className="px-4 py-3 border-b border-white/5 mb-1 bg-white/5">
                      <p className="text-[9px] uppercase font-black text-aqua-muted tracking-[0.2em] font-mono">Bio-Compute ID</p>
                      <p className="text-[10px] font-mono text-aqua-primary truncate">{user.uid}</p>
                    </div>
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors text-[10px] font-black uppercase tracking-widest"
                    >
                      <LogOut size={14} />
                      Disconnect Node
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Tab Switcher Grid */}
        <AnimatePresence mode="wait">
          {activeTab === 'Dashboard' && (
            <motion.div 
              key="Dashboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="p-8 space-y-12 max-w-7xl mx-auto w-full relative"
            >
              {/* Hero Section */}
              <section className="relative h-64 rounded-[40px] overflow-hidden flex flex-col justify-center px-12 border border-white/10 shadow-2xl">
                <div className="absolute inset-0 aqua-gradient opacity-10" />
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-aqua-bg to-transparent" />
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative z-10"
                >
                  <span className="px-4 py-1.5 aqua-gradient text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-full shadow-lg border border-white/20 mb-6 inline-block">{t.heroBadge}</span>
                  <h2 className="text-5xl font-black text-white tracking-tighter mb-4">
                    {selectedJobData ? `RUN: ${selectedJobData.projectName}` : t.heroTitle}{' '}
                    <span className="text-transparent bg-clip-text aqua-gradient">
                      {selectedJobData ? "EVALUATION" : t.heroTitleHighlight}
                    </span>
                  </h2>
                  <p className="text-aqua-muted max-w-xl text-sm leading-relaxed font-medium">
                    {selectedJobData ? `Currently illustrating dynamic livestock MME solutions evaluated from dataset file "${selectedJobData.fileName}". Click "Global Ecosystem" to reset.` : t.heroDescription}
                  </p>
                </motion.div>
              </section>

              {/* Top KPIs */}
              <section className="grid grid-cols-4 gap-6">
                <KPIStore title={t.activeJobs} value={formatInteger(selectedJobId ? 1 : jobs.length || 12, language)} color="bg-aqua-primary" />
                <KPIStore title={t.analyzedAnimals} value={formatInteger(activeKpis.analyzedAnimals, language)} color="bg-aqua-accent" />
                <KPIStore title={t.selectionRate} value={`${formatNumber(activeKpis.selectionRate, language)}%`} color="bg-aqua-primary" />
                <KPIStore title={t.meanAccuracy} value={`${formatNumber(activeKpis.meanAccuracy, language)}%`} color="bg-aqua-accent" />
              </section>

              <div className="grid grid-cols-12 gap-8">
                {/* Histogram Column */}
                <div className="col-span-8 flex flex-col gap-8">
                  <section className="glass-card p-8 border border-white/5 flex flex-col gap-8">
                    <div className="flex items-end justify-between border-b border-white/5 pb-6">
                      <div>
                        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-aqua-primary">{t.ebvDistribution}</h2>
                        <p className="text-[10px] text-aqua-muted font-bold mt-1 uppercase tracking-widest">{t.frequencyByDeviation}</p>
                      </div>
                      <div className="flex gap-4 text-[10px] font-bold text-aqua-muted tracking-widest uppercase">
                        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]"></span> {t.negativeDeviation}</span>
                        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-aqua-accent shadow-[0_0_10px_rgba(0,174,239,0.5)]"></span> {t.geneticGain}</span>
                      </div>
                    </div>
                    <div className="h-[320px] w-full mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={activeHistogram} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="1 8" vertical={false} stroke="#ffffff10" />
                          <XAxis 
                            dataKey="label" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#6B7280', fontSize: 10, fontWeight: 700 }} 
                            dy={10} 
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#6B7280', fontSize: 10, fontWeight: 700 }} 
                          />
                          <Tooltip 
                            cursor={{ fill: '#ffffff05' }} 
                            contentStyle={{ backgroundColor: '#071426', borderRadius: '16px', border: '1px solid #ffffff10', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', fontSize: '10px', fontWeight: 'bold', color: '#fff' }}
                          />
                          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                            {activeHistogram.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={parseFloat(entry.label) >= 0 ? '#00E5C4' : '#F43F5E'} fillOpacity={0.8} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </section>

                  {/* Selection Tables */}
                  <div className="grid grid-cols-2 gap-8">
                    {/* Top Animals */}
                    <section className="glass-card p-6 border border-white/5">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-aqua-accent mb-6 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-aqua-accent rounded-full neon-glow" />
                        {t.geneticElite} (Top 5)
                      </h3>
                      <table className="w-full text-left">
                        <thead>
                          <tr className="text-aqua-muted text-[9px] font-black uppercase tracking-[0.2em] border-b border-white/10">
                            <th className="pb-4">BIO ID</th>
                            <th className="pb-4">IDENTIFIER</th>
                            <th className="pb-4 text-right">EBV SCORE</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeTopAnimals.map((animal: any) => (
                            <tr key={animal.id} className="text-white hover:bg-white/5 transition-all border-b border-white/5 last:border-0 group">
                              <td className="py-4 text-[10px] font-mono font-bold text-aqua-primary/40 group-hover:text-aqua-primary transition-colors">#{animal.id}</td>
                              <td className="py-4 text-xs font-black tracking-tight">{animal.name.toUpperCase()}</td>
                              <td className="py-4 text-right text-sm font-black text-aqua-accent">+{animal.ebv.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </section>

                    {/* Bottom Animals */}
                    <section className="glass-card p-6 border border-white/5">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500 mb-6 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-rose-500 rounded-full shadow-[0_0_10px_rgba(244,63,94,0.5)]" />
                        Genetic At-Risk (Bottom 3)
                      </h3>
                      <table className="w-full text-left">
                        <thead>
                          <tr className="text-aqua-muted text-[9px] font-black uppercase tracking-[0.2em] border-b border-white/10">
                            <th className="pb-4">BIO ID</th>
                            <th className="pb-4">IDENTIFIER</th>
                            <th className="pb-4 text-right">EBV SCORE</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeBottomAnimals.map((animal: any) => (
                            <tr key={animal.id} className="text-white hover:bg-white/5 transition-all border-b border-white/5 last:border-0 group">
                              <td className="py-4 text-[10px] font-mono font-bold text-rose-500/30 group-hover:text-rose-500 transition-colors">#{animal.id}</td>
                              <td className="py-4 text-xs font-black tracking-tight">{animal.name.toUpperCase()}</td>
                              <td className="py-4 text-right text-sm font-black text-rose-500">{animal.ebv.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </section>
                  </div>

                  {/* Recent Jobs - Live Bio-Computation Stream */}
                  <section className="glass-card p-8 border border-white/5">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-aqua-primary flex items-center gap-3">
                        <ClipboardList className="text-aqua-primary" size={16} />
                        Live Bio-Computation Stream
                      </h3>
                      <div className="px-3 py-1 bg-white/5 rounded-full text-[9px] font-black tracking-widest uppercase text-aqua-accent border border-aqua-accent/20">AQUA-CORE: ACTIVE</div>
                    </div>
                    <table className="w-full text-left font-mono text-xs">
                      <thead>
                        <tr className="text-aqua-muted text-[9px] font-extrabold uppercase tracking-[0.2em] border-b border-white/5">
                          <th className="pb-4">NODE IDENTIFIER</th>
                          <th className="pb-4 border-l border-white/5 pl-4">ANALYSIS DESCRIPTION</th>
                          <th className="pb-4">PROTOCOL STATUS</th>
                          <th className="pb-4 text-right">SYNC TIMESTAMP</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {jobs.length > 0 ? jobs.map((job) => (
                          <tr 
                            key={job.id} 
                            onClick={() => setSelectedJobId(job.jobId)}
                            className={cn(
                              "text-white hover:bg-white/5 transition-all group cursor-pointer",
                              selectedJobId === job.jobId ? "bg-white/5 border-l-2 border-aqua-primary" : ""
                            )}
                          >
                            <td className="py-5 font-mono text-[10px] font-bold text-aqua-primary/40 group-hover:text-aqua-primary transition-colors pr-2">#{job.jobId}</td>
                            <td className="py-5 text-xs font-black tracking-wider text-white/90 border-l border-white/5 pl-4 truncate max-w-[200px]">{job.description}</td>
                            <td className="py-5">
                              <div className={`flex items-center gap-2 ${job.status === 'completed' ? 'text-aqua-accent' : job.status === 'failed' ? 'text-rose-500' : 'text-aqua-muted'}`}>
                                <span className={`w-2 h-2 rounded-full ${job.status === 'completed' ? 'bg-aqua-accent neon-glow' : job.status === 'failed' ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 'bg-aqua-muted animate-pulse'}`}></span>
                                <span className="text-[9px] font-bold uppercase tracking-[0.15em]">
                                  {job.status === 'completed' ? 'SYNC_STABLE' : job.status === 'failed' ? 'NODE_ERROR' : 'COMPUTING...'}
                                </span>
                              </div>
                            </td>
                            <td className="py-5 text-right text-[10px] font-bold text-aqua-muted">
                              {job.createdAt?.toDate ? job.createdAt.toDate().toLocaleDateString(language === 'PT' ? 'pt-BR' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase() : 'JUST_NOW'}
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={4} className="py-16 text-center text-aqua-muted text-[10px] font-black uppercase tracking-[0.3em] opacity-30">
                              Empty Bio-Compute Stream
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </section>
                </div>

                {/* AI Insights Column */}
                <div className="col-span-4 flex flex-col gap-8">
                  <section className="aqua-gradient p-10 rounded-[40px] shadow-[0_40px_80px_rgba(0,174,239,0.3)] text-white flex flex-col gap-10 relative overflow-hidden sticky top-32 border border-white/20">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-white/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-[80px]" />
                    
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-[20px] flex items-center justify-center border border-white/30 shadow-xl">
                          <BarChart3 className="text-white" size={24} />
                        </div>
                        <div>
                          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white underline decoration-white/30 decoration-2 underline-offset-4">{t.lastAnalysisTitle}</h3>
                          <p className="text-[9px] uppercase tracking-[0.3em] opacity-60 font-black mt-1">Edge Intelligence v3.5</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="h-px bg-white/20 w-full" />
                    
                    <div className="space-y-8 relative z-10 min-h-[160px] flex flex-col justify-center">
                      {insightsLoading ? (
                        <div className="flex flex-col items-center gap-4 py-8">
                          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <p className="text-[10px] uppercase tracking-widest font-black text-white/70 animate-pulse">Vertex GenAI Formulating Insights...</p>
                        </div>
                      ) : (
                        <>
                          <p className="text-xl font-bold text-white leading-[1.4] tracking-tight">
                            {aiInsightsText ? `"${aiInsightsText.summary}"` : `"${MOCK_DASHBOARD_DATA.aiInsights.summary}"`}
                          </p>
                          
                          <div className="p-6 bg-aqua-card/20 backdrop-blur-md rounded-[32px] border border-white/10">
                            <div className="flex items-start gap-4">
                              <AlertTriangle className="text-aqua-accent shrink-0 mt-0.5" size={18} />
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-aqua-accent mb-2">Protocol Warning</p>
                                <p className="text-xs font-bold text-white/90 leading-relaxed tracking-tight font-mono">
                                  {aiInsightsText ? aiInsightsText.riskAlert : MOCK_DASHBOARD_DATA.aiInsights.riskAlert}
                                </p>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    <button 
                      onClick={() => {
                        const notify = document.createElement('div');
                        notify.className = "fixed bottom-8 right-8 bg-aqua-accent text-white px-6 py-4 rounded-xl shadow-2xl font-black text-xs uppercase tracking-widest z-[110] neon-glow font-mono";
                        notify.textContent = "GENERATING SYSTEM-DIODE PDF INDEX COPIES";
                        document.body.appendChild(notify);
                        setTimeout(() => notify.remove(), 4000);
                      }}
                      className="w-full py-5 px-8 bg-white text-aqua-bg rounded-full font-black text-[10px] uppercase tracking-[0.3em] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 group relative z-10 shadow-2xl"
                    >
                      {t.viewPdfReport}
                      <TrendingUp size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </button>
                    
                    <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center text-[8px] text-white/40 font-black tracking-[0.3em] uppercase">
                      <span>Logic: gemini-3.5-flash</span>
                      <span>Task: structured MME insight</span>
                    </div>
                  </section>
                </div>
              </div>
            </motion.div>
          )}

          {/* History Tab */}
          {activeTab === 'History' && (
            <motion.div 
              key="History"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="p-8 space-y-8 max-w-7xl mx-auto w-full relative"
            >
              <div className="flex justify-between items-center">
                <div>
                  <span className="px-3 py-1 bg-aqua-primary/10 text-aqua-primary text-[10px] uppercase tracking-widest rounded-full font-bold">Ledger Feed</span>
                  <h2 className="text-3xl font-black tracking-tight mt-2">Analysis Execution History</h2>
                </div>
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="px-6 py-3 aqua-gradient rounded-full text-xs font-black uppercase tracking-widest shadow-lg flex items-center gap-2"
                >
                  Launch New Node <TrendingUp size={14} />
                </button>
              </div>
              
              <div className="glass-card p-8 border border-white/5 space-y-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs">
                    <thead>
                      <tr className="text-aqua-muted text-[10px] font-black uppercase tracking-widest border-b border-white/5 pb-4">
                        <th className="pb-4">NODE IDENTIFIER</th>
                        <th className="pb-4">ANALYSIS DESCRIPTION</th>
                        <th className="pb-4">RECORDS VALUE</th>
                        <th className="pb-4">MEAN ESTIMATION ACCURACY</th>
                        <th className="pb-4">PROTOCOL STATUS</th>
                        <th className="pb-4 text-right">DATE STAMP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {jobs.map((job) => {
                        const cachedInfo = localStorage.getItem(`job_res_${job.jobId}`);
                        let recCount = "Standard";
                        let acc = "82%";
                        if (cachedInfo) {
                          try {
                            const p = JSON.parse(cachedInfo);
                            recCount = `${p.kpis?.analyzedAnimals} Animals`;
                            acc = `${p.kpis?.meanAccuracy}%`;
                          } catch (e) {}
                        }
                        return (
                          <tr 
                            key={job.id} 
                            onClick={() => { setSelectedJobId(job.jobId); setActiveTab('Dashboard'); }}
                            className="text-white hover:bg-white/5 transition-all group cursor-pointer"
                          >
                            <td className="py-5 font-mono text-[10px] font-bold text-aqua-primary/60 group-hover:text-aqua-primary">#{job.jobId}</td>
                            <td className="py-5 text-xs font-black text-white/90">{job.description}</td>
                            <td className="py-5 text-[10px] text-aqua-muted font-bold">{recCount}</td>
                            <td className="py-5 text-[10px] text-aqua-accent font-black">{acc}</td>
                            <td className="py-5">
                              <span className="px-2 py-0.5 rounded bg-aqua-accent/10 text-aqua-accent text-[9px] font-black tracking-widest uppercase">
                                {job.status === 'completed' ? 'SYNC_STABLE' : 'COMPUTING...'}
                              </span>
                            </td>
                            <td className="py-5 text-right text-[10px] text-aqua-muted font-bold">
                              {job.createdAt?.toDate ? job.createdAt.toDate().toLocaleDateString() : 'JUST NOW'}
                            </td>
                          </tr>
                        );
                      })}
                      {jobs.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-16 text-center text-aqua-muted text-xs uppercase tracking-widest opacity-30">
                            No previous runs logged in the ledger. Share/upload genetic sheets to start.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* Farms Tab */}
          {activeTab === 'Farms' && (
            <motion.div 
              key="Farms"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="p-8 space-y-8 max-w-7xl mx-auto w-full relative"
            >
              <div>
                <span className="px-3 py-1 bg-aqua-accent/10 text-aqua-accent text-[10px] uppercase tracking-widest rounded-full font-bold">Connected Nodes</span>
                <h2 className="text-3xl font-black tracking-tight mt-2">Digital Hatchery Network</h2>
              </div>
              
              <div className="grid grid-cols-3 gap-8">
                {[
                  { name: "Hatchery Node Alpha", location: "Natal, Brazil", temp: "27.4°C", density: "120/m³", flow: "98.2%", status: "OPTIMAL" },
                  { name: "Mekong Delta Hub", location: "Can Tho, Vietnam", temp: "28.1°C", density: "145/m³", flow: "95.6%", status: "OPTIMAL" },
                  { name: "North Sea Breeding Station", location: "Zeeland, Netherlands", temp: "19.2°C", density: "85/m³", flow: "99.4%", status: "STABLE" }
                ].map((farm, idx) => (
                  <div key={idx} className="glass-card p-6 border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-aqua-accent/5 rounded-full blur-2xl group-hover:bg-aqua-accent/10 transition-all" />
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="text-lg font-black tracking-tight text-white">{farm.name}</h3>
                        <p className="text-xs text-aqua-muted font-bold uppercase tracking-widest">{farm.location}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded bg-aqua-accent/10 text-aqua-accent text-[9px] font-black tracking-widest">{farm.status}</span>
                    </div>
                    
                    <div className="space-y-4 border-t border-white/5 pt-4 text-xs font-mono">
                      <div className="flex justify-between">
                        <span className="text-aqua-muted uppercase font-black">Water Temp</span>
                        <span className="text-white font-bold">{farm.temp}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-aqua-muted uppercase font-black">Stocking Density</span>
                        <span className="text-white font-bold">{farm.density}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-aqua-muted uppercase font-black">Telemetry Sync Flow</span>
                        <span className="text-white font-bold">{farm.flow}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Animals Tab */}
          {activeTab === 'Animals' && (
            <motion.div 
              key="Animals"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="p-8 space-y-8 max-w-7xl mx-auto w-full relative"
            >
              <div>
                <span className="px-3 py-1 bg-aqua-primary/10 text-aqua-primary text-[10px] uppercase tracking-widest rounded-full font-bold">Genetic Database</span>
                <h2 className="text-3xl font-black tracking-tight mt-2">Active Specimen Ledger</h2>
              </div>
              
              <div className="glass-card p-8 border border-white/5 space-y-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-aqua-muted text-[10px] font-black uppercase tracking-widest border-b border-white/5 pb-4">
                        <th className="pb-4">BIO-ID</th>
                        <th className="pb-4">IDENTIFIER</th>
                        <th className="pb-4">FOCK-VALUE (EBV)</th>
                        <th className="pb-4">ESTIMATION ACCURACY</th>
                        <th className="pb-4">BIOLOGICAL SEX</th>
                        <th className="pb-4 text-right">HERD CATEGORY</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs">
                      {[
                        { id: "#AQ-1345", name: "THOR", ebv: "+1.95", acc: "94.5%", sex: "MALE", status: "ELITE" },
                        { id: "#AQ-2896", name: "ESTRELA", ebv: "+1.85", acc: "92.0%", sex: "FEMALE", status: "ELITE" },
                        { id: "#AQ-1760", name: "MAX", ebv: "+1.78", acc: "89.4%", sex: "MALE", status: "ELITE" },
                        { id: "#AQ-3051", name: "BRISA", ebv: "+1.72", acc: "91.1%", sex: "FEMALE", status: "STANDARD" },
                        { id: "#AQ-4789", name: "BELLA", ebv: "-1.85", acc: "78.2%", sex: "FEMALE", status: "AT RISK" }
                      ].map((animal, idx) => (
                        <tr key={idx} className="hover:bg-white/5 transition-all text-white font-mono">
                          <td className="py-4 font-bold text-aqua-primary">{animal.id}</td>
                          <td className="py-4 font-black">{animal.name}</td>
                          <td className={`py-4 font-black ${animal.ebv.startsWith('+') ? 'text-aqua-accent' : 'text-rose-500'}`}>{animal.ebv}</td>
                          <td className="py-4 text-white/80 font-bold">{animal.acc}</td>
                          <td className="py-4 text-aqua-muted uppercase font-black text-[10px]">{animal.sex}</td>
                          <td className="py-4 text-right">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black tracking-widest uppercase ${animal.status === 'ELITE' ? 'bg-aqua-accent/10 text-aqua-accent' : animal.status === 'STANDARD' ? 'bg-aqua-primary/10 text-aqua-primary' : 'bg-rose-500/10 text-rose-400'}`}>
                              {animal.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* Reports Tab */}
          {activeTab === 'Reports' && (
            <motion.div 
              key="Reports"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="p-8 space-y-8 max-w-7xl mx-auto w-full relative"
            >
              <div>
                <span className="px-3 py-1 bg-aqua-primary/10 text-aqua-primary text-[10px] uppercase tracking-widest rounded-full font-bold">Document Export</span>
                <h2 className="text-3xl font-black tracking-tight mt-2">Executive Genetic Reports</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-8">
                <div className="glass-card p-8 border border-white/5 space-y-6">
                  <h3 className="text-lg font-black tracking-tight text-white mb-4">Export LaTeX PDF Summary</h3>
                  <p className="text-sm text-aqua-muted leading-relaxed">Generates a publication-grade genetic selection manual illustrating complete EBV variances, pedigree lines, genetic gain curves, and custom molecular advice.</p>
                  
                  <button 
                    onClick={() => {
                      const notify = document.createElement('div');
                      notify.className = "fixed bottom-8 right-8 bg-aqua-accent text-white px-6 py-4 rounded-xl shadow-2xl font-black text-xs uppercase tracking-widest z-[110] neon-glow font-mono";
                      notify.textContent = "PDF MANUAL SUCCESS • EXPORT DOWNLOAD INITIATED";
                      document.body.appendChild(notify);
                      setTimeout(() => notify.remove(), 4000);
                    }}
                    className="w-full py-4 aqua-gradient rounded-full text-xs font-black uppercase tracking-widest shadow-lg"
                  >
                    Download Breeder Manual (.pdf)
                  </button>
                </div>

                <div className="glass-card p-8 border border-white/5 space-y-6">
                  <h3 className="text-lg font-black tracking-tight text-white mb-4">Lineage CSV Mapping</h3>
                  <p className="text-sm text-aqua-muted leading-relaxed">Extract raw spreadsheet solutions, accuracies, standard errors of prediction, and genetic gain metrics mapped directly to specimen IDs for database input.</p>
                  
                  <button 
                    onClick={() => {
                      const notify = document.createElement('div');
                      notify.className = "fixed bottom-8 right-8 bg-aqua-primary text-white px-6 py-4 rounded-xl shadow-2xl font-black text-xs uppercase tracking-widest z-[110] neon-glow font-mono";
                      notify.textContent = "CSV SOLUTIONS DATASTREAM DOWNLOAD COMPLETED";
                      document.body.appendChild(notify);
                      setTimeout(() => notify.remove(), 4000);
                    }}
                    className="w-full py-4 bg-white/5 border border-white/10 text-white rounded-full text-xs font-black uppercase tracking-widest hover:bg-white/10"
                  >
                    Download Solutions CSV (.csv)
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Billing Tab */}
          {activeTab === 'Billing' && (
            <motion.div 
              key="Billing"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="p-8 space-y-8 max-w-7xl mx-auto w-full relative"
            >
              <div>
                <span className="px-3 py-1 bg-aqua-primary/10 text-aqua-primary text-[10px] uppercase tracking-widest rounded-full font-bold">Account Hub</span>
                <h2 className="text-3xl font-black tracking-tight mt-2">Enterprise Computing Metrics</h2>
              </div>
              
              <div className="grid grid-cols-12 gap-8">
                <div className="col-span-8 glass-card p-8 border border-white/5 space-y-6">
                  <h3 className="text-xl font-black tracking-tight text-white">Quantum Breeder Pro Plan</h3>
                  <p className="text-xs text-aqua-muted font-bold uppercase tracking-widest">Active subscription: renewal scheduled for July 1st, 2026</p>
                  
                  <div className="h-px bg-white/5 w-full my-6" />
                  
                  <div className="grid grid-cols-2 gap-8 text-xs font-mono">
                    <div>
                      <h4 className="text-aqua-muted uppercase font-black mb-1">Billing Account Owner</h4>
                      <p className="text-white font-bold">{user?.email}</p>
                    </div>
                    <div>
                      <h4 className="text-aqua-muted uppercase font-black mb-1">Operational Nodes Cap</h4>
                      <p className="text-white font-bold">15 Nodes Active / 20 Total</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-aqua-muted uppercase font-black">
                      <span>MME Compute Usage (Current Cycle)</span>
                      <span className="text-aqua-accent font-mono font-bold">14,210,000 / 25,000,000 GFLOPS</span>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-aqua-primary to-aqua-accent" style={{ width: '56.8%' }} />
                    </div>
                  </div>
                </div>

                <div className="col-span-4 glass-card p-8 border border-white/5 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-black tracking-tight text-white mb-2">Aquaculture Credit Tier</h3>
                    <p className="text-sm text-aqua-muted leading-relaxed">Additional on-demand computing power configured automatically.</p>
                  </div>
                  
                  <div className="my-8">
                    <h4 className="text-[10px] text-aqua-muted uppercase font-black tracking-widest mb-1 font-mono">Prepaid Balance</h4>
                    <p className="text-4xl font-mono font-bold text-white tracking-tighter">$1,250.00 <span className="text-xs font-sans text-aqua-accent font-black">USD</span></p>
                  </div>

                  <button className="w-full py-4 bg-white text-aqua-bg rounded-full text-xs font-black uppercase tracking-widest shadow-xl">
                    Add Computation Tokens
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Settings Tab */}
          {activeTab === 'Settings' && (
            <motion.div 
              key="Settings"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="p-8 space-y-8 max-w-7xl mx-auto w-full relative"
            >
              <div>
                <span className="px-3 py-1 bg-aqua-primary/10 text-aqua-primary text-[10px] uppercase tracking-widest rounded-full font-bold">Control Panel</span>
                <h2 className="text-3xl font-black tracking-tight mt-2">Biological System Settings</h2>
              </div>
              
              <div className="glass-card p-8 border border-white/5 space-y-8 max-w-3xl">
                <div>
                  <h3 className="text-lg font-black tracking-tight text-white mb-4">Variance Components Definition</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] uppercase font-black text-aqua-muted tracking-[0.2em] mb-2 block font-mono">Additive Genetic Variance (Va)</label>
                      <input type="number" defaultValue="4.0" className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-aqua-primary" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-black text-aqua-muted tracking-[0.2em] mb-2 block font-mono">Residual Variance (Ve)</label>
                      <input type="number" defaultValue="6.0" className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-aqua-primary" />
                    </div>
                  </div>
                  <p className="text-xs text-aqua-muted mt-3 leading-relaxed">These components define the Mixed Model Equations ratio (lambdas: &lambda; = Ve/Va = 1.5), directly controlling EBV shrinks.</p>
                </div>

                <div className="h-px bg-white/5 w-full" />

                <div>
                  <h3 className="text-lg font-black tracking-tight text-white mb-4">Aquatic Species Model</h3>
                  <select className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-aqua-primary">
                    <option value="tilapia">N Nile Tilapia (Oreochromis niloticus)</option>
                    <option value="salmon">Atlantic Salmon (Salmo salar)</option>
                    <option value="shrimp">Whiteleg Shrimp (Litopenaeus vannamei)</option>
                  </select>
                </div>

                <div className="h-px bg-white/5 w-full" />

                <div className="flex justify-end gap-4">
                  <button className="px-6 py-3 border border-white/10 rounded-full text-xs font-black uppercase text-aqua-muted hover:bg-white/5">Load Defaults</button>
                  <button 
                    onClick={() => {
                      const notify = document.createElement('div');
                      notify.className = "fixed bottom-8 right-8 bg-aqua-accent text-white px-6 py-4 rounded-xl shadow-2xl font-black text-xs uppercase tracking-widest z-[110] neon-glow font-mono";
                      notify.textContent = "GENETIC VARIANCE SPECS SYNCHRONIZED";
                      document.body.appendChild(notify);
                      setTimeout(() => notify.remove(), 4000);
                    }}
                    className="px-8 py-3 aqua-gradient rounded-full text-xs font-black uppercase text-white shadow-lg"
                  >
                    Apply Genetic Config
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <footer className="mt-auto px-12 py-8 bg-aqua-card/30 border-t border-white/5 flex items-center justify-between text-[9px] font-black text-aqua-muted uppercase tracking-[0.3em] backdrop-blur-md">
          <p>© 2026 AQUA BREEDING ANALYTICS • {t.footerAuthority}</p>
          <div className="flex gap-10 items-center">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-aqua-accent neon-glow"></span>
              Quantum Protocol: SECURE
            </span>
            <span className="opacity-30">Node_ID: AQ-BR-001</span>
          </div>
        </footer>
      </main>

      {/* Upload Spreadsheet Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-aqua-bg/80 backdrop-blur-xl flex items-center justify-center p-6"
          >
            <motion.form 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onSubmit={handleNewJob}
              className="glass-card w-full max-w-lg overflow-hidden shadow-2xl border border-white/10"
            >
              <div className="p-8 aqua-gradient text-white">
                <h3 className="text-xl font-black uppercase tracking-widest font-sans">New Analysis Engine</h3>
                <p className="text-[10px] uppercase font-bold text-white/50 mt-1 italic tracking-[0.2em] font-mono">Worker: aqua-breeding-v3 (Edge Computing)</p>
              </div>
              
              <div className="p-8 space-y-6">
                <div>
                  <label className="text-[10px] uppercase font-black text-aqua-muted tracking-[0.2em] mb-3 block font-mono">Project Specification</label>
                  <input 
                    required
                    type="text" 
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Ex: Tilápia Elite Selection - Cycle 2026"
                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-aqua-primary/50 transition-all font-bold text-white placeholder:text-white/20"
                  />
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] uppercase font-black text-aqua-muted tracking-[0.2em] mb-3 block italic font-mono animate-pulse">Genetic_Dataset (.xlsx, .csv)</label>
                    <label className="border-2 border-dashed border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center bg-white/5 hover:border-aqua-primary/50 cursor-pointer transition-all group relative">
                      <input 
                         type="file" 
                         accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
                         className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                         onChange={(e) => {
                           if (e.target.files && e.target.files.length > 0) {
                             setGeneticFile(e.target.files[0]);
                             setValidationError(null);
                           }
                         }}
                      />
                      <FilePlus size={24} className={cn("mb-2 transition-colors", geneticFile ? "text-aqua-accent" : "text-aqua-muted group-hover:text-aqua-primary")} />
                      <span className={cn("text-[10px] font-black uppercase tracking-widest break-all max-w-[80%] text-center font-mono", geneticFile ? "text-white" : "text-aqua-muted group-hover:text-white")}>
                        {geneticFile ? geneticFile.name : "Upload Genetic Data"}
                      </span>
                    </label>
                  </div>
                  {validationError && (
                    <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-[10px] uppercase font-black tracking-widest leading-relaxed font-mono">
                      {validationError}
                    </div>
                  )}

                  {isUploading && (
                    <div className="mt-2 p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                      <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-widest text-white font-mono">
                        <span>Status da Operação</span>
                        <span className="text-aqua-accent font-mono font-bold animate-pulse">
                          {uploadStage === 'validating' ? 'Validando arquivo...' : 
                           uploadStage === 'sending' ? 'Enviando arquivo...' : 
                           uploadStage === 'processing' ? 'Processando análise...' : 
                           uploadStage === 'completed' ? 'Concluído!' : 
                           uploadStage === 'error' ? 'Erro amigável' : 'Processando...'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-2 text-center text-[8px] font-extrabold uppercase tracking-widest font-mono">
                        <div className={cn(
                          "p-2 rounded-lg transition-all",
                          uploadStage === 'validating' ? 'bg-aqua-primary/20 text-aqua-primary animate-pulse border border-aqua-primary/10' : 
                          (['sending', 'processing', 'completed'].includes(uploadStage) ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-aqua-muted')
                        )}>
                          VALIDANDO
                        </div>
                        <div className={cn(
                          "p-2 rounded-lg transition-all",
                          uploadStage === 'sending' ? 'bg-aqua-primary/20 text-aqua-primary animate-pulse border border-aqua-primary/10' : 
                          (['processing', 'completed'].includes(uploadStage) ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-aqua-muted')
                        )}>
                          ENVIANDO
                        </div>
                        <div className={cn(
                          "p-2 rounded-lg transition-all",
                          uploadStage === 'processing' ? 'bg-aqua-primary/20 text-aqua-primary animate-pulse border border-aqua-primary/10' : 
                          (uploadStage === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-aqua-muted')
                        )}>
                          PROCESSANDO
                        </div>
                        <div className={cn(
                          "p-2 rounded-lg transition-all",
                          uploadStage === 'completed' ? 'bg-emerald-500/20 text-emerald-400 font-black' : 'bg-white/5 text-aqua-muted'
                        )}>
                          CONCLUÍDO
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-4 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-aqua-muted hover:bg-white/5 transition-colors font-mono"
                  >
                    Cancel Discovery
                  </button>
                  <button 
                    type="submit"
                    disabled={!jobDescription || !geneticFile || isUploading}
                    className="flex-1 py-4 aqua-gradient text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl shadow-aqua-primary/20 hover:scale-[1.02] active:scale-100 disabled:opacity-50 disabled:hover:scale-100 transition-all flex items-center justify-center gap-2 neon-glow font-mono"
                  >
                    {isUploading ? (
                      <>Processing... <div className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin" /></>
                    ) : (
                      <>Launch Pipeline <TrendingUp size={14} /></>
                    )}
                  </button>
                </div>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
