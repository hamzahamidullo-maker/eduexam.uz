
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Exam, Question } from '../types';
import { MONTHS } from '../constants';
import { 
  Plus, LayoutDashboard, FileText, Users, ExternalLink, Settings, 
  Clock, CheckCircle, AlertCircle, Play, LogOut, UploadCloud, 
  ChevronRight, BarChart3, ShieldCheck, Copy, FileUp, Save, Eye,
  Share2, Download, FileJson, X, Bell, Wand2, Power, Loader2, RotateCcw,
  ArrowLeft, Info, Check, AlertTriangle, Trophy
} from 'lucide-react';
import { parseTestContent, autoFixFormatting } from '../services/geminiService';
import { supabase, DbAttempt, DbExam, DbSession } from '../services/supabase';
import { motion, AnimatePresence } from 'framer-motion';

declare const mammoth: any;

interface Notification {
  id: string;
  text: string;
  type: 'info' | 'success' | 'error';
}

export const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('eduexam_auth') === 'true' || sessionStorage.getItem('eduexam_auth') === 'true';
  });
  const [loginForm, setLoginForm] = useState({ user: '', pass: '', remember: true });
  const [loginError, setLoginError] = useState('');
  
  const [activeTab, setActiveTab] = useState<'exams' | 'live' | 'create' | 'results' | 'upload'>('exams');
  const [exams, setExams] = useState<DbExam[]>([]);
  const [attempts, setAttempts] = useState<DbAttempt[]>([]);
  const [activeSessions, setActiveSessions] = useState<DbSession[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [rawText, setRawText] = useState('');
  const [previewQuestions, setPreviewQuestions] = useState<Question[] | null>(null);
  const [activeJoinCode, setActiveJoinCode] = useState<string | null>(null);
  const [copyToast, setCopyToast] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [lastSaveStatus, setLastSaveStatus] = useState<{ time: string; success: boolean } | null>(null);
  
  const [viewingAttempt, setViewingAttempt] = useState<DbAttempt | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastNotificationRef = useRef<{ text: string; type: string; time: number } | null>(null);

  useEffect(() => {
    if (isLoggedIn) {
      fetchExams();
      fetchAttempts();
      fetchSessions();
      
      const pollInterval = setInterval(() => {
        fetchAttempts();
        fetchSessions();
      }, 5000);

      return () => clearInterval(pollInterval);
    }
  }, [isLoggedIn]);

  const fetchExams = async () => {
    try {
      const { data, error } = await supabase.from('exams').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (data) setExams(data);
    } catch (err: any) {
      const errorMsg = err.message || (typeof err === 'string' ? err : "Ulanish xatosi");
      console.error(`Failed to fetch exams: ${errorMsg}`);
    }
  };

  const fetchAttempts = async () => {
    try {
      const { data, error } = await supabase.from('attempts').select('*').order('started_at', { ascending: false });
      if (error) throw error;
      if (data) setAttempts(data);
    } catch (err: any) {
      const errorMsg = err.message || (typeof err === 'string' ? err : "Ulanish xatosi");
      console.error(`Failed to fetch attempts: ${errorMsg}`);
    }
  };

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase.from('sessions').select('*').eq('status', 'active');
      if (error) throw error;
      if (data) setActiveSessions(data);
    } catch (err: any) {
      const errorMsg = err.message || (typeof err === 'string' ? err : "Ulanish xatosi");
      console.error(`Failed to fetch sessions: ${errorMsg}`);
    }
  };

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const addNotification = useCallback((text: string, type: 'info' | 'success' | 'error') => {
    const now = Date.now();
    if (lastNotificationRef.current && 
        lastNotificationRef.current.text === text && 
        lastNotificationRef.current.type === type && 
        now - lastNotificationRef.current.time < 2000) {
      return;
    }

    lastNotificationRef.current = { text, type, time: now };
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [{ id, text, type }, ...prev].slice(0, 10));

    const timeouts = { success: 3000, info: 4000, error: 5000 };
    setTimeout(() => { removeNotification(id); }, timeouts[type]);
  }, [removeNotification]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginForm.user === 'hamidullo_17' && loginForm.pass === '12345678') {
      setIsLoggedIn(true);
      if (loginForm.remember) {
        localStorage.setItem('eduexam_auth', 'true');
      } else {
        sessionStorage.setItem('eduexam_auth', 'true');
      }
      setLoginError('');
    } else {
      setLoginError('Login yoki parol noto‘g‘ri.');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('eduexam_auth');
    sessionStorage.removeItem('eduexam_auth');
    navigate('/');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      let text = '';
      if (file.name.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value;
      } else {
        text = await file.text();
      }
      setRawText(text);
      const parsed = await parseTestContent(text);
      setPreviewQuestions(parsed);
      setLastSaveStatus(null);
    } catch (error: any) {
      addNotification(`Faylni tahlil qilib bo'lmadi: ${error.message || 'Xatolik'}`, "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAutoFix = async () => {
    setIsUploading(true);
    try {
      const fixed = await autoFixFormatting(rawText);
      const parsed = await parseTestContent(fixed);
      setPreviewQuestions(parsed);
    } catch (error: any) {
      addNotification("Tuzatishda xatolik yuz berdi.", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const generate6DigitCode = () => Math.floor(100000 + Math.random() * 900000).toString();
  const generateShortCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

  const handleSaveExam = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = (formData.get('title') as string || '').trim();
    const month = parseInt(formData.get('month') as string || '1');
    const mode = (formData.get('mode') as string || 'ADULT').toUpperCase();
    const duration = parseInt(formData.get('duration') as string || '60');

    if (!title) { addNotification("Imtihon nomi kiritilishi shart!", "error"); return; }
    if (!previewQuestions || previewQuestions.length === 0) { addNotification("Savollar aniqlanmagan.", "error"); return; }
    if (isNaN(duration) || duration <= 0) { addNotification("Vaqt 0 dan katta bo'lishi kerak.", "error"); return; }

    setSaveLoading(true);
    setLastSaveStatus(null);
    const shortCode = generateShortCode();
    
    try {
      const { error: upsertError } = await supabase.from('exams').insert({
        short_code: shortCode, title, month, mode, duration_minutes: duration, questions_json: previewQuestions
      });
      if (upsertError) throw new Error("Tizimga yozishda xatolik");

      const { data: verifiedData, error: fetchError } = await supabase.from('exams').select('*').eq('short_code', shortCode).single();
      if (fetchError || !verifiedData) throw new Error("Ma'lumotlarni tekshirishda xatolik.");

      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastSaveStatus({ time: now, success: true });
      addNotification("Imtihon saqlandi ✅", "success");
      await fetchExams();
      setTimeout(() => { setActiveTab('exams'); setPreviewQuestions(null); setRawText(''); }, 1000);
    } catch (error: any) {
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastSaveStatus({ time: now, success: false });
      addNotification(error.message || "Saqlashda xatolik.", "error");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleStartSession = async (examShortCode: string) => {
    const joinCode = generate6DigitCode();
    try {
      const { error } = await supabase.from('sessions').insert({ join_code: joinCode, exam_short_code: examShortCode, status: 'active' });
      if (error) throw error;
      setActiveJoinCode(joinCode);
      fetchSessions();
      addNotification("Imtihon sessiyasi boshlandi ✅", "success");
    } catch (err: any) {
      addNotification(`Xatolik: ${err.message || "Ulanish xatosi"}`, "error");
    }
  };

  const handleEndSession = async (sessionId: string) => {
    try {
      const { error } = await supabase.from('sessions').update({ status: 'ended' }).eq('id', sessionId);
      if (error) throw error;
      fetchSessions();
      addNotification("Sessiya yakunlandi", "info");
      if (activeJoinCode) {
        const currentSession = activeSessions.find(s => s.id === sessionId);
        if (currentSession?.join_code === activeJoinCode) setActiveJoinCode(null);
      }
    } catch (err: any) {
      addNotification(`Xatolik: ${err.message || "Ulanish xatosi"}`, "error");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopyToast(true);
    setTimeout(() => setCopyToast(false), 2000);
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 transition-colors duration-300">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 transition-colors duration-300">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white shadow-lg">
              <ShieldCheck size={32} />
            </div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">Teacher kirish</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2">O'qituvchi paneli uchun tizimga kiring</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4" noValidate>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 ml-1">Login</label>
              <input type="text" value={loginForm.user} onChange={e => setLoginForm({ ...loginForm, user: e.target.value })} className="edu-input w-full" placeholder="Login" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 ml-1">Parol</label>
              <input type="password" value={loginForm.pass} onChange={e => setLoginForm({ ...loginForm, pass: e.target.value })} className="edu-input w-full" placeholder="Parol" />
            </div>
            <div className="flex items-center gap-2 ml-1">
              <input type="checkbox" id="remember" checked={loginForm.remember} onChange={e => setLoginForm({...loginForm, remember: e.target.checked})} className="w-4 h-4 accent-orange-600" />
              <label htmlFor="remember" className="text-sm font-bold text-slate-600 dark:text-slate-400 cursor-pointer">Eslab qolish</label>
            </div>
            {loginError && <p className="text-red-500 text-sm font-bold text-center px-2">{loginError}</p>}
            <button className="w-full bg-orange-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-orange-700 transition shadow-xl mt-2">Kirish</button>
          </form>
        </div>
      </div>
    );
  }

  const liveAttempts = attempts.filter(a => a.status === 'in_progress');
  const finishedResults = attempts.filter(a => a.status !== 'in_progress');

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden transition-colors duration-300">
      {/* Sidebar */}
      <div className="w-72 bg-slate-900 text-white p-6 flex flex-col z-50">
        <div className="flex items-center gap-3 mb-10 px-2 cursor-pointer" onClick={() => navigate('/')}>
          <div className="bg-orange-600 p-2 rounded-xl">
            <LayoutDashboard className="text-white h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">EduExam</h1>
        </div>
        <nav className="space-y-2 flex-1">
          <NavItem active={activeTab === 'exams'} onClick={() => { setActiveTab('exams'); setViewingAttempt(null); }} icon={<FileText size={20}/>} label="Imtihonlar" />
          <NavItem active={activeTab === 'upload'} onClick={() => { setActiveTab('upload'); setViewingAttempt(null); }} icon={<UploadCloud size={20}/>} label="Smart Import" />
          <NavItem active={activeTab === 'live'} onClick={() => { setActiveTab('live'); setViewingAttempt(null); }} icon={<Users size={20}/>} label="Aktiv topshiruvchilar" />
          <NavItem active={activeTab === 'results'} onClick={() => { setActiveTab('results'); setViewingAttempt(null); }} icon={<BarChart3 size={20}/>} label="Natijalar" />
        </nav>
        <button onClick={handleLogout} className="mt-auto flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition text-red-400 font-bold">
          <LogOut size={20} /> Chiqish
        </button>
      </div>

      <div className="flex-1 overflow-auto p-10 relative pt-24">
        <header className="fixed top-0 right-0 left-72 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 px-10 h-16 flex justify-between items-center z-40 transition-colors duration-300">
          <h2 className="text-xl font-black text-slate-900 dark:text-white">
            {viewingAttempt ? 'Natija tafsilotlari' : (
              activeTab === 'exams' ? 'Mavjud imtihonlar' :
              activeTab === 'live' ? 'Aktiv topshirayotganlar' :
              activeTab === 'results' ? 'Natijalar' :
              activeTab === 'upload' ? 'Smart Import' : ''
            )}
          </h2>
          <div className="flex items-center gap-4">
             <button className="p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition text-slate-600 dark:text-slate-400">
               <Bell size={18}/>
             </button>
             <button onClick={() => { setActiveTab('upload'); setViewingAttempt(null); }} className="bg-orange-600 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg hover:bg-orange-700 transition flex items-center gap-2">
               <Plus size={16}/> Qo'shish
             </button>
          </div>
        </header>

        {activeJoinCode && (
           <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-8 p-8 bg-slate-900 dark:bg-slate-800 text-white rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                   <h4 className="text-orange-500 font-black text-sm uppercase tracking-widest mb-2">Aktiv sessiya kodi</h4>
                   <div className="flex items-center gap-4">
                      <span className="text-6xl font-black tracking-[0.2em]">{activeJoinCode}</span>
                      <button onClick={() => copyToClipboard(activeJoinCode!)} className="p-3 bg-white/10 rounded-2xl hover:bg-white/20 transition">
                        <Copy size={24}/>
                      </button>
                   </div>
                   <p className="text-slate-400 mt-4 font-bold">O'quvchilarga ushbu 6 xonali kodni bering.</p>
                </div>
                <button onClick={() => { const s = activeSessions.find(s => s.join_code === activeJoinCode); if(s) handleEndSession(s.id); }} className="bg-red-600 text-white px-8 py-4 rounded-2xl font-black text-lg hover:bg-red-700 transition flex items-center gap-2 shadow-xl">
                  <Power size={20}/> Sessiyani tugatish
                </button>
              </div>
           </motion.div>
        )}

        {activeTab === 'exams' && !viewingAttempt && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {exams.length === 0 ? (
              <div className="col-span-full py-24 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-slate-100 dark:border-slate-800 text-slate-400">
                <FileText size={64} className="mx-auto mb-6 opacity-10" />
                <p className="font-bold text-xl">Imtihonlar hali mavjud emas</p>
                <button onClick={() => setActiveTab('upload')} className="mt-4 text-orange-600 font-black hover:underline px-6 py-2 bg-orange-50 dark:bg-orange-900/10 rounded-xl">Hozir yaratish</button>
              </div>
            ) : exams.map(exam => {
              const activeSession = activeSessions.find(s => s.exam_short_code === exam.short_code);
              return (
                <div key={exam.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-xl hover:border-orange-200 dark:hover:border-orange-900 transition-all group flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <span className={`text-[10px] font-black px-3 py-1 rounded-full tracking-widest ${exam.mode === 'KIDS' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'}`}>
                      {exam.mode === 'KIDS' ? 'BOLALAR' : 'KATTALAR'}
                    </span>
                    <span className="text-xs font-black text-slate-400 dark:text-slate-500">{exam.month}-OY</span>
                  </div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-white mb-2 leading-tight group-hover:text-orange-600 transition-colors h-12 overflow-hidden">{exam.title}</h3>
                  <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mb-auto pb-6">
                    <span className="flex items-center gap-1.5 font-bold"><Clock size={14} className="text-orange-500" /> {exam.duration_minutes} m.</span>
                    <span className="flex items-center gap-1.5 font-bold"><FileText size={14} className="text-blue-500" /> {exam.questions_json?.length || 0}</span>
                  </div>
                  <div className="pt-5 border-t border-slate-50 dark:border-slate-800 flex flex-col gap-3">
                    {activeSession ? (
                      <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/10 p-3 rounded-2xl border border-green-100 dark:border-green-900/30">
                        <div className="flex flex-col">
                           <span className="text-[10px] font-black text-green-600 dark:text-green-400 uppercase">Aktiv PIN</span>
                           <span className="text-xl font-black text-green-700 dark:text-green-300 tracking-wider">{activeSession.join_code}</span>
                        </div>
                        <button onClick={() => handleEndSession(activeSession.id)} className="p-2 bg-white dark:bg-slate-800 text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 shadow-sm transition">
                          <Power size={18}/>
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => handleStartSession(exam.short_code)} className="w-full bg-slate-900 dark:bg-slate-800 text-white py-3 rounded-2xl font-black text-sm hover:bg-slate-800 dark:hover:bg-slate-700 transition flex items-center justify-center gap-2">
                        <Play size={16}/> Boshlash
                      </button>
                    )}
                    <div className="flex gap-2">
                       <button onClick={() => copyToClipboard(`${window.location.origin}${window.location.pathname}#/exam/${exam.short_code}`)} className="flex-1 flex items-center justify-center gap-2 text-orange-600 dark:text-orange-400 font-bold text-xs bg-orange-50 dark:bg-orange-900/10 px-3 py-2 rounded-xl hover:bg-orange-100 transition">
                        <Share2 size={14}/> Havola
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'live' && !viewingAttempt && (
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-8 py-5 text-sm font-black text-slate-600 dark:text-slate-400 uppercase">O'quvchi</th>
                  <th className="px-8 py-5 text-sm font-black text-slate-600 dark:text-slate-400 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {liveAttempts.length === 0 ? (
                  <tr><td colSpan={2} className="px-8 py-20 text-center text-slate-400 italic">Hozirda aktiv topshiruvchilar yo'q</td></tr>
                ) : liveAttempts.map(a => (
                  <tr key={a.id} className="animate-fade-up">
                    <td className="px-8 py-6 font-bold text-slate-800 dark:text-white">{a.first_name} {a.last_name}</td>
                    <td className="px-8 py-6">
                      <span className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-black text-sm uppercase">
                        <Play size={14} className="animate-pulse" /> Jarayonda
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'results' && !viewingAttempt && (
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-8 py-5 text-sm font-black text-slate-600 dark:text-slate-400 uppercase">O'quvchi</th>
                  <th className="px-8 py-5 text-sm font-black text-slate-600 dark:text-slate-400 uppercase">Ball / Foiz</th>
                  <th className="px-8 py-5 text-sm font-black text-slate-600 dark:text-slate-400 uppercase">Harakat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {finishedResults.length === 0 ? (
                  <tr><td colSpan={3} className="px-8 py-20 text-center text-slate-400 italic">Natijalar hali mavjud emas</td></tr>
                ) : finishedResults.map(a => (
                  <tr key={a.id}>
                    <td className="px-8 py-6 font-bold text-slate-800 dark:text-white">{a.first_name} {a.last_name}</td>
                    <td className="px-8 py-6">
                      <span className="font-black text-slate-900 dark:text-white">{a.score} ball</span>
                      <span className="ml-2 text-xs font-black text-green-600 dark:text-green-400">({Math.round((a.correct_count / (a.correct_count + a.wrong_count || 1)) * 100)}%)</span>
                    </td>
                    <td className="px-8 py-6">
                      <button onClick={() => setViewingAttempt(a)} className="flex items-center gap-2 bg-orange-50 dark:bg-orange-900/10 text-orange-600 dark:text-orange-400 px-4 py-2 rounded-xl font-bold text-xs hover:bg-orange-100 transition">
                        <Eye size={14}/> Batafsil
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {viewingAttempt && (
          <div className="max-w-4xl mx-auto pb-20 animate-fade-up">
            <button onClick={() => setViewingAttempt(null)} className="mb-6 flex items-center gap-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition font-black text-sm uppercase">
              <ArrowLeft size={18}/> Orqaga
            </button>
            <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-xl border border-slate-100 dark:border-slate-800 mb-8 transition-colors duration-300">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pb-8 border-b border-slate-50 dark:border-slate-800">
                  <div>
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-2">{viewingAttempt.first_name} {viewingAttempt.last_name}</h3>
                  </div>
                  <div className="bg-slate-900 dark:bg-slate-800 text-white p-6 rounded-[2rem] flex items-center gap-8 shadow-2xl">
                    <div className="text-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Ball</p>
                      <p className="text-4xl font-black text-orange-500">{viewingAttempt.score}</p>
                    </div>
                  </div>
                </div>
            </div>
          </div>
        )}

        {activeTab === 'upload' && !viewingAttempt && (
          <div className="max-w-4xl mx-auto pb-20">
            <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 mb-10 transition-colors duration-300">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Smart Import</h2>
              <div className="flex flex-col items-center justify-center border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[3rem] p-12 hover:border-orange-200 dark:hover:border-orange-900 transition-colors bg-slate-50/50 dark:bg-slate-800/30 group cursor-pointer relative" onClick={() => fileInputRef.current?.click()}>
                <input type="file" ref={fileInputRef} className="hidden" accept=".txt,.docx" onChange={handleFileUpload} />
                <div className="w-20 h-20 bg-orange-100 dark:bg-orange-900/30 rounded-3xl flex items-center justify-center text-orange-600 mb-4 group-hover:scale-110 transition-transform">
                  <FileUp size={40} />
                </div>
                <p className="text-xl font-black text-slate-800 dark:text-white mb-1">Faylni tanlang</p>
                {isUploading && (
                   <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-[3rem] flex flex-col items-center justify-center z-10">
                      <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                      <p className="text-orange-600 font-black text-lg">Tahlil qilinmoqda...</p>
                   </div>
                )}
              </div>
            </div>

            {previewQuestions && (
              <form onSubmit={handleSaveExam} className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] shadow-xl border-4 border-orange-100 dark:border-orange-900/50 space-y-8 animate-fade-up">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-2 ml-1">Imtihon nomi</label>
                    <input name="title" required className="edu-input w-full" placeholder="Masalan: IELTS Grammatika - Module 1" />
                  </div>
                  <div>
                    <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-2 ml-1">Modul (Oy)</label>
                    <select name="month" className="edu-input w-full">
                      {MONTHS.map(m => <option key={m} value={m}>{m}-oy</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-2 ml-1">Rejim</label>
                    <select name="mode" className="edu-input w-full">
                      <option value="ADULT">Kattalar uchun</option>
                      <option value="KIDS">Bolalar uchun</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-2 ml-1">Davomiyligi (daqiqa)</label>
                    <input name="duration" type="number" defaultValue="60" required className="edu-input w-full" />
                  </div>
                </div>
                <button type="submit" disabled={saveLoading} className="w-full bg-orange-600 text-white py-5 rounded-3xl font-black text-xl hover:bg-orange-700 shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50">
                  {saveLoading ? <Loader2 className="animate-spin"/> : <Save/>} Saqlash
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      <div className="fixed top-24 right-6 z-[100] space-y-3 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {notifications.map(n => (
            <motion.div key={n.id} layout initial={{ x: 300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 350, opacity: 0 }} className={`p-5 rounded-2xl shadow-2xl border-l-8 w-80 pointer-events-auto bg-white dark:bg-slate-900 flex items-center gap-3 ${n.type === 'success' ? 'border-green-500' : n.type === 'error' ? 'border-red-500' : 'border-blue-500'}`}>
              <p className="flex-1 text-sm font-bold text-slate-800 dark:text-white">{n.text}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

const NavItem = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 ${active ? 'bg-orange-600 text-white shadow-xl scale-[1.03]' : 'hover:bg-white/5 text-slate-400 font-bold'}`}>
    {icon} <span className="text-sm tracking-tight">{label}</span>
  </button>
);
