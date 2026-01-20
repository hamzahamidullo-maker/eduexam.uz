
import React, { useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { AdminPanel } from './components/AdminPanel';
import { StudentExam } from './components/StudentExam';
import { Bilagon } from './components/Bilagon';
import { MOCK_EXAMS } from './constants';
import { 
  GraduationCap, ChevronRight, CheckCircle, 
  Menu, X, ArrowLeft, HelpCircle, Trophy, Baby, Home, BarChart3, Clock,
  AlertTriangle, ShieldCheck, KeyRound, ArrowRight, Sparkles, Star, Heart,
  Sun, Moon, Send, Instagram
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Exam } from './types';
import { supabase } from './services/supabase';

// Shared Avatar for Bilag'on
const BilagonAvatar = ({ size = "w-full h-full" }: { size?: string }) => (
  <svg viewBox="0 0 100 100" className={size}>
    <circle cx="50" cy="55" r="30" fill="#ffdbac" />
    <path d="M25 45 Q50 20 75 45 L75 52 Q50 48 25 52 Z" fill="#1a1a1a" />
    <path d="M25 48 L75 48" stroke="white" strokeWidth="0.5" strokeDasharray="2" />
    <circle cx="40" cy="58" r="3" fill="#333" />
    <circle cx="60" cy="58" r="3" fill="#333" />
    <path d="M42 68 Q50 75 58 68" fill="none" stroke="#e67e22" strokeWidth="2" strokeLinecap="round" />
    <path d="M20 95 Q50 80 80 95 L80 100 L20 100 Z" fill="#ff6b00" />
  </svg>
);

const Navigation = ({ theme, toggleTheme }: { theme: string, toggleTheme: () => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { label: 'Bosh sahifa', path: '/', icon: <Home size={20}/> },
    { label: "Bilag'on (AI Yordamchi)", path: '/bilagon', icon: <Sparkles size={20} className="text-orange-500" /> },
    { label: 'Imtihonga kirish', path: '/join', icon: <KeyRound size={20}/> },
    { label: 'Teacher (Admin)', path: '/admin', icon: <ShieldCheck size={20}/> },
    { label: 'Yordam va Aloqa', path: '/help', icon: <HelpCircle size={20}/> },
  ];

  const showBackButton = location.pathname !== '/';

  const handleBack = () => {
    const isExamRoute = location.pathname.startsWith('/exam/');
    if (isExamRoute || location.pathname === '/join' || location.pathname === '/bilagon' || location.pathname === '/admin' || location.pathname === '/help') {
      navigate('/');
    } else {
      if (window.history.length > 2) {
        navigate(-1);
      } else {
        navigate('/');
      }
    }
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800 z-[60] px-4 md:px-8 flex items-center justify-between shadow-sm transition-all duration-300">
        <div className="flex items-center gap-4">
          <button onClick={() => setIsOpen(true)} className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition text-slate-900 dark:text-white active:scale-90"><Menu size={24} strokeWidth={2.5} /></button>
          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => navigate('/')}>
            <div className="bg-orange-600 p-1.5 rounded-lg group-hover:rotate-12 transition-transform shadow-md shadow-orange-100 dark:shadow-none"><GraduationCap className="text-white h-5 w-5" strokeWidth={2.5} /></div>
            <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight">EduExam</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleTheme} 
            className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition text-slate-600 dark:text-slate-400 active:scale-90 border border-transparent dark:border-slate-700"
            title={theme === 'light' ? 'Tungi rejim' : 'Kunduzgi rejim'}
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          
          {showBackButton && (
            <button onClick={handleBack} className="flex items-center gap-2 bg-slate-900 dark:bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-800 dark:hover:bg-slate-700 transition active:scale-95 group border border-transparent dark:border-slate-700">
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Orqaga
            </button>
          )}
        </div>
      </nav>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsOpen(false)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70]" />
            <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 25 }} className="fixed top-0 left-0 bottom-0 w-72 bg-white dark:bg-slate-900 z-[80] shadow-2xl p-6 flex flex-col transition-colors duration-300">
              <div className="flex justify-between items-center mb-8">
                <span className="text-xl font-black text-orange-600">EduExam</span>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition text-slate-900 dark:text-white"><X size={20} /></button>
              </div>
              <div className="space-y-2">
                {menuItems.map((item, idx) => (
                  <button key={idx} onClick={() => { navigate(item.path); setIsOpen(false); }} className={`w-full flex items-center gap-3.5 p-3.5 rounded-xl text-sm font-bold transition-all text-left ${location.pathname === item.path ? 'bg-orange-600 text-white shadow-lg shadow-orange-100 dark:shadow-none' : 'hover:bg-orange-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-500'}`}>
                    {item.icon} <span className="ml-1">{item.label}</span>
                  </button>
                ))}
              </div>
              <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">EduExam v2.0</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

const HelpPage = () => (
  <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 flex items-center justify-center transition-colors duration-300">
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-md w-full bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 text-center"
    >
      <div className="w-20 h-20 bg-orange-100 dark:bg-orange-900/30 rounded-3xl flex items-center justify-center mx-auto mb-8 text-orange-600 shadow-xl shadow-orange-100 dark:shadow-none">
        <HelpCircle size={40} />
      </div>
      
      <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4">Yordam va Aloqa</h2>
      <p className="text-slate-500 dark:text-slate-400 font-bold mb-10">Agar savolingiz yoki muammo bo'lsa, biz bilan bog'laning:</p>
      
      <div className="space-y-4">
        <a 
          href="https://t.me/MrXh_17" 
          target="_blank" 
          rel="noopener noreferrer"
          className="w-full py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-3 bg-[#0088cc] text-white shadow-xl shadow-blue-100 dark:shadow-none hover:scale-[1.02] transition-transform active:scale-95"
        >
          <Send size={24} /> Telegram
        </a>
        
        <a 
          href="https://instagram.com/hamidullo_17" 
          target="_blank" 
          rel="noopener noreferrer"
          className="w-full py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-3 bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white shadow-xl shadow-pink-100 dark:shadow-none hover:scale-[1.02] transition-transform active:scale-95"
        >
          <Instagram size={24} /> Instagram
        </a>
      </div>
      
      <div className="mt-12 flex items-center justify-center gap-2 text-slate-400 dark:text-slate-600">
        <Sparkles size={16} />
        <span className="text-xs font-black uppercase tracking-widest">Smart Support System</span>
      </div>
    </motion.div>
  </div>
);

const LandingPage = () => (
  <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
    <main className="max-w-6xl mx-auto px-6 pt-24 text-center pb-20">
      <div className="inline-block bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-500 px-5 py-1.5 rounded-full text-xs font-black uppercase tracking-[0.2em] mb-6 animate-fade-up">Smart Exams for Smart Learning</div>
      <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white mb-6 leading-tight tracking-tight animate-fade-up">
        Bilimingizni <br/><span className="text-orange-600">EduExam</span> bilan sinang
      </h1>
      <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto mb-10 font-medium leading-relaxed animate-fade-up">
        Zamonaviy va aqlli imtihon platformasi. PIN kod orqali tezkor kirish va Bilag'on AI yordamchi.
      </p>
      
      {/* Main Entry Cards */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 text-left max-w-5xl mx-auto">
         {/* Bilag'on Card */}
         <motion.div 
           initial={{ opacity: 0, y: 30 }}
           whileInView={{ opacity: 1, y: 0 }}
           viewport={{ once: true }}
           className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-xl flex flex-col md:flex-row items-center gap-8 relative overflow-hidden group transition-all duration-300 hover:shadow-2xl hover:border-orange-200 dark:hover:border-orange-900"
         >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500 pointer-events-none text-orange-600 dark:text-white">
               <Sparkles size={160} />
            </div>
            <div className="w-32 h-32 bg-orange-50 dark:bg-slate-800 rounded-full flex items-center justify-center shrink-0 border-4 border-white dark:border-slate-700 overflow-hidden shadow-inner">
               <BilagonAvatar />
            </div>
            <div className="relative z-10 flex-1 text-center md:text-left">
               <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-2 kids-title">Bilag'on</h3>
               <p className="text-slate-600 dark:text-slate-400 font-bold mb-6 leading-snug">Savolingiz bormi? Bilag'ondan so'rang. U darslaringizda yordam beradi!</p>
               <Link to="/bilagon" className="inline-flex items-center gap-2 bg-orange-600 text-white px-8 py-3.5 rounded-2xl font-black hover:bg-orange-700 transition-all active:scale-95 shadow-lg shadow-orange-100 dark:shadow-none">
                  Ochish <ArrowRight size={20}/>
               </Link>
            </div>
         </motion.div>
         
         {/* Join Card */}
         <motion.div 
           initial={{ opacity: 0, y: 30 }}
           whileInView={{ opacity: 1, y: 0 }}
           viewport={{ once: true }}
           className="bg-slate-900 dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-800 dark:border-slate-700 shadow-xl flex flex-col md:flex-row items-center gap-8 relative overflow-hidden group transition-all duration-300 hover:shadow-2xl"
         >
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500 text-white pointer-events-none">
               <KeyRound size={160} />
            </div>
            <div className="w-32 h-32 bg-slate-800 dark:bg-slate-700 rounded-full flex items-center justify-center shrink-0 border-4 border-slate-700 dark:border-slate-600 shadow-inner">
               <KeyRound size={48} className="text-orange-500" />
            </div>
            <div className="relative z-10 flex-1 text-center md:text-left">
               <h3 className="text-3xl font-black text-white mb-2">Imtihonlar</h3>
               <p className="text-slate-400 font-bold mb-6 leading-snug">PIN kod orqali imtihoningizni boshlang va bilimingizni hoziroq sinab ko'ring.</p>
               <Link to="/join" className="inline-flex items-center gap-2 bg-white text-slate-900 px-8 py-3.5 rounded-2xl font-black hover:bg-slate-100 transition-all active:scale-95 shadow-lg">
                  Kirish <ArrowRight size={20}/>
               </Link>
            </div>
         </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 text-left max-w-5xl mx-auto">
        <FeatureCard icon={<BarChart3 size={24}/>} title="Real-time" text="Natijalarni o'quvchi tugatishi bilan darhol ko'ring." />
        <FeatureCard icon={<Baby size={24}/>} title="Kids Mode" text="Bolalar uchun maxsus rangli va oson interfeys." />
        <FeatureCard icon={<Clock size={24}/>} title="Jonli kuzatuv" text="Jarayonni real vaqtda kuzatib boring." />
      </div>
    </main>
  </div>
);

const FeatureCard = ({ icon, title, text }: any) => (
  <div className="p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 hover:shadow-xl transition-all duration-300 group">
    <div className="w-12 h-12 bg-orange-50 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center mb-6 text-orange-600 group-hover:scale-110 transition-transform">{icon}</div>
    <h3 className="text-xl font-black mb-2 text-slate-900 dark:text-white">{title}</h3>
    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{text}</p>
  </div>
);

const JoinPage = () => {
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; 
    
    const newPin = [...pin];
    newPin[index] = value.slice(-1); 
    setPin(newPin);
    setError(null);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newPin = [...pin];
      newPin[index - 1] = '';
      setPin(newPin);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6).split('');
    const newPin = [...pin];
    pastedData.forEach((char, idx) => {
      if (/^\d$/.test(char)) {
        newPin[idx] = char;
      }
    });
    setPin(newPin);
    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleJoin = async () => {
    const code = pin.join('');
    if (code.length < 6) return;

    setLoading(true);
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .select('exam_short_code')
      .eq('join_code', code)
      .eq('status', 'active')
      .single();

    if (sessionError || !sessionData) {
      setError("Kod noto‘g‘ri yoki sessiya faol emas.");
      setPin(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      setLoading(false);
    } else {
      navigate(`/exam/${sessionData.exam_short_code}`);
    }
  };

  const isComplete = pin.every(digit => digit !== '');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 transition-colors duration-300">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-md w-full bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 text-center transition-colors duration-300"
      >
        <div className="w-20 h-20 bg-orange-600 rounded-3xl flex items-center justify-center mx-auto mb-8 text-white shadow-xl shadow-orange-200 dark:shadow-none">
          <KeyRound size={40} />
        </div>
        
        <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Imtihon kodi</h2>
        <p className="text-slate-500 dark:text-slate-400 font-bold mb-8">6 xonali PIN kodni kiriting</p>

        <div className="flex justify-between gap-2 mb-8" onPaste={handlePaste}>
          {pin.map((digit, idx) => (
            <input
              key={idx}
              ref={el => { inputRefs.current[idx] = el; }}
              type="text"
              inputMode="numeric"
              value={digit}
              onChange={e => handleChange(idx, e.target.value)}
              onKeyDown={e => handleKeyDown(idx, e)}
              className={`w-12 h-16 text-center text-3xl font-black rounded-2xl border-2 transition-all duration-200 ${
                error ? 'border-red-500 bg-red-50 text-red-600 dark:bg-red-900/20 dark:border-red-900' : 'border-slate-100 bg-slate-100 dark:bg-slate-800 dark:border-slate-700 focus:border-orange-500 focus:bg-white dark:focus:bg-slate-700 text-slate-800 dark:text-white'
              }`}
              placeholder="•"
            />
          ))}
        </div>

        {error && (
          <motion.div 
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl font-bold text-sm"
          >
            {error}
          </motion.div>
        )}

        <button 
          onClick={handleJoin}
          disabled={!isComplete || loading}
          className={`w-full py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl ${
            isComplete && !loading ? 'bg-orange-600 text-white shadow-orange-200 dark:shadow-none hover:bg-orange-700' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 shadow-none cursor-not-allowed'
          }`}
        >
          {loading ? (
            <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>Kirish <ArrowRight size={24} /></>
          )}
        </button>
      </motion.div>
    </div>
  );
};

const ExamPage = () => {
  const { examCode } = useParams();
  const [exam, setExam] = useState<Exam | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (examCode) fetchExam();
  }, [examCode]);

  const fetchExam = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('exams').select('*').eq('short_code', examCode.toUpperCase()).single();
    if (error) {
      setError("Imtihon topilmadi yoki havola noto'g'ri.");
    } else {
      setExam({
        id: data.id,
        title: data.title,
        month: data.month,
        mode: data.mode as any,
        duration: data.duration_minutes,
        questions: data.questions_json,
        published: true,
        centerId: 'supabase',
        createdAt: new Date(data.created_at).getTime()
      });
    }
    setLoading(false);
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
       <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mb-4"></div>
       <div className="text-2xl font-black text-orange-600 text-center">Imtihon yuklanmoqda...</div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 transition-colors duration-300">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] shadow-2xl text-center border-4 border-red-50 dark:border-red-900/20 transition-colors duration-300">
        <AlertTriangle className="mx-auto text-red-500 mb-6" size={64}/>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-4">{error}</h2>
        <Link to="/" className="inline-block bg-orange-600 text-white px-8 py-3 rounded-2xl font-black hover:bg-orange-700 transition">Bosh sahifaga qaytish</Link>
      </div>
    </div>
  );

  return <StudentExam exam={exam!} shortCode={examCode!.toUpperCase()} />;
};

const App: React.FC = () => {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('eduexam_theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    // Sync React state to HTML class for Tailwind 'class' darkMode strategy
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('eduexam_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <HashRouter>
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
        <Navigation theme={theme} toggleTheme={toggleTheme} />
        <div className="pt-16 flex-1 flex flex-col">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/join" element={<JoinPage />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/bilagon" element={<Bilagon />} />
            <Route path="/help" element={<HelpPage />} />
            <Route path="/exam/:examCode" element={<ExamPage />} />
          </Routes>
        </div>
      </div>
    </HashRouter>
  );
};

export default App;
