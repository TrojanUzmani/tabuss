import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GamePhase, WordCard, Team, GameSettings } from './types';
import { INITIAL_WORDS } from './constants';

const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }
  return shuffled;
};

const App: React.FC = () => {
  const [isDark, setIsDark] = useState(() => 
    typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches : false
  );

  const [phase, setPhase] = useState<GamePhase>(GamePhase.HOME);
  const [showRules, setShowRules] = useState(false);
  const [settings, setSettings] = useState<GameSettings>({
    roundTime: 60,
    maxScore: 15,
    skipLimit: 3
  });
  const [teams, setTeams] = useState<Team[]>([
    { name: 'Grup Ateş', score: 0 },
    { name: 'Grup Buz', score: 0 }
  ]);
  const [activeTeamIdx, setActiveTeamIdx] = useState(0);
  const [wordList, setWordList] = useState<WordCard[]>(() => shuffleArray(INITIAL_WORDS));
  const [usedWords, setUsedWords] = useState<Set<number>>(new Set());
  const [currentWordIdx, setCurrentWordIdx] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(settings.roundTime);
  const [skipsUsed, setSkipsUsed] = useState(0);

  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  const triggerHaptic = (intensity: 'light' | 'medium' | 'heavy' = 'light') => {
    if (window.navigator.vibrate) {
      const patterns = { light: 30, medium: 70, heavy: [50, 30, 50] };
      window.navigator.vibrate(patterns[intensity]);
    }
  };

  const pickRandomWord = useCallback(() => {
    if (usedWords.size >= wordList.length) {
      const reshuffled = shuffleArray(INITIAL_WORDS);
      setWordList(reshuffled);
      setUsedWords(new Set([0]));
      setCurrentWordIdx(0);
      return;
    }
    let idx;
    do {
      idx = Math.floor(Math.random() * wordList.length);
    } while (usedWords.has(idx));
    setCurrentWordIdx(idx);
    setUsedWords(prev => new Set(prev).add(idx));
  }, [wordList, usedWords]);

  useEffect(() => {
    if (phase === GamePhase.PLAYING && timeLeft > 0) {
      timerRef.current = window.setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && phase === GamePhase.PLAYING) {
      endRound();
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, timeLeft]);

  const startGame = () => {
    setTeams(prev => prev.map(t => ({ ...t, score: 0 })));
    setUsedWords(new Set());
    setWordList(shuffleArray(INITIAL_WORDS));
    setActiveTeamIdx(0);
    setPhase(GamePhase.PRE_ROUND);
    triggerHaptic('medium');
  };

  const startRound = () => {
    setTimeLeft(settings.roundTime);
    setSkipsUsed(0);
    pickRandomWord();
    setPhase(GamePhase.PLAYING);
    triggerHaptic('medium');
  };

  const endRound = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const winner = teams.find(t => t.score >= settings.maxScore);
    setPhase(winner ? GamePhase.GAME_OVER : GamePhase.POST_ROUND);
    triggerHaptic('heavy');
  };

  const nextTurn = () => {
    setActiveTeamIdx(prev => (prev === 0 ? 1 : 0));
    setPhase(GamePhase.PRE_ROUND);
  };

  const handleAction = (type: 'correct' | 'taboo' | 'skip') => {
    if (type === 'correct') {
      triggerHaptic('light');
      setTeams(prev => {
        const next = [...prev];
        next[activeTeamIdx].score += 1;
        return next;
      });
      pickRandomWord();
    } else if (type === 'taboo') {
      triggerHaptic('heavy');
      setTeams(prev => {
        const next = [...prev];
        next[activeTeamIdx].score = Math.max(0, next[activeTeamIdx].score - 1);
        return next;
      });
      pickRandomWord();
    } else if (type === 'skip' && skipsUsed < settings.skipLimit) {
      setSkipsUsed(prev => prev + 1);
      pickRandomWord();
      triggerHaptic('medium');
    }
  };

  const Card = ({ word, taboos }: { word: string; taboos: string[] }) => (
    <div className="w-full max-w-sm mx-auto animate-card perspective-1000">
      <div className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border-b-[10px] border-indigo-600 dark:border-indigo-500 overflow-hidden transform transition-all hover:scale-[1.01]">
        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 dark:from-indigo-700 dark:to-violet-800 p-10 text-center">
          <span className="text-[10px] font-extrabold tracking-[0.25em] text-white/50 uppercase block mb-3">HEDEF KELİME</span>
          <h3 className="text-4xl font-black text-white uppercase tracking-tight leading-none drop-shadow-md">{word}</h3>
        </div>
        <div className="p-10 space-y-6">
          <span className="text-[10px] font-extrabold tracking-[0.25em] text-rose-500 dark:text-rose-400 uppercase block">YASAKLI KELİMELER</span>
          <div className="space-y-4">
            {taboos.map((t, i) => (
              <div key={i} className="flex items-center justify-between group">
                <span className="text-xl font-bold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 transition-colors">{t}</span>
                <span className="text-rose-500/20 group-hover:text-rose-500 transition-all transform group-hover:rotate-12">✕</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto bg-slate-50 dark:bg-slate-950 transition-colors duration-500 overflow-hidden relative">
      
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none opacity-20 dark:opacity-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500 blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-rose-500 blur-[120px] animate-pulse"></div>
      </div>

      {/* Header */}
      {phase !== GamePhase.HOME && (
        <nav className="sticky top-0 z-40 px-6 py-4 glass border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <h1 className="text-xl font-black italic tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">TABU ELITE</h1>
          <div className="flex items-center gap-3">
            <button onClick={() => setIsDark(!isDark)} className="p-2.5 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 text-amber-500">
              {isDark ? '☀️' : '🌙'}
            </button>
            <div className="flex gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl">
              {teams.map((t, i) => (
                <div key={i} className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${activeTeamIdx === i ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>
                  {t.score}
                </div>
              ))}
            </div>
          </div>
        </nav>
      )}

      <main className="flex-1 flex flex-col p-6 z-10">
        
        {phase === GamePhase.HOME && (
          <div className="flex-1 flex flex-col justify-center items-center text-center space-y-12 animate-in fade-in zoom-in-95 duration-700">
            <div className="relative group">
              <div className="absolute -inset-6 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-[3rem] blur-2xl opacity-25 group-hover:opacity-40 transition duration-1000"></div>
              <div className="relative glass border-2 border-white/20 dark:border-slate-800 rounded-[3rem] p-12 shadow-2xl">
                <h1 className="text-8xl font-black tracking-tighter text-slate-900 dark:text-white mb-2">TABU</h1>
                <div className="bg-indigo-600 text-white px-4 py-1 rounded-full text-[10px] font-black tracking-widest uppercase inline-block mx-auto">PRO EDITION</div>
              </div>
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-medium max-w-[240px]">Arkadaşlarınla eğlencenin doruğuna ulaşmaya hazır mısın?</p>
            <div className="w-full space-y-4 max-w-xs">
              <button onClick={() => { triggerHaptic('medium'); setPhase(GamePhase.SETUP); }} 
                className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-3xl font-black text-xl shadow-2xl shadow-indigo-200 dark:shadow-none transition-all active:scale-95">
                OYUNA BAŞLA
              </button>
              <button onClick={() => setShowRules(true)} 
                className="w-full py-5 glass border-2 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-3xl font-bold text-lg hover:border-indigo-400 transition-all flex items-center justify-center gap-3">
                <span>📜</span> KURALLAR
              </button>
            </div>
            <div className="text-[10px] text-slate-400 font-black tracking-widest uppercase">300+ PREMIUM KELİME</div>
          </div>
        )}

        {phase === GamePhase.SETUP && (
          <div className="space-y-8 animate-in slide-in-from-bottom-10 fade-in duration-500">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Özelleştir</h2>
            
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">TUR SÜRESİ</label>
                <div className="grid grid-cols-4 gap-2">
                  {[45, 60, 90, 120].map(val => (
                    <button key={val} onClick={() => setSettings(s => ({...s, roundTime: val}))}
                      className={`py-4 rounded-2xl border-2 font-bold text-sm transition-all ${settings.roundTime === val ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl scale-105' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-600'}`}>
                      {val}s
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">HEDEF PUAN</label>
                <div className="grid grid-cols-4 gap-2">
                  {[10, 15, 20, 30].map(val => (
                    <button key={val} onClick={() => setSettings(s => ({...s, maxScore: val}))}
                      className={`py-4 rounded-2xl border-2 font-bold text-sm transition-all ${settings.maxScore === val ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl scale-105' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-600'}`}>
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">TAKIMLAR</label>
                <div className="grid gap-3">
                  {teams.map((t, i) => (
                    <div key={i} className="relative group">
                      <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl ${i === 0 ? 'bg-indigo-500' : 'bg-rose-500'}`}></div>
                      <input type="text" value={t.name} maxLength={15}
                        onChange={(e) => setTeams(prev => { const n = [...prev]; n[i].name = e.target.value; return n; })}
                        className="w-full py-5 pl-6 pr-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 focus:border-indigo-500 dark:focus:border-indigo-500 outline-none font-black text-slate-800 dark:text-white transition-all shadow-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={startGame} className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-xl shadow-2xl hover:bg-indigo-700 transition-all active:scale-95 mt-4">
              HADİ BAŞLAYALIM!
            </button>
          </div>
        )}

        {phase === GamePhase.PRE_ROUND && (
          <div className="flex-1 flex flex-col justify-center items-center text-center space-y-10 animate-in fade-in slide-in-from-bottom-10 duration-500">
            <div className="relative">
              <div className={`w-32 h-32 rounded-[2.5rem] flex items-center justify-center text-6xl shadow-2xl animate-bounce-slow ${activeTeamIdx === 0 ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/40'}`}>
                {activeTeamIdx === 0 ? '🔥' : '❄️'}
              </div>
            </div>
            <div className="space-y-2">
              <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.3em]">SIRADAKİ TAKIM</span>
              <h2 className="text-5xl font-black text-slate-900 dark:text-white tracking-tight">{teams[activeTeamIdx].name}</h2>
            </div>
            <div className="glass p-6 rounded-[2rem] border-2 border-white/50 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold max-w-xs leading-relaxed">
              Hazırsan cihazı anlatıcıya ver ve butonla turu başlat!
            </div>
            <button onClick={startRound} className="w-full py-6 bg-green-600 hover:bg-green-700 text-white rounded-[2rem] font-black text-2xl shadow-2xl transition-all active:scale-95">
              BAŞLAT 🚀
            </button>
          </div>
        )}

        {phase === GamePhase.PLAYING && currentWordIdx !== null && (
          <div className="flex-1 flex flex-col animate-in fade-in duration-300">
            
            {/* Custom Timer Bar */}
            <div className="w-full mb-8 space-y-2">
              <div className="flex justify-between items-end px-1">
                <span className="text-4xl font-black font-mono tracking-tighter text-indigo-600 dark:text-indigo-400">
                  {timeLeft}s
                </span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  PUAN: {teams[activeTeamIdx].score}
                </span>
              </div>
              <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                <div className={`h-full transition-all duration-1000 ${timeLeft < 10 ? 'bg-rose-500 animate-pulse-fast' : 'bg-indigo-600'}`}
                  style={{ width: `${(timeLeft / settings.roundTime) * 100}%` }} />
              </div>
            </div>

            <Card word={wordList[currentWordIdx].word} taboos={wordList[currentWordIdx].taboo} />

            {/* Actions */}
            <div className="grid grid-cols-2 gap-4 mt-auto pt-8">
              <button onClick={() => handleAction('taboo')} className="py-6 bg-rose-500 dark:bg-rose-600 text-white rounded-3xl font-black text-xl shadow-xl active:scale-90 transition-all border-b-8 border-rose-700 dark:border-rose-900">
                TABU!
              </button>
              <button onClick={() => handleAction('correct')} className="py-6 bg-emerald-500 dark:bg-emerald-600 text-white rounded-3xl font-black text-xl shadow-xl active:scale-90 transition-all border-b-8 border-emerald-700 dark:border-emerald-900">
                DOĞRU
              </button>
              <button disabled={skipsUsed >= settings.skipLimit} onClick={() => handleAction('skip')}
                className={`col-span-2 py-4 rounded-3xl font-black text-lg border-4 transition-all ${skipsUsed >= settings.skipLimit ? 'border-slate-200 dark:border-slate-800 text-slate-300 dark:text-slate-700' : 'border-indigo-600 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400'}`}>
                PAS ({settings.skipLimit - skipsUsed})
              </button>
            </div>
          </div>
        )}

        {phase === GamePhase.POST_ROUND && (
          <div className="flex-1 flex flex-col justify-center items-center text-center space-y-10 animate-in slide-in-from-bottom-10 duration-500">
            <div className="text-7xl mb-4">📢</div>
            <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Tur Sona Erdi</h2>
            <div className="w-full glass p-8 rounded-[2.5rem] border-2 border-white/50 dark:border-slate-800 space-y-4 shadow-2xl">
              {teams.map((t, i) => (
                <div key={i} className={`flex justify-between items-center p-5 rounded-[1.5rem] transition-all border-2 ${activeTeamIdx === i ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg scale-105' : 'bg-slate-50 dark:bg-slate-900/50 border-transparent text-slate-600 dark:text-slate-400'}`}>
                  <span className="font-black uppercase tracking-tight">{t.name}</span>
                  <span className="font-black text-3xl">{t.score}</span>
                </div>
              ))}
            </div>
            <button onClick={nextTurn} className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-2xl shadow-2xl active:scale-95 transition-all">
              SIRADAKİ TUR
            </button>
          </div>
        )}

        {phase === GamePhase.GAME_OVER && (
          <div className="flex-1 flex flex-col justify-center items-center text-center space-y-12 animate-in zoom-in-90 duration-700">
            <div className="relative">
              <div className="text-[120px] leading-none animate-bounce">👑</div>
              <div className="absolute top-0 -left-6 -rotate-12 text-5xl">✨</div>
              <div className="absolute bottom-0 -right-6 rotate-12 text-5xl">✨</div>
            </div>
            <div>
              <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 tracking-[0.4em] uppercase mb-2 block">ŞAMPİYON</span>
              <h2 className="text-6xl font-black text-slate-900 dark:text-white tracking-tighter drop-shadow-lg">
                {teams.reduce((a, b) => a.score > b.score ? a : b).name}
              </h2>
            </div>
            <div className="w-full space-y-4 pt-10">
              <button onClick={() => setPhase(GamePhase.HOME)} className="w-full py-6 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-[2rem] font-black text-xl shadow-2xl active:scale-95 transition-all">
                TEKRAR OYNA
              </button>
            </div>
          </div>
        )}

      </main>

      {/* Rules Modal */}
      {showRules && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setShowRules(false)}></div>
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-[3rem] p-10 shadow-3xl border border-white/20 animate-in zoom-in-95 duration-500">
            <button onClick={() => setShowRules(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 p-2">✕</button>
            <h3 className="text-3xl font-black text-indigo-600 mb-8 flex items-center gap-3">
              <span>📜</span> Kurallar
            </h3>
            <div className="space-y-5 text-slate-600 dark:text-slate-300 font-semibold leading-relaxed">
              <div className="flex gap-4 items-start">
                <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 flex items-center justify-center text-[10px] font-black mt-1 shrink-0">1</span>
                <p>Hedef kelimeyi takımına anlat, yasaklı olan 5 kelimeyi sakın söyleme!</p>
              </div>
              <div className="flex gap-4 items-start text-rose-500">
                <span className="w-6 h-6 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-500 flex items-center justify-center text-[10px] font-black mt-1 shrink-0">2</span>
                <p>El-kol hareketi, parça söylemek veya yabancı dildeki karşılıklar yasaktır.</p>
              </div>
              <div className="flex gap-4 items-start">
                <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 flex items-center justify-center text-[10px] font-black mt-1 shrink-0">3</span>
                <p>Her doğru cevap +1, her Tabu -1 puan değerindedir.</p>
              </div>
            </div>
            <button onClick={() => setShowRules(false)} className="w-full mt-10 py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-lg shadow-xl active:scale-95 transition-all">
              ANLADIM
            </button>
          </div>
        </div>
      )}

      <footer className="py-6 text-center z-10">
        <span className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.5em]">ELITE TABU EXPERIENCE</span>
      </footer>
    </div>
  );
};

export default App;