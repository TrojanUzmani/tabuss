
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GamePhase, WordCard, Team, GameSettings } from './types';
import { INITIAL_WORDS } from './constants';

// Fisher-Yates shuffle algorithm to ensure true randomness
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
  // Theme State
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Game State
  const [phase, setPhase] = useState<GamePhase>(GamePhase.HOME);
  const [showRules, setShowRules] = useState(false);
  const [settings, setSettings] = useState<GameSettings>({
    roundTime: 60,
    maxScore: 10,
    skipLimit: 3
  });
  const [teams, setTeams] = useState<Team[]>([
    { name: 'Takım A', score: 0 },
    { name: 'Takım B', score: 0 }
  ]);
  const [activeTeamIdx, setActiveTeamIdx] = useState(0);
  
  // Initialize with shuffled words from constants
  const [wordList, setWordList] = useState<WordCard[]>(() => shuffleArray(INITIAL_WORDS));
  const [usedWords, setUsedWords] = useState<Set<number>>(new Set());
  const [currentWordIdx, setCurrentWordIdx] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(settings.roundTime);
  const [skipsUsed, setSkipsUsed] = useState(0);

  const timerRef = useRef<number | null>(null);

  // Persistence for theme
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // UI feedbacks
  const triggerHaptic = () => {
    if (window.navigator.vibrate) window.navigator.vibrate(50);
  };

  // Helper to get random unused word
  const pickRandomWord = useCallback(() => {
    if (usedWords.size >= wordList.length) {
      const reshuffled = shuffleArray(INITIAL_WORDS);
      setWordList(reshuffled);
      setUsedWords(new Set([0]));
      setCurrentWordIdx(0);
      return;
    }

    let idx: number;
    do {
      idx = Math.floor(Math.random() * wordList.length);
    } while (usedWords.has(idx));

    setCurrentWordIdx(idx);
    setUsedWords(prev => new Set(prev).add(idx));
  }, [wordList, usedWords]);

  // Timer logic
  useEffect(() => {
    if (phase === GamePhase.PLAYING && timeLeft > 0) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && phase === GamePhase.PLAYING) {
      endRound();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, timeLeft]);

  const startGame = () => {
    setTeams([
      { name: 'Takım A', score: 0 },
      { name: 'Takım B', score: 0 }
    ]);
    setUsedWords(new Set());
    setWordList(shuffleArray(INITIAL_WORDS));
    setActiveTeamIdx(0);
    setPhase(GamePhase.PRE_ROUND);
  };

  const startRound = () => {
    setTimeLeft(settings.roundTime);
    setSkipsUsed(0);
    pickRandomWord();
    setPhase(GamePhase.PLAYING);
  };

  const endRound = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const currentTeam = teams[activeTeamIdx];
    if (currentTeam.score >= settings.maxScore) {
      setPhase(GamePhase.GAME_OVER);
    } else {
      setPhase(GamePhase.POST_ROUND);
    }
  };

  const nextTurn = () => {
    setActiveTeamIdx(prev => (prev === 0 ? 1 : 0));
    setPhase(GamePhase.PRE_ROUND);
  };

  const handleCorrect = () => {
    triggerHaptic();
    setTeams(prev => {
      const next = [...prev];
      next[activeTeamIdx].score += 1;
      return next;
    });
    pickRandomWord();
  };

  const handleTaboo = () => {
    triggerHaptic();
    setTeams(prev => {
      const next = [...prev];
      next[activeTeamIdx].score = Math.max(0, next[activeTeamIdx].score - 1);
      return next;
    });
    pickRandomWord();
  };

  const handleSkip = () => {
    if (skipsUsed < settings.skipLimit) {
      setSkipsUsed(prev => prev + 1);
      pickRandomWord();
    }
  };

  const ThemeToggle = () => (
    <button 
      onClick={() => setIsDark(!isDark)}
      className="p-2 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-yellow-400 transition-colors shadow-sm"
    >
      {isDark ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 5a7 7 0 100 14 7 7 0 000-14z" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );

  const RulesModal = () => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-8 shadow-2xl relative animate-in zoom-in-95 duration-300">
        <button 
          onClick={() => setShowRules(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h2 className="text-2xl font-black text-indigo-900 dark:text-indigo-400 mb-6 flex items-center gap-2">
          <span>📜</span> Nasıl Oynanır?
        </h2>
        <div className="space-y-4 text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
          <div className="flex gap-3">
            <div className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-full w-6 h-6 flex-shrink-0 flex items-center justify-center font-bold text-xs">1</div>
            <p>Sıran geldiğinde üstteki kelimeyi takım arkadaşına anlatmaya çalış.</p>
          </div>
          <div className="flex gap-3 text-red-600 dark:text-red-400">
            <div className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full w-6 h-6 flex-shrink-0 flex items-center justify-center font-bold text-xs">2</div>
            <p>Altta yazan 5 yasaklı kelimeyi asla kullanma!</p>
          </div>
          <div className="flex gap-3">
            <div className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-full w-6 h-6 flex-shrink-0 flex items-center justify-center font-bold text-xs">3</div>
            <p>El-kol hareketi, şarkı veya kelimenin bir kısmını söylemek yasaktır.</p>
          </div>
          <div className="flex gap-3">
            <div className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-full w-6 h-6 flex-shrink-0 flex items-center justify-center font-bold text-xs">4</div>
            <p>"DOĞRU" +1 puan kazandırır, "TABU" ise -1 puan kaybettirir.</p>
          </div>
          <div className="flex gap-3">
            <div className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-full w-6 h-6 flex-shrink-0 flex items-center justify-center font-bold text-xs">5</div>
            <p>Her turda sınırlı sayıda PAS hakkın vardır.</p>
          </div>
        </div>
        <button 
          onClick={() => setShowRules(false)}
          className="w-full mt-8 bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 active:scale-95 transition-all"
        >
          ANLADIM
        </button>
      </div>
    </div>
  );

  const Header = () => (
    <div className="bg-indigo-700 dark:bg-slate-900 text-white p-4 shadow-lg flex justify-between items-center sticky top-0 z-50 border-b dark:border-slate-800 transition-colors">
      <h1 className="text-xl font-bold italic tracking-tighter">TABU PRO</h1>
      <div className="flex items-center gap-4">
        <ThemeToggle />
        <div className="flex gap-2 text-xs font-semibold">
          <div className={activeTeamIdx === 0 ? "bg-white dark:bg-indigo-600 text-indigo-700 dark:text-white px-3 py-1 rounded-full border border-indigo-400 dark:border-transparent transition-all" : "px-3 py-1 opacity-70"}>
            {teams[0].score}
          </div>
          <div className={activeTeamIdx === 1 ? "bg-white dark:bg-indigo-600 text-indigo-700 dark:text-white px-3 py-1 rounded-full border border-indigo-400 dark:border-transparent transition-all" : "px-3 py-1 opacity-70"}>
            {teams[1].score}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-white dark:bg-slate-950 transition-colors overflow-hidden relative">
      {showRules && <RulesModal />}
      {phase !== GamePhase.HOME && phase !== GamePhase.SETUP && <Header />}

      <main className="flex-1 flex flex-col p-6 overflow-y-auto">
        {phase === GamePhase.HOME && (
          <div className="flex-1 flex flex-col justify-center items-center text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
            <div className="absolute top-6 right-6">
              <ThemeToggle />
            </div>
            <div className="relative">
              <div className="absolute -inset-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg blur opacity-40 dark:opacity-60"></div>
              <h1 className="relative text-7xl font-extrabold text-indigo-900 dark:text-white mb-2 tracking-tighter">TABU</h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400 font-medium">Gerçek bir Tabu deneyimine hazır mısın?</p>
            <div className="w-full space-y-4 pt-8">
              <button 
                onClick={() => setPhase(GamePhase.SETUP)}
                className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 active:scale-95 transition-all"
              >
                OYUNA BAŞLA
              </button>
              <button 
                onClick={() => setShowRules(true)}
                className="w-full bg-white dark:bg-slate-900 border-2 border-gray-100 dark:border-slate-800 text-gray-600 dark:text-gray-300 py-4 rounded-2xl font-bold text-lg hover:border-indigo-200 dark:hover:border-indigo-500 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <span>📜</span> KURALLAR
              </button>
            </div>
            <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest font-black">Toplam {INITIAL_WORDS.length} Kelime Havuzu</div>
          </div>
        )}

        {phase === GamePhase.SETUP && (
          <div className="space-y-8 animate-in slide-in-from-bottom-10 fade-in duration-300">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">Oyun Ayarları</h2>
              <button onClick={() => setShowRules(true)} className="text-indigo-600 dark:text-indigo-400 font-bold text-sm underline">Kuralları Gör</button>
            </div>
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Tur Süresi (Saniye)</label>
                <div className="grid grid-cols-4 gap-2">
                  {[45, 60, 90, 120].map(time => (
                    <button 
                      key={time}
                      onClick={() => setSettings(s => ({...s, roundTime: time}))}
                      className={`py-3 rounded-xl border-2 transition-all font-bold text-sm ${settings.roundTime === time ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'border-gray-100 dark:border-slate-800 text-gray-400 dark:text-slate-600 hover:border-indigo-200'}`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Bitiş Skoru</label>
                <div className="grid grid-cols-4 gap-2">
                  {[5, 10, 20, 30].map(score => (
                    <button 
                      key={score}
                      onClick={() => setSettings(s => ({...s, maxScore: score}))}
                      className={`py-3 rounded-xl border-2 transition-all font-bold text-sm ${settings.maxScore === score ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'border-gray-100 dark:border-slate-800 text-gray-400 dark:text-slate-600 hover:border-indigo-200'}`}
                    >
                      {score}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Takım İsimleri</label>
                <div className="space-y-3">
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-indigo-500">A</span>
                    <input 
                      type="text" 
                      value={teams[0].name}
                      onChange={(e) => setTeams(t => [{...t[0], name: e.target.value}, t[1]])}
                      className="w-full pl-10 pr-4 py-4 rounded-xl bg-gray-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-gray-800 dark:text-white transition-all"
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-indigo-500">B</span>
                    <input 
                      type="text" 
                      value={teams[1].name}
                      onChange={(e) => setTeams(t => [t[0], {...t[1], name: e.target.value}])}
                      className="w-full pl-10 pr-4 py-4 rounded-xl bg-gray-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-gray-800 dark:text-white transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={startGame}
              className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-bold text-lg shadow-xl hover:bg-indigo-700 active:scale-95 transition-all mt-8"
            >
              HAZIRIZ!
            </button>
          </div>
        )}

        {phase === GamePhase.PRE_ROUND && (
          <div className="flex-1 flex flex-col justify-center items-center text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-24 h-24 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center text-5xl">
              {activeTeamIdx === 0 ? '🔥' : '⚡'}
            </div>
            <div>
              <h2 className="text-lg font-black text-indigo-900 dark:text-indigo-400 uppercase tracking-widest mb-1">Sıradaki Takım</h2>
              <div className="text-4xl font-black text-gray-900 dark:text-white drop-shadow-sm">{teams[activeTeamIdx].name}</div>
            </div>
            <div className="bg-indigo-50 dark:bg-slate-900 p-6 rounded-2xl border-l-4 border-indigo-500 text-gray-600 dark:text-gray-400 font-medium">
              Telefonu anlatıcıya verin ve herkes hazırsa butona basın!
            </div>
            <button 
              onClick={startRound}
              className="w-full bg-green-600 text-white py-5 rounded-2xl font-bold text-xl shadow-xl hover:bg-green-700 active:scale-95 transition-all"
            >
              TURU BAŞLAT
            </button>
          </div>
        )}

        {phase === GamePhase.PLAYING && currentWordIdx !== null && (
          <div className="flex-1 flex flex-col animate-in fade-in duration-300">
            <div className="w-full h-2 bg-gray-100 dark:bg-slate-900 rounded-full mb-6 overflow-hidden">
              <div 
                className={`h-full transition-all duration-1000 ${timeLeft < 10 ? 'bg-red-500 animate-pulse' : 'bg-indigo-500'}`}
                style={{ width: `${(timeLeft / settings.roundTime) * 100}%` }}
              />
            </div>

            <div className="flex-1 flex flex-col items-center justify-between">
              <div className="w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-b-8 border-indigo-600 dark:border-indigo-800 overflow-hidden flex flex-col min-h-[420px] transition-colors">
                <div className="bg-indigo-600 dark:bg-indigo-700 text-white py-10 text-center px-4 relative">
                  <span className="text-[10px] font-black tracking-[0.2em] uppercase opacity-70 block mb-2">ANLATILACAK KELİME</span>
                  <h3 className="text-4xl font-extrabold uppercase tracking-tight break-words">
                    {wordList[currentWordIdx].word}
                  </h3>
                  <div className="absolute top-4 right-4 text-xs font-bold opacity-30">
                    #{usedWords.size}
                  </div>
                </div>
                <div className="flex-1 p-8 space-y-5">
                  <span className="text-[10px] font-black tracking-[0.2em] text-red-500 dark:text-red-400 uppercase block mb-4">YASAKLI KELİMELER</span>
                  {wordList[currentWordIdx].taboo.map((w, i) => (
                    <div key={i} className="text-xl font-bold text-gray-700 dark:text-gray-300 border-b dark:border-slate-800 border-gray-50 pb-3 flex justify-between items-center group transition-colors">
                      <span>{w}</span>
                      <span className="text-red-500/20 group-hover:text-red-500 transition-colors">❌</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 w-full mt-8">
                <button 
                  onClick={handleTaboo}
                  className="bg-red-500 dark:bg-red-600 text-white py-5 rounded-2xl font-black text-xl shadow-lg active:scale-90 transition-all border-b-4 border-red-700 dark:border-red-900"
                >
                  TABU!
                </button>
                <button 
                  onClick={handleCorrect}
                  className="bg-green-500 dark:bg-green-600 text-white py-5 rounded-2xl font-black text-xl shadow-lg active:scale-90 transition-all border-b-4 border-green-700 dark:border-green-900"
                >
                  DOĞRU
                </button>
                <button 
                  disabled={skipsUsed >= settings.skipLimit}
                  onClick={handleSkip}
                  className={`col-span-2 py-4 rounded-2xl font-bold text-lg border-2 transition-all ${skipsUsed >= settings.skipLimit ? 'border-gray-200 dark:border-slate-800 text-gray-300 dark:text-slate-700' : 'border-indigo-600 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400 active:bg-indigo-50 dark:active:bg-indigo-900/20'}`}
                >
                  PAS ({settings.skipLimit - skipsUsed} Kalan)
                </button>
              </div>
            </div>
          </div>
        )}

        {phase === GamePhase.POST_ROUND && (
          <div className="flex-1 flex flex-col justify-center items-center text-center space-y-8 animate-in slide-in-from-bottom-10 duration-500">
            <div className="text-5xl">⏰</div>
            <h2 className="text-3xl font-black text-gray-800 dark:text-white uppercase tracking-tight">Tur Bitti!</h2>
            <div className="bg-white dark:bg-slate-900 w-full p-8 rounded-3xl shadow-xl border-t-8 border-indigo-600 transition-colors">
              <div className="space-y-4">
                {teams.map((t, i) => (
                  <div key={i} className={`flex justify-between items-center p-4 rounded-2xl transition-all ${activeTeamIdx === i ? 'bg-indigo-50 dark:bg-indigo-900/30 border-2 border-indigo-200 dark:border-indigo-700 ring-4 ring-indigo-50 dark:ring-indigo-900/10' : 'bg-gray-50 dark:bg-slate-800/50 border-2 border-transparent'}`}>
                    <span className="font-black text-gray-700 dark:text-gray-300 uppercase tracking-tight">{t.name}</span>
                    <span className="font-black text-indigo-600 dark:text-indigo-400 text-3xl">{t.score}</span>
                  </div>
                ))}
              </div>
            </div>
            <button 
              onClick={nextTurn}
              className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-bold text-xl shadow-xl active:scale-95 transition-all"
            >
              SIRADAKİ TAKIMA GEÇ
            </button>
          </div>
        )}

        {phase === GamePhase.GAME_OVER && (
          <div className="flex-1 flex flex-col justify-center items-center text-center space-y-10 animate-in zoom-in-90 duration-700">
            <div className="relative">
              <div className="text-9xl animate-bounce">🏆</div>
              <div className="absolute top-0 -left-4 -rotate-12 animate-pulse text-4xl">✨</div>
              <div className="absolute top-0 -right-4 rotate-12 animate-pulse text-4xl">✨</div>
            </div>
            <div>
              <h2 className="text-5xl font-black text-indigo-900 dark:text-white uppercase tracking-tighter mb-4">TEBRİKLER!</h2>
              <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 drop-shadow-sm px-4">
                {teams[0].score >= settings.maxScore ? teams[0].name : teams[1].name} Kazandı!
              </div>
            </div>
            <div className="w-full flex flex-col gap-4">
              <button 
                onClick={() => setPhase(GamePhase.HOME)}
                className="w-full bg-gray-900 dark:bg-slate-100 dark:text-slate-900 text-white py-5 rounded-2xl font-bold text-xl shadow-xl active:scale-95 transition-all"
              >
                ANA MENÜ
              </button>
            </div>
          </div>
        )}
      </main>
      
      <footer className="p-4 text-center text-[10px] text-gray-400 dark:text-gray-600 font-black uppercase tracking-widest transition-colors">
        Tabu Pro TROJAN UZMANI &copy; 2026
      </footer>
    </div>
  );
};

export default App;
