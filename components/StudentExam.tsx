
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Exam, Question } from '../types';
import { Clock, CheckCircle2, Star, ChevronRight, ChevronLeft, Flag, FileText, User, Download, AlertTriangle, Heart, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';

interface StudentExamProps {
  exam: Exam;
  shortCode: string;
}

export const StudentExam: React.FC<StudentExamProps> = ({ exam, shortCode }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'LOGIN' | 'READY' | 'TESTING' | 'FINISHED'>('LOGIN');
  const [studentInfo, setStudentInfo] = useState({ firstName: '', lastName: '' });
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(exam.duration * 60);
  const [isAutoSubmitting, setIsAutoSubmitting] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);

  const isKids = exam.mode.toUpperCase() === 'KIDS';
  const resumeCheckPerformed = useRef(false);

  useEffect(() => {
    if (resumeCheckPerformed.current) return;
    resumeCheckPerformed.current = true;

    const checkResume = async () => {
      const savedAttemptId = localStorage.getItem(`eduexam_attempt_${shortCode}`);
      if (savedAttemptId) {
        const { data, error } = await supabase.from('attempts').select('*').eq('id', savedAttemptId).single();
        if (data && data.status === 'in_progress') {
          const startedAt = new Date(data.started_at).getTime();
          const durationMs = exam.duration * 60 * 1000;
          const elapsed = Date.now() - startedAt;
          const remaining = Math.max(0, Math.floor((durationMs - elapsed) / 1000));

          if (remaining > 0) {
            setStudentInfo({ firstName: data.first_name, lastName: data.last_name });
            setAttemptId(data.id);
            setStartTime(startedAt);
            setTimeLeft(remaining);
            setAnswers(data.answers_json || {});
            setStep('TESTING');
          } else {
            await supabase.from('attempts').update({ status: 'timeout' }).eq('id', savedAttemptId);
            localStorage.removeItem(`eduexam_attempt_${shortCode}`);
          }
        }
      }
    };
    checkResume();
  }, [shortCode, exam.duration]);

  const calculateResults = () => {
    let score = 0;
    let correct = 0;
    let wrong = 0;
    exam.questions.forEach(q => {
      const studentAnswer = (answers[q.id] || '').trim().toLowerCase();
      const correctAnswer = q.correctAnswer.trim().toLowerCase();
      if (studentAnswer === correctAnswer) {
        score += q.points;
        correct++;
      } else {
        wrong++;
      }
    });
    return { score, correct, wrong };
  };

  const syncAttempt = async (status: 'finished' | 'timeout') => {
    if (!attemptId) return;
    const { score, correct, wrong } = calculateResults();
    await supabase.from('attempts').update({
      submitted_at: new Date().toISOString(), score, correct_count: correct, wrong_count: wrong, answers_json: answers, status
    }).eq('id', attemptId);
    localStorage.removeItem(`eduexam_attempt_${shortCode}`);
  };

  const finishExam = useCallback(async (status: 'finished' | 'timeout' = 'finished') => {
    setStep('FINISHED');
    await syncAttempt(status);
  }, [answers, attemptId, shortCode]);

  useEffect(() => {
    if (step === 'TESTING' && attemptId) {
      const interval = setInterval(() => {
        supabase.from('attempts').update({ answers_json: answers }).eq('id', attemptId);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [step, attemptId, answers]);

  useEffect(() => {
    let timer: any;
    if (step === 'TESTING' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setIsAutoSubmitting(true);
            setTimeout(() => finishExam('timeout'), 2000);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, timeLeft, finishExam]);

  const handleStart = async () => {
    if (!studentInfo.firstName.trim() || !studentInfo.lastName.trim()) { alert("Ism va Familyani kiriting!"); return; }
    const { data, error } = await supabase.from('attempts').insert({
      exam_short_code: shortCode, first_name: studentInfo.firstName, last_name: studentInfo.lastName, status: 'in_progress', started_at: new Date().toISOString(), answers_json: {}
    }).select().single();
    if (error) { alert("Xatolik yuz berdi."); return; }
    setAttemptId(data.id);
    localStorage.setItem(`eduexam_attempt_${shortCode}`, data.id);
    setStartTime(new Date(data.started_at).getTime());
    setStep('READY');
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const currentQuestion = exam.questions[currentQuestionIndex];

  if (step === 'LOGIN') {
    return (
      <div className={`min-h-[calc(100vh-64px)] flex items-center justify-center p-6 transition-colors duration-300 ${isKids ? 'bg-orange-50 kids-font dark:bg-slate-950' : 'bg-slate-50 dark:bg-slate-950'}`}>
        <div className={`max-w-md w-full bg-white dark:bg-slate-900 p-10 shadow-2xl transition-colors duration-300 ${isKids ? 'rounded-[3rem] border-orange-200 dark:border-orange-900 border-8' : 'rounded-[2.5rem] border-slate-100 dark:border-slate-800 border'}`}>
          <div className="text-center mb-10">
            <h1 className={`text-4xl font-black mb-3 ${isKids ? 'text-orange-600 kids-title' : 'text-slate-900 dark:text-white'}`}>EduExam</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Imtihon: <span className="text-slate-900 dark:text-white font-bold">{exam.title}</span></p>
          </div>
          <div className="space-y-6">
            <input type="text" placeholder="Ism" value={studentInfo.firstName} onChange={e => setStudentInfo({...studentInfo, firstName: e.target.value})} className="w-full p-4 edu-input dark:bg-slate-800 dark:border-slate-700 dark:text-white rounded-2xl" />
            <input type="text" placeholder="Familya" value={studentInfo.lastName} onChange={e => setStudentInfo({...studentInfo, lastName: e.target.value})} className="w-full p-4 edu-input dark:bg-slate-800 dark:border-slate-700 dark:text-white rounded-2xl" />
            <button onClick={handleStart} className={`w-full py-5 text-white font-black text-xl rounded-2xl shadow-xl ${isKids ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-100 transition-all' : 'bg-orange-600 shadow-orange-200'}`}>Boshlash</button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'READY') {
    return (
      <div className={`min-h-[calc(100vh-64px)] flex items-center justify-center p-6 transition-colors duration-300 ${isKids ? 'bg-yellow-50 kids-font dark:bg-slate-950' : 'bg-slate-50 dark:bg-slate-950'}`}>
        <div className="text-center max-w-lg">
          <h2 className={`text-5xl font-black mb-8 ${isKids ? 'text-orange-600 kids-title' : 'text-slate-900 dark:text-white'}`}>{studentInfo.firstName}, tayyormisiz?</h2>
          <div className="grid grid-cols-2 gap-6 mb-12">
            <div className={`bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-xl border ${isKids ? 'border-orange-200 dark:border-orange-900' : 'border-orange-100 dark:border-slate-800'}`}>
              <Clock className="mx-auto mb-3 text-orange-500" size={48} />
              <p className="font-black text-2xl text-slate-800 dark:text-white">{exam.duration}m</p>
            </div>
            <div className={`bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-xl border ${isKids ? 'border-blue-200 dark:border-blue-900' : 'border-orange-100 dark:border-slate-800'}`}>
              <FileText className="mx-auto mb-3 text-blue-500" size={48} />
              <p className="font-black text-2xl text-slate-800 dark:text-white">{exam.questions.length}</p>
            </div>
          </div>
          <button onClick={() => setStep('TESTING')} className={`px-16 py-6 text-white font-black text-3xl rounded-[2.5rem] shadow-2xl active:scale-95 transition-transform ${isKids ? 'bg-green-500 hover:bg-green-600' : 'bg-orange-600'}`}>Tayyorman!</button>
        </div>
      </div>
    );
  }

  if (step === 'TESTING') {
    return (
      <div className={`min-h-[calc(100vh-64px)] flex flex-col transition-colors duration-300 ${isKids ? 'bg-blue-50 kids-font dark:bg-slate-950' : 'bg-white dark:bg-slate-950'}`}>
        <div className="sticky top-0 z-40 bg-white dark:bg-slate-900 shadow-sm border-b dark:border-slate-800 transition-colors duration-300">
          <div className="px-8 py-4 flex justify-between items-center max-w-7xl mx-auto">
            <div className="flex flex-col">
              <h1 className={`font-black text-xl truncate dark:text-white ${isKids ? 'text-blue-600' : 'text-slate-900'}`}>{exam.title}</h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{studentInfo.firstName} {studentInfo.lastName}</p>
            </div>
            <div className={`px-6 py-3 rounded-2xl font-black text-2xl flex items-center gap-3 transition-colors ${timeLeft <= 30 ? 'bg-red-600 text-white animate-pulse' : timeLeft <= 120 ? 'bg-red-50 text-red-600 border-2 border-red-200' : isKids ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-900' : 'bg-orange-50 text-orange-700 border-2 border-orange-100 dark:bg-orange-900/20 dark:border-orange-900'}`}>
              <Clock size={24} />
              <span className="font-mono">{formatTime(timeLeft)}</span>
            </div>
          </div>
        </div>

        <main className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-12 flex flex-col justify-center transition-colors duration-300">
          <motion.div key={currentQuestionIndex} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className={`p-8 md:p-12 bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border transition-colors duration-300 ${isKids ? 'border-blue-200 dark:border-blue-900' : 'border-slate-100 dark:border-slate-800'}`}>
            <span className={`text-sm font-black uppercase tracking-widest ${isKids ? 'text-blue-500' : 'text-orange-600'}`}>Savol {currentQuestionIndex + 1} / {exam.questions.length}</span>
            <h2 className={`mt-4 text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-8 ${isKids ? 'kids-title' : ''}`}>{currentQuestion.text}</h2>
            {currentQuestion.type === 'CHOICE' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentQuestion.options?.map(opt => (
                  <button key={opt.key} onClick={() => setAnswers({...answers, [currentQuestion.id]: opt.key})} className={`flex items-center p-5 md:p-6 border-4 rounded-[2rem] text-left transition-all ${answers[currentQuestion.id] === opt.key ? (isKids ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/10' : 'border-orange-500 bg-orange-50 dark:bg-orange-900/10') : 'border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30'}`}>
                    <div className={`w-10 h-10 flex items-center justify-center font-black rounded-2xl mr-4 shrink-0 ${answers[currentQuestion.id] === opt.key ? 'bg-orange-600 text-white' : 'bg-white dark:bg-slate-700 text-slate-400 border dark:border-slate-600'}`}>{opt.key}</div>
                    <span className={`text-lg font-bold dark:text-slate-300 ${isKids ? 'text-blue-700' : 'text-slate-700'}`}>{opt.text}</span>
                  </button>
                ))}
              </div>
            ) : (
              <input type="text" value={answers[currentQuestion.id] || ''} onChange={e => setAnswers({...answers, [currentQuestion.id]: e.target.value})} className="w-full p-6 text-2xl font-bold edu-input dark:bg-slate-800 dark:border-slate-700 dark:text-white rounded-[1.5rem]" placeholder="Javob..." />
            )}
          </motion.div>
        </main>

        <footer className="p-6 md:p-8 border-t dark:border-slate-800 bg-white dark:bg-slate-900 sticky bottom-0 flex justify-between items-center shadow-lg transition-colors duration-300">
          <button disabled={currentQuestionIndex === 0} onClick={() => setCurrentQuestionIndex(prev => prev - 1)} className="font-black text-slate-400 disabled:opacity-0 flex items-center gap-2 hover:text-slate-600 dark:hover:text-white transition-colors"><ChevronLeft size={20}/> Oldingi</button>
          <div className="flex items-center gap-4">
            {currentQuestionIndex === exam.questions.length - 1 ? (
              <button onClick={() => finishExam()} className="px-8 py-4 text-white font-black text-lg rounded-2xl shadow-xl bg-orange-600 hover:scale-105 transition-transform">Tugatish</button>
            ) : (
              <button onClick={() => setCurrentQuestionIndex(prev => prev + 1)} className="px-8 py-4 text-white font-black text-lg rounded-2xl shadow-xl bg-orange-600 hover:scale-105 transition-transform">Keyingi</button>
            )}
          </div>
        </footer>
      </div>
    );
  }

  const result = calculateResults();
  return (
    <div className={`min-h-[calc(100vh-64px)] flex items-center justify-center transition-colors duration-300 ${isKids ? 'bg-yellow-50 kids-font dark:bg-slate-950' : 'bg-slate-50 dark:bg-slate-950'}`}>
      <div className={`text-center p-10 md:p-16 bg-white dark:bg-slate-900 shadow-2xl max-w-xl w-full mx-6 transition-colors duration-300 ${isKids ? 'rounded-[4rem] border-8 border-yellow-200 dark:border-yellow-900' : 'rounded-[4rem] border-4 border-orange-100 dark:border-slate-800'}`}>
        <h2 className={`text-4xl font-black mb-6 ${isKids ? 'text-orange-600 kids-title' : 'text-slate-900 dark:text-white'}`}>{isAutoSubmitting ? "Vaqt tugadi!" : "Yashasin!"}</h2>
        <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-[2rem] mb-10 border border-slate-100 dark:border-slate-700 flex justify-around">
           <div><p className="text-xs font-black text-slate-400 uppercase mb-1">Ball</p><p className={`text-4xl font-black text-orange-600`}>{result.score}</p></div>
        </div>
        <button onClick={() => navigate('/')} className="w-full py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-3 bg-slate-900 text-white shadow-xl">Bosh sahifa</button>
      </div>
    </div>
  );
};
