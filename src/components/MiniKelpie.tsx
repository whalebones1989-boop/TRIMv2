import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Plus, Trophy, Zap, MessageSquare } from 'lucide-react';

interface TrimagotchiState {
  name: string;
  level: number;
  exp: number;
  hunger: number;     // 100 = full chest, 0 = hungry
  happiness: number;  // 100 = ecstatic, 0 = sad
  energy: number;     // 100 = hyperactive, 0 = exhausted
  lastTended: string;
}

export default function MiniKelpie({ primaryColorTheme = 'classic_red', onPlayClick }: { primaryColorTheme?: string; onPlayClick?: () => void }) {
  // Sync state with Trimagotchi
  const [pet, setPet] = useState<TrimagotchiState>(() => {
    const saved = localStorage.getItem('trim_trimagotchi_state_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      name: 'Rusty',
      level: 1,
      exp: 15,
      hunger: 65,
      happiness: 75,
      energy: 80,
      lastTended: new Date().toISOString()
    };
  });

  const [isMinimized, setIsMinimized] = useState<boolean>(() => {
    return localStorage.getItem('trim_minimize_mini_kelpie') === 'true';
  });

  const [activePose, setActivePose] = useState<'idle' | 'pet' | 'excited'>('idle');
  const [heartParticles, setHeartParticles] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const [tapBubble, setTapBubble] = useState<string | null>(null);

  // Sync isMinimized state to localStorage
  useEffect(() => {
    localStorage.setItem('trim_minimize_mini_kelpie', String(isMinimized));
  }, [isMinimized]);

  // Load state and update from storage changes
  useEffect(() => {
    const loadState = () => {
      const saved = localStorage.getItem('trim_trimagotchi_state_v1');
      if (saved) {
        try {
          setPet(JSON.parse(saved));
        } catch (e) {}
      }
    };
    window.addEventListener('storage', loadState);
    const interval = setInterval(loadState, 4000);
    return () => {
      window.removeEventListener('storage', loadState);
      clearInterval(interval);
    };
  }, []);

  const playMiniBeep = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (_) {}
  };

  const handleMiniPet = (e: React.MouseEvent) => {
    e.stopPropagation();
    playMiniBeep();
    setActivePose('pet');

    // Create heart sparks near where tap occurred (or centered)
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    const newSpark = { id: Date.now(), x: isNaN(x) ? 50 : x, y: isNaN(y) ? 35 : y };
    setHeartParticles(prev => [...prev, newSpark]);

    // Random cute quote
    const quotes = [
      "Woof! Did we finish our exercise today? 🐾",
      "I love sitting on your front page! ❤️",
      "You are looking absolute colossal, trainer! 🏆",
      "Lapping up local water and getting strong! 💧",
      "Gimme some kangaroo kibbles later! 🦘",
      "Let's work out together, human! 🏋️"
    ];
    setTapBubble(quotes[Math.floor(Math.random() * quotes.length)]);

    // Update localStorage happiness
    setPet(prev => {
      const updated = {
        ...prev,
        happiness: Math.min(100, prev.happiness + 5),
        lastTended: new Date().toISOString()
      };
      localStorage.setItem('trim_trimagotchi_state_v1', JSON.stringify(updated));
      return updated;
    });

    setTimeout(() => {
      setActivePose('idle');
    }, 1200);
  };

  // Auto clean up bubbles and particles
  useEffect(() => {
    if (heartParticles.length > 0) {
      const timer = setTimeout(() => {
        setHeartParticles(prev => prev.slice(1));
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [heartParticles]);

  useEffect(() => {
    if (tapBubble) {
      const timer = setTimeout(() => {
        setTapBubble(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [tapBubble]);

  if (isMinimized) {
    return (
      <div className="bg-slate-50 border border-slate-200 p-4 rounded-3xl flex flex-row items-center justify-between gap-3 text-left transition-all duration-200 group">
        <div className="flex items-center space-x-3 truncate">
          <span className="p-2.5 bg-slate-200 text-slate-700 rounded-2xl shrink-0 text-lg animate-pulse">
            🐾
          </span>
          <div className="truncate">
            <h4 
              className="font-extrabold text-slate-800 text-sm truncate cursor-pointer hover:text-slate-950 transition duration-155"
              onClick={() => setIsMinimized(false)}
            >
              Rusty the Kelpie
            </h4>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
              LV {pet.level} • HAPPINESS {pet.happiness}% (Minimized)
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 active:bg-slate-300 border border-slate-200 rounded-full text-slate-805 shadow-xs transition cursor-pointer select-none"
            title="Expand Kelpie Pup"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs text-left relative flex flex-col justify-between group overflow-hidden">
      
      {/* Uniform Minimize Button in Top-Right corner */}
      <button
        type="button"
        onClick={() => setIsMinimized(true)}
        className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 rounded-full text-slate-800 transition cursor-pointer select-none z-10"
        title="Minimize partner"
      >
        <span className="text-base font-extrabold leading-none block mb-0.5">—</span>
      </button>

      {/* Widget Header Info */}
      <div className="flex flex-col gap-1 pr-10 border-b pb-2.5 border-slate-100">
        <h3 className="text-xs font-black font-display text-slate-800 uppercase tracking-widest flex items-center space-x-1.5">
          <span className="text-lg">🐾</span>
          <span>Companion Room</span>
        </h3>
        <p className="text-[10px] text-slate-500 font-mono uppercase mt-0.5 select-none text-slate-400">
          Name: <span className="font-bold text-slate-700">{pet.name}</span> • {(pet as any).tickedWeeksCount !== undefined && (pet as any).tickedWeeksCount >= 4 ? <span className="font-extrabold text-indigo-650">🐺 Wolf Pup (Evolved!)</span> : <>Level: <span className="font-extrabold text-indigo-600">{pet.level}</span></>}
        </p>
      </div>

      {/* Interaction Stage */}
      <div className="my-3 py-1.5 flex flex-col items-center justify-center relative min-h-[140px]">
        {/* Sparkles particles overlay */}
        <AnimatePresence>
          {heartParticles.map((pt) => (
            <motion.div
              key={pt.id}
              initial={{ opacity: 0, scale: 0.5, y: 0 }}
              animate={{ opacity: 1, scale: [0.5, 1.2, 1], y: -40 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="absolute text-lg pointer-events-none select-none z-20"
              style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
            >
              💖
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Talk speech cloud */}
        <AnimatePresence>
          {tapBubble && (
            <motion.div
              initial={{ opacity: 0, y: 5, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -5 }}
              className="absolute top-0 bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-xl shadow-md z-20 max-w-[150px] leading-tight text-center border border-slate-800"
            >
              <div className="relative">
                {tapBubble}
                <div className="absolute left-1/2 -bottom-2 -translate-x-1/2 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-slate-900" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scaled Sweet Kelpie Pup SVG component */}
        <div 
          onClick={handleMiniPet}
          className="w-28 h-28 cursor-pointer relative"
          title="Tap to Pet Rusty!"
        >
          <motion.svg 
            viewBox="0 0 200 200" 
            className="w-full h-full"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            animate={
              activePose === 'pet'
                ? { y: [0, -6, 0, -6, 0], rotate: [-2, 2, -2, 2, 0] }
                : { y: [0, -1.8, 0] } // gentle idle breath
            }
            transition={{
              repeat: Infinity,
              duration: activePose === 'pet' ? 0.8 : 2.5,
              ease: 'easeInOut'
            }}
          >
            {/* SVG Gradient definitions */}
            <defs>
              <linearGradient id="miniKelpieRed" x1="0%" y1="0%" x2="100%" y2="100%">
                {(pet as any).tickedWeeksCount !== undefined && (pet as any).tickedWeeksCount >= 4 ? (
                  <>
                    <stop offset="0%" stopColor="#7a8a9e" />
                    <stop offset="100%" stopColor="#4a5568" />
                  </>
                ) : (
                  <>
                    <stop offset="0%" stopColor="#8d4a36" />
                    <stop offset="100%" stopColor="#632e1f" />
                  </>
                )}
              </linearGradient>
              <linearGradient id="miniKelpieTan" x1="0%" y1="0%" x2="0%" y2="100%">
                {(pet as any).tickedWeeksCount !== undefined && (pet as any).tickedWeeksCount >= 4 ? (
                  <>
                    <stop offset="0%" stopColor="#f1f5f9" />
                    <stop offset="100%" stopColor="#cbd5e1" />
                  </>
                ) : (
                  <>
                    <stop offset="0%" stopColor="#f8c385" />
                    <stop offset="100%" stopColor="#de984e" />
                  </>
                )}
              </linearGradient>
              <linearGradient id="miniKelpieEye" x1="0%" y1="0%" x2="0%" y2="100%">
                {(pet as any).tickedWeeksCount !== undefined && (pet as any).tickedWeeksCount >= 4 ? (
                  <>
                    <stop offset="0%" stopColor="#eab308" />
                    <stop offset="100%" stopColor="#ca8a04" />
                  </>
                ) : (
                  <>
                    <stop offset="0%" stopColor="#3d1b11" />
                    <stop offset="100%" stopColor="#1e0b06" />
                  </>
                )}
              </linearGradient>
            </defs>

            {/* Little cozy tail */}
            <motion.path
              d="M 62 148 Q 40 156 42 138 Q 45 125 55 132 C 58 135, 60 142, 62 148 Z"
              fill="url(#miniKelpieRed)"
              style={{ originX: '62px', originY: '148px' }}
              animate={
                activePose === 'pet'
                  ? { rotate: [-15, 20, -15, 20, -15] }
                  : { rotate: [-3, 5, -3] }
              }
              transition={{ repeat: Infinity, duration: activePose === 'pet' ? 0.35 : 1.8 }}
            />

            {/* Back legs bulk */}
            <ellipse cx="78" cy="154" rx="14" ry="10" fill="#58271a" />
            <ellipse cx="122" cy="154" rx="14" ry="10" fill="#58271a" />

            {/* Chubby Torso */}
            <path
              d="M 70 110 C 70 95, 130 95, 130 110 C 130 135, 125 155, 115 155 C 110 155, 90 155, 85 155 C 75 155, 70 135, 70 110 Z"
              fill="url(#miniKelpieRed)"
            />

            {/* Tan Chest layout */}
            <path
              d="M 82 104 C 82 96, 118 96, 118 104 C 118 122, 110 134, 100 134 C 90 134, 82 122, 82 104 Z"
              fill="url(#miniKelpieTan)"
            />
            <circle cx="100" cy="110" r="6" fill="#fff" opacity="0.15" />

            {/* Left/Right paws */}
            <rect x="80" y="146" width="14" height="18" rx="7" fill="url(#miniKelpieRed)" />
            <rect x="80" y="156" width="14" height="8" rx="4" fill="url(#miniKelpieTan)" />
            <circle cx="84" cy="161" r="1.2" fill="#632e1f" />
            <circle cx="89" cy="161" r="1.2" fill="#632e1f" />
            <circle cx="94" cy="161" r="1.2" fill="#632e1f" />

            <rect x="106" y="146" width="14" height="18" rx="7" fill="url(#miniKelpieRed)" />
            <rect x="106" y="156" width="14" height="8" rx="4" fill="url(#miniKelpieTan)" />
            <circle cx="110" cy="161" r="1.2" fill="#632e1f" />
            <circle cx="115" cy="161" r="1.2" fill="#632e1f" />
            <circle cx="120" cy="161" r="1.2" fill="#632e1f" />

            {/* Head group */}
            <motion.g
              style={{ originX: '100px', originY: '85px' }}
              animate={{ y: [0, -0.8, 0] }}
              transition={{ repeat: Infinity, duration: 2.2 }}
            >
              {/* Outer Ear Left */}
              <path d="M 40 68 C 30 45, 45 15, 60 18 C 65 20, 70 40, 74 54 Z" fill="url(#miniKelpieRed)" />
              <path d="M 46 62 C 38 48, 48 26, 58 26 C 62 26, 65 42, 68 50 Z" fill="url(#miniKelpieTan)" />

              {/* Outer Ear Right */}
              <path d="M 160 68 C 170 45, 155 15, 140 18 C 135 20, 130 40, 126 54 Z" fill="url(#miniKelpieRed)" />
              <path d="M 154 62 C 162 48, 152 26, 142 26 C 138 26, 135 42, 132 50 Z" fill="url(#miniKelpieTan)" />

              {/* Face circle */}
              <ellipse cx="100" cy="80" rx="48" ry="42" fill="url(#miniKelpieRed)" />

              {/* Eyebrows */}
              <ellipse cx="74" cy="56" rx="7" ry="4" fill="url(#miniKelpieTan)" />
              <ellipse cx="126" cy="56" rx="7" ry="4" fill="url(#miniKelpieTan)" />

              {/* Eyes */}
              {activePose === 'pet' ? (
                <>
                  <path d="M 64 80 Q 72 68 80 80" stroke="#482218" strokeWidth="4.5" fill="none" strokeLinecap="round" />
                  <path d="M 120 80 Q 128 68 136 80" stroke="#482218" strokeWidth="4.5" fill="none" strokeLinecap="round" />
                </>
              ) : (
                <>
                  <ellipse cx="72" cy="78" rx="11" ry="12" fill="url(#miniKelpieEye)" />
                  <circle cx="68" cy="74" r="4" fill="#ffffff" />
                  <circle cx="76" cy="82" r="2" fill="#ffffff" />

                  <ellipse cx="128" cy="78" rx="11" ry="12" fill="url(#miniKelpieEye)" />
                  <circle cx="124" cy="74" r="4" fill="#ffffff" />
                  <circle cx="132" cy="82" r="2" fill="#ffffff" />
                </>
              )}

              {/* Muzzle */}
              <path d="M 82 86 C 82 78, 118 78, 118 86 C 118 96, 110 103, 100 103 C 90 103, 82 96, 82 86 Z" fill="url(#miniKelpieTan)" />
              <ellipse cx="100" cy="83" rx="5.5" ry="3.5" fill="#2d1007" />
              <circle cx="98.2" cy="81.5" r="1" fill="#fff" opacity="0.75" />

              {/* Puppy Smile */}
              <path d="M 95 90 Q 100 95 105 90" stroke="#2d1007" strokeWidth="2" fill="none" strokeLinecap="round" />
            </motion.g>
          </motion.svg>
        </div>
      </div>

      {/* Mini Stats Progress Indicators */}
      <div className="space-y-2.5 pt-3.5 border-t border-slate-100 shrink-0">
        <div className="grid grid-cols-3 gap-2">
          {/* Hunger segment */}
          <div className="bg-slate-50 border border-slate-150/60 p-1.5 rounded-xl flex flex-col items-center">
            <span className="text-xs">🍖</span>
            <span className="text-[8px] font-mono font-bold text-slate-400 uppercase mt-0.5">Hungry</span>
            <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden mt-1">
              <div className="bg-amber-500 h-full" style={{ width: `${pet.hunger}%` }} />
            </div>
          </div>

          {/* Health/Happiness segment */}
          <div className="bg-slate-50 border border-slate-150/60 p-1.5 rounded-xl flex flex-col items-center">
            <span className="text-xs">❤️</span>
            <span className="text-[8px] font-mono font-bold text-slate-400 uppercase mt-0.5">Happy</span>
            <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden mt-1">
              <div className="bg-red-500 h-full" style={{ width: `${pet.happiness}%` }} />
            </div>
          </div>

          {/* Energy segment */}
          <div className="bg-slate-50 border border-slate-150/60 p-1.5 rounded-xl flex flex-col items-center">
            <span className="text-xs">⚡</span>
            <span className="text-[8px] font-mono font-bold text-slate-400 uppercase mt-0.5">Energy</span>
            <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden mt-1">
              <div className="bg-indigo-500 h-full" style={{ width: `${pet.energy}%` }} />
            </div>
          </div>
        </div>

        {/* Go to Playroom controller */}
        {onPlayClick && (
          <button
            type="button"
            onClick={onPlayClick}
            className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-bold transition flex items-center justify-center space-x-1 cursor-pointer select-none"
          >
            <span>Navigate to Playroom 🐾</span>
          </button>
        )}
      </div>

    </div>
  );
}
