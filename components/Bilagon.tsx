
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Send, Trash2, Sparkles, Loader2, StopCircle, Headphones, MessageSquare, ArrowLeftRight, AlertCircle, Volume2 } from 'lucide-react';
import { GoogleGenAI, Modality } from "@google/genai";

interface Message {
  id: string;
  text: string;
  sender: 'student' | 'bilagon';
  timestamp: number;
}

// Shared Avatar for Bilag'on
const BilagonAvatar = ({ size = "w-full h-full", animate = false }: { size?: string, animate?: boolean }) => (
  <motion.div 
    animate={animate ? { scale: [1, 1.05, 1], rotate: [0, 1, -1, 0] } : {}}
    transition={{ repeat: Infinity, duration: 2 }}
    className={size}
  >
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <circle cx="50" cy="55" r="30" fill="#ffdbac" />
      <path d="M25 45 Q50 20 75 45 L75 52 Q50 48 25 52 Z" fill="#1a1a1a" />
      <path d="M25 48 L75 48" stroke="white" strokeWidth="0.5" strokeDasharray="2" />
      <circle cx="40" cy="58" r="3" fill="#333" />
      <circle cx="60" cy="58" r="3" fill="#333" />
      <path d="M42 68 Q50 75 58 68" fill="none" stroke="#e67e22" strokeWidth="2" strokeLinecap="round" />
      <path d="M20 95 Q50 80 80 95 L80 100 L20 100 Z" fill="#ff6b00" />
    </svg>
  </motion.div>
);

// Audio decoding helpers
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const Bilagon: React.FC = () => {
  const [mode, setMode] = useState<'TEXT' | 'VOICE'>('TEXT');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      text: "Savolingiz bormi? Bilag'on yordamga tayyor! 😊",
      sender: 'bilagon',
      timestamp: Date.now()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [statusText, setStatusText] = useState('');
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const fillerTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      stopCurrentAudio();
      if (fillerTimeoutRef.current) window.clearTimeout(fillerTimeoutRef.current);
    };
  }, []);

  const stopCurrentAudio = () => {
    if (activeAudioSourceRef.current) {
      try {
        activeAudioSourceRef.current.stop();
      } catch (e) {}
      activeAudioSourceRef.current = null;
    }
    setIsSpeaking(false);
  };

  const playRawAudio = async (base64Audio: string) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      
      setIsSpeaking(true);
      const audioBuffer = await decodeAudioData(
        decode(base64Audio),
        audioContextRef.current,
        24000,
        1,
      );
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => setIsSpeaking(false);
      activeAudioSourceRef.current = source;
      source.start();
    } catch (error) {
      console.error("Audio Play Error:", error);
      setIsSpeaking(false);
    }
  };

  const getAudioFromText = async (text: string) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Puck' },
            },
          },
        },
      });
      return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    } catch (e) {
      return null;
    }
  }

  const handleSend = async (text: string) => {
    const trimmedText = text.trim();
    if (!trimmedText || isLoading) return;

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    stopCurrentAudio();
    setIsLoading(true);
    setStatusText(mode === 'VOICE' ? "Oylayapman..." : "");

    if (mode === 'TEXT') {
      setMessages(prev => [...prev, {
        id: Math.random().toString(),
        text: trimmedText,
        sender: 'student',
        timestamp: Date.now()
      }]);
    }
    
    setInputText('');

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: trimmedText }] }],
        config: {
          thinkingConfig: { thinkingBudget: 0 },
          systemInstruction: `Siz Bilag'onsiz - o'ta aqlli va tezkor yordamchisiz. 
          
          ASOSIY QOIDALAR:
          1. FAQAT o'zbek tilida javob bering.
          2. Javoblar o'ta qisqa va aniq bo'lsin (maksimal 1-2 gap).
          3. Hech qachon salomlashmang (Salom, Assalomu alaykum taqiqlangan).
          4. Kirish so'zlari yoki xushomad ishlatmang. Darhol javobga o'ting.
          5. Faktik jihatdan 100% aniq bo'ling. 
          6. Agar aniq bilmasangiz yoki ishonchingiz komil bo'lmasa, faqat: "Aniq bilmayapman" deb ayting va qisqa aniqlashtiruvchi savol bering (Masalan: "Qaysi sinf uchun?").
          7. Barcha mavzularni (maktab fanlari, tarix, matematika, texnika, kundalik hayot) mukammal bilasiz.
          8. Hech qachon yolg'on ma'lumot to'qimang.`,
        },
      });

      const aiText = (response.text || "Kechirasiz, xatolik yuz berdi.").trim();

      if (mode === 'VOICE') {
        setStatusText("Gapiryapman...");
        const audioData = await getAudioFromText(aiText);
        if (audioData) {
          await playRawAudio(audioData);
        } else {
          // Fallback if TTS fails
          setMessages(prev => [...prev, {
            id: Math.random().toString(),
            text: aiText,
            sender: 'bilagon',
            timestamp: Date.now()
          }]);
        }
      } else {
        setMessages(prev => [...prev, {
          id: Math.random().toString(),
          text: aiText,
          sender: 'bilagon',
          timestamp: Date.now()
        }]);
      }
    } catch (error) {
      console.error("Bilagon Error:", error);
      if (mode === 'TEXT') {
        setMessages(prev => [...prev, { id: 'err', text: "Aniq bilmayapman. Qaysi fan bo'yicha so'rayapsiz?", sender: 'bilagon', timestamp: Date.now() }]);
      }
    } finally {
      setIsLoading(false);
      setStatusText('');
    }
  };

  const toggleListen = () => {
    if (isListening) {
      (window as any).recognition?.stop();
      setIsListening(false);
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { alert("Ovozli qidiruv qo'llab-quvvatlanmaydi."); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = 'uz-UZ';
    recognition.onstart = () => { setIsListening(true); setStatusText("Tinglayapman..."); };
    recognition.onresult = (event: any) => handleSend(event.results[0][0].transcript);
    recognition.onerror = () => { setIsListening(false); setStatusText(''); };
    recognition.onend = () => setIsListening(false);
    (window as any).recognition = recognition;
    recognition.start();
  };

  return (
    <div className={`min-h-screen pt-20 pb-10 px-4 md:px-8 flex flex-col kids-font transition-colors duration-300 ${mode === 'VOICE' ? 'bg-slate-950' : 'bg-orange-50 dark:bg-slate-950'}`}>
      <div className={`max-w-4xl w-full mx-auto flex-1 flex flex-col rounded-[3.5rem] shadow-2xl overflow-hidden relative border-8 transition-all duration-300 ${
        mode === 'VOICE' ? 'bg-slate-900 border-slate-800' : 'bg-white dark:bg-slate-900 border-orange-200 dark:border-slate-800'
      }`}>
        <header className={`p-6 flex justify-between items-center ${mode === 'VOICE' ? 'text-slate-400' : 'bg-orange-600 dark:bg-slate-800 text-white'}`}>
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-full p-1 shadow-lg ${mode === 'VOICE' ? 'bg-slate-800' : 'bg-white dark:bg-slate-700'}`}>
              <BilagonAvatar animate={isSpeaking} />
            </div>
            <div>
              <h2 className={`text-2xl font-black kids-title ${mode === 'VOICE' ? 'text-white' : ''}`}>Bilag'on</h2>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full animate-pulse ${mode === 'VOICE' ? 'bg-orange-500' : 'bg-green-400'}`}></span>
                <span className="text-xs font-bold opacity-80 uppercase tracking-widest">{mode === 'VOICE' ? 'Ovozli' : 'Yozma'}</span>
              </div>
            </div>
          </div>
          <button onClick={() => { setMode(mode === 'TEXT' ? 'VOICE' : 'TEXT'); stopCurrentAudio(); }} className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-xs transition-all border-2 active:scale-95 ${mode === 'VOICE' ? 'bg-orange-600 border-orange-600 text-white shadow-lg' : 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-slate-600'}`}>
             <ArrowLeftRight size={16} /> {mode === 'TEXT' ? 'Ovozli' : 'Yozma'}
          </button>
        </header>

        {mode === 'TEXT' ? (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <AnimatePresence initial={false}>
                {messages.map((m) => (
                  <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${m.sender === 'student' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`p-4 rounded-[2rem] shadow-sm font-bold text-lg ${m.sender === 'student' ? 'bg-orange-600 text-white rounded-tr-none' : 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border-2 border-slate-100 dark:border-slate-700'}`}>
                      {m.text}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-[2rem] flex items-center gap-3 border-2 border-slate-100 dark:border-slate-700">
                    <Loader2 className="animate-spin text-orange-600" size={24} />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <footer className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t-4 border-orange-100 dark:border-slate-800 flex gap-4 transition-colors duration-300">
              <button onClick={toggleListen} className={`w-16 h-16 rounded-3xl flex items-center justify-center transition-all shadow-lg ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-white dark:bg-slate-800 text-orange-600 border dark:border-slate-700'}`}>
                <Mic size={32} />
              </button>
              <div className="flex-1 relative">
                <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend(inputText)} placeholder="Savolingizni yozing..." className="w-full py-5 px-8 rounded-[2rem] border-4 border-white dark:border-slate-700 shadow-inner bg-white dark:bg-slate-800 dark:text-white font-bold text-lg focus:outline-none focus:border-orange-400 transition-all pr-16" />
                <button onClick={() => handleSend(inputText)} disabled={!inputText.trim() || isLoading} className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 bg-orange-600 text-white rounded-2xl flex items-center justify-center hover:bg-orange-700 transition disabled:opacity-50">
                  <Send size={24} />
                </button>
              </div>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center transition-colors duration-300">
            <div className="relative mb-16">
               <AnimatePresence>
                 {(isListening || isSpeaking || isLoading) && (
                   <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1.6, opacity: 0.2 }} exit={{ scale: 0.8, opacity: 0 }} transition={{ repeat: Infinity, duration: 1.2 }} className={`absolute inset-0 rounded-full ${isListening ? 'bg-red-500' : 'bg-orange-500'}`} />
                 )}
               </AnimatePresence>
               <div className="w-64 h-64 bg-slate-800 rounded-full p-4 border-8 border-slate-800 shadow-2xl relative z-10 overflow-hidden">
                 <BilagonAvatar animate={isSpeaking || isListening} />
               </div>
            </div>
            <div className="mb-16 h-12 flex flex-col items-center justify-center">
               <h3 className={`text-4xl font-black transition-colors ${isListening ? 'text-red-400' : isSpeaking ? 'text-orange-400' : 'text-slate-500'}`}>
                 {statusText || 'Savol bering'}
               </h3>
            </div>
            <button onClick={toggleListen} disabled={isSpeaking || isLoading} className={`w-36 h-36 rounded-full flex items-center justify-center transition-all shadow-2xl active:scale-95 ${isListening ? 'bg-red-500 text-white animate-pulse' : (isSpeaking || isLoading) ? 'bg-slate-800 text-slate-700' : 'bg-orange-600 text-white hover:bg-orange-500'}`}>
              {isListening ? <StopCircle size={64} /> : <Mic size={64} />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
