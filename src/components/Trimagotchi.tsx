import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, 
  Flame, 
  Award, 
  Zap, 
  Coffee, 
  Sparkles, 
  Smile, 
  Dumbbell, 
  Moon, 
  Volume2, 
  VolumeX, 
  RefreshCw, 
  Edit2, 
  Check, 
  Trash2, 
  Plus, 
  ShoppingBag,
  Grid
} from 'lucide-react';

interface TrimagotchiState {
  name: string;
  level: number;
  exp: number;
  hunger: number;     // 100 = full chest, 0 = hungry
  happiness: number;  // 100 = ecstatic, 0 = sad
  energy: number;     // 100 = hyperactive, 0 = exhausted
  lastTended: string;
  tickedWeeksCount?: number; // 0 to 4 weeks, at 4 it evolves to raw grey wolf pup!
}

interface TreatsInventory {
  kibble: number;     // Kangaroo Kibble (breathing reward)
  protein: number;    // Red Earth Rawhide (workout reward)
  elixir: number;     // Kelpie Energy Elixir (daily quest reward)
  potato: number;     // Sweet Potato Chew (favorite/check-in reward)
}

// 8-bit Synth Audio Driver using browser Web Audio API
const playRetroBeep = (type: 'feed' | 'pet' | 'exercise' | 'level' | 'sleep' | 'click', muted: boolean) => {
  if (muted) return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'click') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === 'feed') {
      // Rapid happy ascending arpeggio
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.06);
        gain.gain.setValueAtTime(0.04, ctx.currentTime + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.06 + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.06);
        osc.stop(ctx.currentTime + idx * 0.06 + 0.1);
      });
    } else if (type === 'pet') {
      // Warm, cute double squeak
      const time = ctx.currentTime;
      [0, 0.1].forEach((delay, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(698.46 + idx * 200, time + delay); // F5 -> A5-ish
        osc.frequency.exponentialRampToValueAtTime(880, time + delay + 0.12);
        gain.gain.setValueAtTime(0.05, time + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, time + delay + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time + delay);
        osc.stop(time + delay + 0.12);
      });
    } else if (type === 'exercise') {
      // Training whistle slide Up & Down
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(330, ctx.currentTime); // E4
      osc.frequency.linearRampToValueAtTime(660, ctx.currentTime + 0.15); // E5
      osc.frequency.linearRampToValueAtTime(440, ctx.currentTime + 0.3); // A4
      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'sleep') {
      // Deep gentle pulse Zzz sounds
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(110, ctx.currentTime); // A2
      osc.frequency.linearRampToValueAtTime(130, ctx.currentTime + 0.4);
      osc.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.8);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } else if (type === 'level') {
      // Spectacular multi-channel retro level up fanfare!
      const chord = [392.00, 523.25, 659.25, 783.99, 1046.50]; // G4, C5, E5, G5, C6
      chord.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx % 2 === 0 ? 'square' : 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
        gain.gain.setValueAtTime(0.04, ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.25);
      });
    }
  } catch (e) {
    console.warn('Audio play failure:', e);
  }
};

export default function Trimagotchi({ primaryColorTheme = 'classic_red', profileName = 'Gardener' }) {
  // Trimagotchi State persistence
  const [pet, setPet] = useState<TrimagotchiState>(() => {
    const saved = localStorage.getItem('trim_trimagotchi_state_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.tickedWeeksCount === undefined) {
          parsed.tickedWeeksCount = 0;
        }
        return parsed;
      } catch (e) {}
    }
    return {
      name: 'Rusty',
      level: 1,
      exp: 15,
      hunger: 65,
      happiness: 75,
      energy: 80,
      lastTended: new Date().toISOString(),
      tickedWeeksCount: 0
    };
  });

  const [inventory, setInventory] = useState<TreatsInventory>(() => {
    const saved = localStorage.getItem('trim_trimagotchi_treats_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    // Set friendly defaults with treats so it is immediately playable
    return {
      kibble: 3,   // Kangaroo Kibbles starter
      protein: 2,  // Rawhide sticks starter
      elixir: 1,   // Elixir flask starter
      potato: 2    // Sweet potato chews starter
    };
  });

  // UI Local States
  const [activePose, setActivePose] = useState<'idle' | 'eating' | 'sleeping' | 'workout' | 'pet' | 'excited'>('idle');
  const [nameEditing, setNameEditing] = useState(false);
  const [editedName, setEditedName] = useState(pet.name);
  const [isMuted, setIsMuted] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
  };

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);
  const [heartParticles, setHeartParticles] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const [crumbParticles, setCrumbParticles] = useState<Array<{ id: number; x: number; y: number; rotate: number }>>([]);
  const [showRenameModal, setShowRenameModal] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('trim_trimagotchi_state_v1', JSON.stringify(pet));
  }, [pet]);

  useEffect(() => {
    localStorage.setItem('trim_trimagotchi_treats_v1', JSON.stringify(inventory));
  }, [inventory]);

  // Read treat updates made by App.tsx (e.g., when workouts finish)
  useEffect(() => {
    const handleStorageChange = () => {
      const savedTreats = localStorage.getItem('trim_trimagotchi_treats_v1');
      if (savedTreats) {
        try {
          setInventory(JSON.parse(savedTreats));
        } catch (e) {}
      }
    };
    window.addEventListener('storage', handleStorageChange);
    // Also poll every 4 seconds to catch active rewards instantly
    const pollInterval = setInterval(handleStorageChange, 4000);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(pollInterval);
    };
  }, []);

  // Naturally decaying hunger and energy levels slowly over time
  useEffect(() => {
    const decayInterval = setInterval(() => {
      setPet(prev => {
        // Starving drops happiness rapidly
        const nextHunger = Math.max(0, prev.hunger - 1);
        const hasNoFood = nextHunger < 20;
        const happinessDecay = hasNoFood ? 3 : 1;
        const nextHappiness = Math.max(0, prev.happiness - (prev.energy < 20 ? 2 : happinessDecay));
        const nextEnergy = Math.max(0, prev.energy - (activePose === 'workout' ? 0 : 0.5));

        return {
          ...prev,
          hunger: nextHunger,
          happiness: nextHappiness,
          energy: nextEnergy
        };
      });
    }, 45000); // Decays every 45 secs slightly

    return () => clearInterval(decayInterval);
  }, [activePose]);

  // Actions
  const handleFeed = (foodType: keyof TreatsInventory) => {
    if (inventory[foodType] <= 0) {
      showNotification('Out of treats! Complete breathing sessions, workouts, or daily check-ins to earn more.', 'error');
      playRetroBeep('click', isMuted);
      return;
    }

    playRetroBeep('feed', isMuted);
    setActivePose('eating');

    // Create eating crumb particles
    const newCrumbs = Array.from({ length: 12 }).map((_, i) => ({
      id: Date.now() + i,
      x: 75 + Math.random() * 50,
      y: 110 + Math.random() * 20,
      rotate: Math.random() * 360
    }));
    setCrumbParticles(newCrumbs);
    setTimeout(() => setCrumbParticles([]), 1500);

    // Food adjustments
    let sBonus = 0;
    let hBonus = 0;
    let expBonus = 0;
    let itemLabel = '';

    if (foodType === 'kibble') {
      sBonus = 20;
      expBonus = 12;
      itemLabel = 'Kangaroo Agility Kibble 🦘';
    } else if (foodType === 'protein') {
      sBonus = 45;
      expBonus = 30;
      hBonus = 15;
      itemLabel = 'Red Earth Protein Rawhide 🍖';
    } else if (foodType === 'elixir') {
      sBonus = 35;
      expBonus = 60;
      hBonus = 25;
      itemLabel = 'Kelpie Energy Elixir ⚡';
    } else if (foodType === 'potato') {
      sBonus = 15;
      expBonus = 15;
      hBonus = 40;
      itemLabel = 'Golden Sweet Potato Chew 🍠';
    }

    showNotification(`Consumed ${itemLabel}! (+${expBonus} XP)`, 'success');

    setInventory(prev => ({
      ...prev,
      [foodType]: prev[foodType] - 1
    }));

    setPet(prev => {
      const nextHunger = Math.min(100, prev.hunger + sBonus);
      const nextHappiness = Math.min(100, prev.happiness + hBonus);
      const newExp = prev.exp + expBonus;
      let nextLvl = prev.level;
      let leveledUp = false;

      const costToLevel = 100;
      if (newExp >= costToLevel) {
        nextLvl = prev.level + 1;
        leveledUp = true;
      }

      const nextExpPercent = newExp % costToLevel;

      if (leveledUp) {
        setTimeout(() => {
          playRetroBeep('level', isMuted);
          setActivePose('excited');
          showNotification(`🎉 LEVEL UP! ${prev.name} grew to Level ${nextLvl}!`, 'success');
        }, 1500);
      }

      return {
        ...prev,
        level: nextLvl,
        exp: leveledUp ? nextExpPercent : newExp,
        hunger: nextHunger,
        happiness: nextHappiness
      };
    });

    setTimeout(() => {
      setActivePose(prev => prev === 'eating' ? 'idle' : prev);
    }, 2000);
  };

  const handlePet = () => {
    setActivePose('pet');
    playRetroBeep('pet', isMuted);

    // Create glowing pink heart elements
    const newHearts = Array.from({ length: 6 }).map((_, i) => ({
      id: Date.now() + i,
      x: 60 + Math.random() * 80,
      y: 40 + Math.random() * 40
    }));
    setHeartParticles(newHearts);
    setTimeout(() => setHeartParticles([]), 2000);

    showNotification(`Petted ${pet.name}! (+20 Happiness)`, 'success');

    setPet(prev => ({
      ...prev,
      happiness: Math.min(100, prev.happiness + 20),
      energy: Math.min(100, prev.energy + 5)
    }));

    setTimeout(() => {
      setActivePose(prev => prev === 'pet' ? 'idle' : prev);
    }, 2000);
  };

  const handleExerciseTogether = () => {
    if (pet.energy < 25) {
      showNotification('Too exhausted for training drills! Activate Rest Mode first.', 'error');
      playRetroBeep('click', isMuted);
      return;
    }

    setActivePose('workout');
    playRetroBeep('exercise', isMuted);
    showNotification(`Running Sprint Agility drills with ${pet.name}!`, 'info');

    setTimeout(() => {
      setPet(prev => {
        const costToLevel = 100;
        const newExp = prev.exp + 25;
        let nextLvl = prev.level;
        let leveledUp = false;

        if (newExp >= costToLevel) {
          nextLvl = prev.level + 1;
          leveledUp = true;
        }

        if (leveledUp) {
          setTimeout(() => {
            playRetroBeep('level', isMuted);
            setActivePose('excited');
            showNotification(`🎉 LEVEL UP! ${prev.name} reached Level ${nextLvl}!`, 'success');
          }, 1000);
        }

        return {
          ...prev,
          level: nextLvl,
          exp: leveledUp ? (newExp % costToLevel) : newExp,
          energy: Math.max(0, prev.energy - 25),
          happiness: Math.min(100, prev.happiness + 15)
        };
      });

      showNotification('Sprint Agility drill completed! (+25 EXP)', 'success');
      setActivePose(prev => prev === 'workout' ? 'idle' : prev);
    }, 3000);
  };

  const handleSleep = () => {
    if (activePose === 'sleeping') {
      // Wake up
      setActivePose('idle');
      playRetroBeep('click', isMuted);
      showNotification(`${pet.name} woke up! Rest cycle complete.`, 'info');
      return;
    }

    setActivePose('sleeping');
    playRetroBeep('sleep', isMuted);
    showNotification(`${pet.name} went to sleep... restoring energy.`, 'info');

    // Gradually restore energy in sleeping state
    const interval = setInterval(() => {
      setActivePose(p => {
        if (p !== 'sleeping') {
          clearInterval(interval);
          return p;
        }
        setPet(prev => {
          const finishedFull = prev.energy >= 100;
          if (finishedFull) {
            clearInterval(interval);
            setTimeout(() => {
              setActivePose('idle');
              showNotification('Rest cycle complete! Energy fully charged. 🔋', 'success');
            }, 500);
          }
          return {
            ...prev,
            energy: Math.min(100, prev.energy + 10)
          };
        });
        return p;
      });
    }, 4000);
  };

  const saveName = () => {
    if (!editedName.trim()) return;
    setPet(prev => ({ ...prev, name: editedName.trim() }));
    setNameEditing(false);
    playRetroBeep('click', isMuted);
    showNotification(`Companion name set to ${editedName.trim()}!`, 'success');
  };

  // Re-fill inventory quickly for testing or when completely stuck
  const devTopUp = () => {
    setInventory({
      kibble: 10,
      protein: 5,
      elixir: 2,
      potato: 5
    });
    playRetroBeep('level', isMuted);
    showNotification('Developer test pantry items dropped! 🍖🦘', 'info');
  };

  return (
    <div className={`p-6 max-w-4xl mx-auto ${
      primaryColorTheme === '8bit-gameboy' 
        ? 'font-mono text-[#0f380f]' 
        : 'font-sans text-slate-800'
    }`} id="trimagotchi-workspace">
      
      {/* HEADER SECTION WITH RETRO VIBE */}
      <div className="flex items-center justify-between border-b pb-4 border-slate-100 mb-6 gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center space-x-2">
            <span>🐾 Trimagotchi Playroom</span>
          </h1>
        </div>

        <div className="flex items-center space-x-2">
          {/* MUTE CONTROLLERS */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 border border-slate-150 hover:bg-slate-50 transition rounded-xl"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-slate-700" />}
          </button>

          {/* Dev support topup */}
          <button
            onClick={devTopUp}
            className="text-[10px] font-mono font-bold border border-dashed border-slate-200 hover:bg-slate-50 rounded-xl px-2.5 py-1.5 text-slate-500 hover:text-slate-700 transition cursor-pointer select-none"
            title="Top-up test kibbles"
          >
            🍖 Top-Up
          </button>
        </div>
      </div>

      {/* CORE SPLIT SCREEN */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: THE PET SIMULATOR HUB */}
        <div className="lg:col-span-7 flex flex-col items-center">
          
          {/* MASCOT DISPLAY BOX */}
          <div className={`relative w-full max-w-md aspect-square border-4 flex flex-col justify-between overflow-hidden shadow-2xl p-6 ${
            primaryColorTheme === '8bit-gameboy'
              ? 'bg-[#9bbc0f] border-[#0f380f] pixel-border'
              : 'bg-gradient-to-b from-amber-50/20 via-orange-50/10 to-red-50/20 border-slate-900 rounded-[2.5rem]'
          }`} id="trimagotchi-viewport">
            
            {/* Scanlines layer for GameBoy styling */}
            {primaryColorTheme === '8bit-gameboy' && <div className="absolute inset-0 scanlines-overlay pointer-events-none opacity-40 z-10" />}

            {/* Environmental decors (like sun, clouds or bedroom) */}
            <div className="absolute inset-x-6 top-6 flex justify-between items-start z-0">
              {/* Left tag: Level and Name */}
              <div className="flex flex-col text-left">
                {nameEditing ? (
                  <div className="flex items-center space-x-1.5 bg-white/70 backdrop-blur-xs p-1 rounded-lg border border-slate-300">
                    <input
                      type="text"
                      className="text-xs font-bold font-mono px-1 w-24 outline-none text-slate-900"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      maxLength={10}
                    />
                    <button onClick={saveName} className="p-0.5 text-emerald-600 hover:bg-emerald-50 rounded">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1.5">
                    <h2 className="text-sm font-black font-mono tracking-tight uppercase">
                      🐕 {pet.name}
                    </h2>
                    <button 
                      onClick={() => {
                        setEditedName(pet.name);
                        setNameEditing(true);
                      }} 
                      className="p-1 hover:bg-black/5 rounded-full transition"
                      title="Name pet"
                    >
                      <Edit2 className="w-3 h-3 text-slate-500" />
                    </button>
                  </div>
                )}
                <span className="text-[10px] font-mono uppercase tracking-widest font-extrabold text-slate-450 mt-0.5">
                  Age: {pet.level <= 2 ? '🍼 Kelpie Pup' : pet.level <= 4 ? '🎒 Teen Agility' : '👑 Agility Champion'} (Lv {pet.level})
                </span>
              </div>

              {/* Right Tag: Ambient Decor state representation */}
              <div className="text-right">
                {activePose === 'sleeping' ? (
                  <span className="text-lg">🌙 💤</span>
                ) : activePose === 'workout' ? (
                  <span className="text-lg animate-spin">⚡ 🏋️</span>
                ) : activePose === 'eating' ? (
                  <span className="text-lg">🍔 Crumbs!</span>
                ) : (
                  <span className="text-lg">☀️ Sunny Day</span>
                )}
              </div>
            </div>

            {/* FLOATING ACTION NOTIFICATION BANNER */}
            <AnimatePresence>
              {notification && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className={`absolute top-20 left-6 right-6 z-20 p-2.5 rounded-2xl border text-xs text-center font-bold shadow-md flex items-center justify-center space-x-1.5 transition ${
                    notification.type === 'error'
                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                      : notification.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                  }`}
                >
                  <span>{notification.type === 'error' ? '⚠️' : notification.type === 'success' ? '✨' : '🐾'}</span>
                  <span>{notification.message}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* SVG GORGEOUS INTERACTIVE ANOMATION KELPIE AREA */}
            <div className="flex-1 w-full flex items-center justify-center relative my-4 min-h-[160px] z-0">
              
              {/* Petting heart sparkles overlay */}
              <AnimatePresence>
                {heartParticles.map((pt) => (
                  <motion.div
                    key={pt.id}
                    initial={{ opacity: 0, scale: 0.5, y: 0 }}
                    animate={{ opacity: 1, scale: [0.5, 1.2, 1], y: -50 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                    className="absolute text-xl pointer-events-none select-none z-20"
                    style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
                  >
                    💖
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Food crumb particles overlay */}
              <AnimatePresence>
                {crumbParticles.map((pt) => (
                  <motion.div
                    key={pt.id}
                    initial={{ opacity: 1, scale: 1, y: 0 }}
                    animate={{ 
                      opacity: [1, 0.8, 0], 
                      y: 35 + Math.random() * 20, 
                      x: Math.random() * 40 - 20, 
                      rotate: pt.rotate 
                    }}
                    transition={{ duration: 1.2 }}
                    className="absolute text-xs pointer-events-none select-none z-20 text-amber-800"
                    style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
                  >
                    🟫
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Sleeping Zzz text bubbles */}
              {activePose === 'sleeping' && (
                <div className="absolute right-12 top-6 flex flex-col space-y-1 select-none font-mono pointer-events-none text-emerald-800">
                  <motion.span animate={{ y: [0, -15, 0], opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="text-lg font-bold">Z</motion.span>
                  <motion.span animate={{ y: [0, -20, 0], opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 2, delay: 0.6 }} className="text-sm font-bold ml-3">z</motion.span>
                  <motion.span animate={{ y: [0, -12, 0], opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 2, delay: 1.2 }} className="text-xs font-bold ml-6">z</motion.span>
                </div>
              )}

              {/* Champion Aura Sparkles */}
              {pet.level >= 5 && activePose !== 'sleeping' && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-48 h-48 rounded-full border border-yellow-400/20 animate-ping absolute bg-yellow-400/5" />
                  <motion.div 
                    animate={{ rotate: 360 }} 
                    transition={{ repeat: Infinity, duration: 20, ease: 'linear' }}
                    className="w-44 h-44 absolute text-yellow-500/20 border-2 border-dashed border-yellow-400/30 rounded-full"
                  />
                </div>
              )}

              {/* MAIN RED KELPIE PUP SVG */}
              <motion.svg 
                viewBox="0 0 200 200" 
                className="w-48 h-48 cursor-pointer select-none"
                onClick={handlePet}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                animate={
                  activePose === 'eating' 
                    ? { y: [0, 6, 0, 6, 0] } 
                    : activePose === 'workout' 
                      ? { y: [0, -12, 0, -12, 0], x: [-5, 5, -5, 5, 0] } 
                      : activePose === 'sleeping'
                        ? { scale: [1, 0.98, 1], y: [0, 1, 0] }
                        : activePose === 'excited'
                          ? { y: [0, -18, 0, -18, 0], scaleY: [1, 0.85, 1.1, 0.9, 1] }
                          : { y: [0, -2, 0] } // idle gentle breath
                }
                transition={
                  activePose === 'sleeping' 
                    ? { repeat: Infinity, duration: 3.5, ease: 'easeInOut' }
                    : activePose === 'eating'
                      ? { duration: 1.5 }
                      : activePose === 'workout'
                        ? { duration: 2, repeat: Infinity }
                        : activePose === 'excited'
                          ? { duration: 1.2 }
                          : { repeat: Infinity, duration: 2.2, ease: 'easeInOut' }
                }
              >
                {/* SVG DEFINITIONS & GRADIENTS */}
                <defs>
                  {/* Fur coat color - Kelpie chocolate/red or Wolf silver-grey */}
                  <linearGradient id="kelpieRed" x1="0%" y1="0%" x2="100%" y2="100%">
                    {pet.tickedWeeksCount !== undefined && pet.tickedWeeksCount >= 4 ? (
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
                  {/* Accent tan colors or ice-white */}
                  <linearGradient id="kelpieTan" x1="0%" y1="0%" x2="0%" y2="100%">
                    {pet.tickedWeeksCount !== undefined && pet.tickedWeeksCount >= 4 ? (
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
                  {/* Eye shiny deep brown or wolf gold eyes */}
                  <linearGradient id="kelpieEye" x1="0%" y1="0%" x2="0%" y2="100%">
                    {pet.tickedWeeksCount !== undefined && pet.tickedWeeksCount >= 4 ? (
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

                {/* --- 1. COZY TAIL --- */}
                <motion.path
                  d="M 62 148 Q 40 156 42 138 Q 45 125 55 132 C 58 135, 60 142, 62 148 Z"
                  fill="url(#kelpieRed)"
                  style={{ originX: '62px', originY: '148px' }}
                  animate={
                    activePose === 'sleeping'
                      ? { rotate: [0, 3, 0] }
                      : activePose === 'excited' || activePose === 'pet'
                        ? { rotate: [-20, 25, -20, 25, -20] }
                        : { rotate: [-5, 8, -5] } // default happy idle wag
                  }
                  transition={{ 
                    repeat: Infinity, 
                    duration: activePose === 'excited' ? 0.3 : 1.8, 
                    ease: 'easeInOut' 
                  }}
                />
                {/* Tan tip of tail */}
                <motion.path
                  d="M 42 138 Q 45 125 55 132 C 52 134, 48 136, 42 138 Z"
                  fill="url(#kelpieTan)"
                  style={{ originX: '62px', originY: '148px' }}
                  animate={
                    activePose === 'sleeping'
                      ? { rotate: [0, 3, 0] }
                      : activePose === 'excited' || activePose === 'pet'
                        ? { rotate: [-20, 25, -20, 25, -20] }
                        : { rotate: [-5, 8, -5] }
                  }
                  transition={{ 
                    repeat: Infinity, 
                    duration: activePose === 'excited' ? 0.3 : 1.8, 
                    ease: 'easeInOut' 
                  }}
                />

                {/* --- 2. BACK LEGS / BULK --- */}
                <ellipse cx="78" cy="154" rx="14" ry="10" fill="#58271a" />
                <ellipse cx="122" cy="154" rx="14" ry="10" fill="#58271a" />

                {/* --- 3. SEATED BODY AND CHEST --- */}
                {/* Main Torso (compact/chubby) */}
                <path
                  d="M 70 110 C 70 95, 130 95, 130 110 C 130 135, 125 155, 115 155 C 110 155, 90 155, 85 155 C 75 155, 70 135, 70 110 Z"
                  fill="url(#kelpieRed)"
                />

                {/* Kawaii Creamy Tan Chest Shield */}
                <path
                  d="M 82 104 C 82 96, 118 96, 118 104 C 118 122, 110 134, 100 134 C 90 134, 82 122, 82 104 Z"
                  fill="url(#kelpieTan)"
                />
                <circle cx="100" cy="110" r="6" fill="#fff" opacity="0.15" />

                {/* --- 4. FRONT PAWS (closer together) --- */}
                {/* Left Paw */}
                <rect x="80" y="146" width="14" height="18" rx="7" fill="url(#kelpieRed)" />
                <rect x="80" y="156" width="14" height="8" rx="4" fill="url(#kelpieTan)" />
                {/* Paw digits */}
                <circle cx="84" cy="161" r="1.2" fill="#632e1f" />
                <circle cx="89" cy="161" r="1.2" fill="#632e1f" />
                <circle cx="94" cy="161" r="1.2" fill="#632e1f" />

                {/* Right Paw */}
                <motion.g
                  animate={activePose === 'excited' ? { y: [0, -10, 0] } : {}}
                  transition={{ repeat: Infinity, duration: 0.6 }}
                >
                  <rect x="106" y="146" width="14" height="18" rx="7" fill="url(#kelpieRed)" />
                  <rect x="106" y="156" width="14" height="8" rx="4" fill="url(#kelpieTan)" />
                  {/* Paw digits */}
                  <circle cx="110" cy="161" r="1.2" fill="#632e1f" />
                  <circle cx="115" cy="161" r="1.2" fill="#632e1f" />
                  <circle cx="120" cy="161" r="1.2" fill="#632e1f" />
                </motion.g>

                {/* --- 5. RED KELPIE HEAD (Slight bobble in idle - larger head for puppy look) --- */}
                <motion.g
                  style={{ originX: '100px', originY: '85px' }}
                  animate={
                    activePose === 'sleeping' 
                      ? { y: [0, 1.5, 0], rotate: [-2, 2, -2] }
                      : activePose === 'excited'
                        ? { rotate: [-5, 5, -5] }
                        : { y: [0, -1, 0] }
                  }
                  transition={{ repeat: Infinity, duration: activePose === 'sleeping' ? 3.5 : 2 }}
                >
                  
                  {/* EAR LEFT - Extra large perky-rounded baby ears! */}
                  <motion.g 
                    style={{ originX: '55px', originY: '60px' }}
                    animate={activePose === 'sleeping' ? { rotate: -10 } : activePose === 'excited' ? { rotate: [0, -8, 0] } : { rotate: [0, -4, 0] }}
                    transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
                  >
                    {/* Outer Ear with playful rounded curves */}
                    <path d="M 40 68 C 30 45, 45 15, 60 18 C 65 20, 70 40, 74 54 Z" fill="url(#kelpieRed)" />
                    {/* Inner ear */}
                    <path d="M 46 62 C 38 48, 48 26, 58 26 C 62 26, 65 42, 68 50 Z" fill="url(#kelpieTan)" />
                    {/* Ear inner shade */}
                    <path d="M 49 59 C 43 49, 49 33, 55 33 C 58 33, 60 43, 62 48 Z" fill="#b97c45" />
                  </motion.g>

                  {/* EAR RIGHT - Matching cute large ear */}
                  <motion.g 
                    style={{ originX: '145px', originY: '60px' }}
                    animate={activePose === 'sleeping' ? { rotate: 10 } : activePose === 'excited' ? { rotate: [0, 8, 0] } : { rotate: [0, 4, 0] }}
                    transition={{ repeat: Infinity, duration: 4.2, ease: 'easeInOut', delay: 0.3 }}
                  >
                    {/* Outer Ear */}
                    <path d="M 160 68 C 170 45, 155 15, 140 18 C 135 20, 130 40, 126 54 Z" fill="url(#kelpieRed)" />
                    {/* Inner ear */}
                    <path d="M 154 62 C 162 48, 152 26, 142 26 C 138 26, 135 42, 132 50 Z" fill="url(#kelpieTan)" />
                    {/* Ear inner shade */}
                    <path d="M 151 59 C 157 49, 151 33, 145 33 C 142 33, 140 43, 138 48 Z" fill="#b97c45" />
                  </motion.g>

                  {/* MAIN FACE CIRCLE (Pudgy round puppy cheeks) */}
                  <ellipse cx="100" cy="80" rx="48" ry="42" fill="url(#kelpieRed)" />

                  {/* TAN EYEBROW SPOTS - Signature baby Kelpie points */}
                  <motion.ellipse 
                    cx="74" cy="56" rx="7" ry="4" fill="url(#kelpieTan)" 
                    animate={activePose === 'pet' ? { y: 2 } : activePose === 'workout' ? { rotate: 12 } : { y: 0 }}
                  />
                  <motion.ellipse 
                    cx="126" cy="56" rx="7" ry="4" fill="url(#kelpieTan)" 
                    animate={activePose === 'pet' ? { y: 2 } : activePose === 'workout' ? { rotate: -12 } : { y: 0 }}
                  />

                  {/* --- 6. GLOWING KAWAII ANIME EYES (Extra large puppy eyes) --- */}
                  {/* Left Eye */}
                  <g>
                    {activePose === 'sleeping' ? (
                      // Snoring sleepy eyes
                      <path d="M 64 78 L 78 78" stroke="#482218" strokeWidth="3" strokeLinecap="round" />
                    ) : activePose === 'excited' || activePose === 'pet' || activePose === 'eating' ? (
                      // Arched happy eyes
                      <path d="M 64 80 Q 72 68 80 80" stroke="#482218" strokeWidth="4" fill="none" strokeLinecap="round" />
                    ) : (
                      // Super glass-glossy infant puppy eyes
                      <>
                        <ellipse cx="72" cy="78" rx="11" ry="12" fill="url(#kelpieEye)" />
                        {/* Shines */}
                        <circle cx="68" cy="74" r="4.5" fill="#ffffff" />
                        <circle cx="76" cy="82" r="2.2" fill="#ffffff" />
                      </>
                    )}
                  </g>

                  {/* Right Eye */}
                  <g>
                    {activePose === 'sleeping' ? (
                      // Snoring sleepy eyes
                      <path d="M 122 78 L 136 78" stroke="#482218" strokeWidth="3" strokeLinecap="round" />
                    ) : activePose === 'excited' || activePose === 'pet' || activePose === 'eating' ? (
                      // Arched happy eyes
                      <path d="M 120 80 Q 128 68 136 80" stroke="#482218" strokeWidth="4" fill="none" strokeLinecap="round" />
                    ) : (
                      // Super glass-glossy infant puppy eyes
                      <>
                        <ellipse cx="128" cy="78" rx="11" ry="12" fill="url(#kelpieEye)" />
                        {/* Shines */}
                        <circle cx="124" cy="74" r="4.5" fill="#ffffff" />
                        <circle cx="132" cy="82" r="2.2" fill="#ffffff" />
                      </>
                    )}
                  </g>

                  {/* --- 7. ADORABLE TAN KELPIE MUZZLE (Smaller & rounder snout) --- */}
                  <path d="M 82 86 C 82 78, 118 78, 118 86 C 118 96, 110 103, 100 103 C 90 103, 82 96, 82 86 Z" fill="url(#kelpieTan)" />

                  {/* Tiny glossy button nose */}
                  <ellipse cx="100" cy="83" rx="5.5" ry="3.5" fill="#2d1007" />
                  <circle cx="98.2" cy="81.5" r="1.2" fill="#fff" opacity="0.75" />

                  {/* Tiny puppy smile */}
                  {activePose === 'eating' ? (
                    // Chomping mouth
                    <path d="M 96 90 Q 100 100 104 90" fill="#721111" stroke="#2d1007" strokeWidth="1.5" />
                  ) : (
                    <path d="M 92 90 Q 96 94 100 90 Q 104 94 108 90" stroke="#411b0f" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                  )}

                  {/* Extra cute blush cheeks */}
                  {activePose !== 'sleeping' && (
                    <>
                      <circle cx="58" cy="84" r="8" fill="#ff4d4d" opacity="0.3" />
                      <circle cx="142" cy="84" r="8" fill="#ff4d4d" opacity="0.3" />
                    </>
                  )}

                  {/* --- ACCESSORY: BANDANA OR TIER MEDAL (LEVEL BASED) --- */}
                  {pet.level >= 3 && pet.level <= 4 && (
                    <g>
                      <path d="M 72 106 Q 100 118 128 106" stroke="#ef4444" strokeWidth="6" strokeLinecap="round" fill="none" />
                      <path d="M 95 111 L 105 111 L 100 125 Z" fill="#dc2626" />
                      <circle cx="100" cy="116" r="1.5" fill="#fff" />
                    </g>
                  )}

                  {pet.level >= 5 && (
                    <g>
                      <path d="M 68 59 Q 100 52 132 59" stroke="#eab308" strokeWidth="7" fill="none" strokeLinecap="round" />
                      <path d="M 70 59 Q 100 52 130 59" stroke="#ca8a04" strokeWidth="2" fill="none" />
                      <polygon points="100,43 103,49 110,50 105,55 106,62 100,58 94,62 95,55 90,50 97,49" fill="#fff" />
                    </g>
                  )}

                </motion.g>

                {/* Gym dumbell active element popping up side of pup */}
                {activePose === 'workout' && (
                  <motion.g animate={{ y: [0, -25, 0], rotate: [0, 45, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                    <rect x="135" y="110" width="22" height="6" rx="2" fill="#475569" />
                    <circle cx="135" cy="113" r="6" fill="#1e293b" />
                    <circle cx="157" cy="113" r="6" fill="#1e293b" />
                  </motion.g>
                )}

              </motion.svg>
            </div>

            {/* PUP HUD / PROGRESS METERS (Inside visor) */}
            <div className={`mt-auto border-t pt-3 flex justify-between items-center ${
              primaryColorTheme === '8bit-gameboy' ? 'border-[#0f380f]/40' : 'border-slate-200/50'
            }`}>
              
              {/* LEVEL IN HUD */}
              <div className="flex items-center space-x-1">
                <span className="text-xs">🏆</span>
                <span className="text-xs font-mono font-black uppercase tracking-tight">
                  Lvl {pet.level}
                </span>
              </div>

              {/* EXP BAR */}
              <div className="flex-1 max-w-[140px] h-2 border rounded-full overflow-hidden mx-3 bg-black/10 border-black/20">
                <div 
                  className="h-full bg-yellow-500 transition-all duration-500"
                  style={{ width: `${pet.exp}%` }}
                />
              </div>

              {/* EXP TEXT */}
              <span className="text-[10px] font-mono text-slate-450 font-bold shrink-0">
                {pet.exp}/100 XP
              </span>

            </div>

          </div>

          {/* EASY QUICK-FEED PANTRY BAR (Beneath the kelpie screen) */}
          <div className="w-full max-w-md p-4 border rounded-[1.5rem] mt-4 text-left bg-emerald-50/25 border-emerald-100 shadow-sm flex flex-col gap-2.5">
            <p className="text-[11px] font-black uppercase tracking-widest text-emerald-805 flex justify-between items-center">
              <span>🍗 Instant Feeding Pantry (Click to Feed)</span>
              <span className="bg-emerald-100 text-emerald-850 px-1.5 py-0.5 rounded text-[9px] font-bold">Earned from workouts</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              {/* Kibble */}
              <button
                type="button"
                disabled={inventory.kibble <= 0}
                onClick={() => handleFeed('kibble')}
                className={`p-2 border text-[11.5px] font-extrabold tracking-tight rounded-xl flex items-center justify-between transition ${
                  inventory.kibble <= 0
                    ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed opacity-60'
                    : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-emerald-500 cursor-pointer active:translate-y-0.5'
                }`}
              >
                <span className="truncate">🦘 Kibbles (x{inventory.kibble})</span>
                <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 px-1 text-right font-black shrink-0">+20H</span>
              </button>

              {/* Protein Rawhide */}
              <button
                type="button"
                disabled={inventory.protein <= 0}
                onClick={() => handleFeed('protein')}
                className={`p-2 border text-[11.5px] font-extrabold tracking-tight rounded-xl flex items-center justify-between transition ${
                  inventory.protein <= 0
                    ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed opacity-60'
                    : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-emerald-500 cursor-pointer active:translate-y-0.5'
                }`}
              >
                <span className="truncate">🍖 Rawhide (x{inventory.protein})</span>
                <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 px-1 text-right font-black shrink-0">+45H</span>
              </button>

              {/* Sweet Potato */}
              <button
                type="button"
                disabled={inventory.potato <= 0}
                onClick={() => handleFeed('potato')}
                className={`p-2 border text-[11.5px] font-extrabold tracking-tight rounded-xl flex items-center justify-between transition ${
                  inventory.potato <= 0
                    ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed opacity-60'
                    : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-emerald-500 cursor-pointer active:translate-y-0.5'
                }`}
              >
                <span className="truncate">🍠 Potato Chew (x{inventory.potato})</span>
                <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 px-1 text-right font-black shrink-0">+15H</span>
              </button>

              {/* Elixir */}
              <button
                type="button"
                disabled={inventory.elixir <= 0}
                onClick={() => handleFeed('elixir')}
                className={`p-2 border text-[11.5px] font-extrabold tracking-tight rounded-xl flex items-center justify-between transition ${
                  inventory.elixir <= 0
                    ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed opacity-60'
                    : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-emerald-500 cursor-pointer active:translate-y-0.5'
                }`}
              >
                <span className="truncate">⚡ Elixir (x{inventory.elixir})</span>
                <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 px-1 text-right font-black shrink-0">+35H</span>
              </button>
            </div>
          </div>

          {/* ACTIONABLE ITEMS BUTTON GRID */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full max-w-md mt-3">
            {/* Play/Pet button */}
            <button
              type="button"
              onClick={handlePet}
              className="py-2.5 px-3 bg-red-550 hover:bg-red-600 active:scale-95 text-white font-black text-xs rounded-xl shadow-xs transition flex flex-col items-center justify-center gap-1 cursor-pointer select-none"
            >
              <span className="text-lg">❤️</span>
              <span>Pet / Play</span>
            </button>

            {/* Rest/Sleep button */}
            <button
              type="button"
              onClick={handleSleep}
              className={`py-2.5 px-3 ${
                activePose === 'sleeping' ? 'bg-sky-655' : 'bg-sky-500 hover:bg-sky-600'
              } active:scale-95 text-white font-black text-xs rounded-xl shadow-xs transition flex flex-col items-center justify-center gap-1 cursor-pointer select-none`}
            >
              <span className="text-lg">{activePose === 'sleeping' ? '⏰' : '🛌'}</span>
              <span>{activePose === 'sleeping' ? 'Wake Up' : 'Rest/Sleep'}</span>
            </button>

            {/* Agility training button */}
            <button
              type="button"
              onClick={handleExerciseTogether}
              className="py-2.5 px-3 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-black text-xs rounded-xl shadow-xs transition flex flex-col items-center justify-center gap-1 cursor-pointer select-none"
            >
              <span className="text-lg">🏃</span>
              <span>Sprint Drills</span>
            </button>

            {/* Progress/Tick Week button */}
            <button
              type="button"
              onClick={() => {
                setPet(prev => {
                  const currentCount = prev.tickedWeeksCount || 0;
                  const nextCount = Math.min(4, currentCount + 1);
                  const nextLvl = prev.level + 1;
                  playRetroBeep('level', isMuted);
                  if (nextCount === 4) {
                    showNotification(`✨ EVOLUTION ACHIEVED! ${prev.name} evolved into a Wolf Pup! 🐺`, 'success');
                    setActivePose('excited');
                  } else {
                    showNotification(`📅 Week routine ticked! (+1 Week Growth)`, 'success');
                    setActivePose('excited');
                  }
                  return {
                    ...prev,
                    tickedWeeksCount: nextCount,
                    level: nextLvl,
                    exp: 0
                  };
                });
              }}
              className="py-2.5 px-3 bg-purple-650 hover:bg-purple-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-xs transition flex flex-col items-center justify-center gap-1 cursor-pointer select-none"
            >
              <span className="text-lg">📅</span>
              <span>Tick Week</span>
            </button>
          </div>

          {/* ENERGY BARS & STATUS METERS (Classic Tamagotchi dashboard) */}
          <div className="w-full max-w-md p-5 border rounded-[1.8rem] bg-white border-slate-200 shadow-sm text-left mt-3">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b pb-2 mb-3.5 flex justify-between items-center">
              <span>📊 TAMAGOTCHI STATUS METERS</span>
              <span className="font-mono text-purple-600 font-extrabold text-[9px]">COMPANION PROGRESS</span>
            </h3>

            <div className="space-y-3.5">
              {/* CURRENT AGE STATE */}
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <span>🐕 Evolution Age:</span>
                </span>
                <span className="font-mono font-black text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full text-[10px] uppercase">
                  {pet.tickedWeeksCount !== undefined && pet.tickedWeeksCount >= 4 
                    ? '🐺 Majestic Wolf Pup!' 
                    : pet.level <= 2 
                      ? '🍼 Kelpie Pup' 
                      : pet.level <= 4 
                        ? '🎒 Teen Agility' 
                        : '👑 Agility Champion'}
                </span>
              </div>

              {/* HUNGER METER */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[11px] font-bold">
                  <span className="text-slate-500">🍖 Hunger (Pantry Fullness)</span>
                  <span className={`font-mono font-black ${pet.hunger < 35 ? 'text-amber-600 animate-pulse' : 'text-slate-800'}`}>
                    {pet.hunger}% {pet.hunger < 35 ? '🌭 Famished' : '🍗 Full'}
                  </span>
                </div>
                <div className="h-3 w-full bg-slate-50 border border-slate-200 rounded-full overflow-hidden p-0.5">
                  <div 
                    className={`h-full transition-all duration-300 rounded-full ${
                      pet.hunger < 35 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${pet.hunger}%` }}
                  />
                </div>
              </div>

              {/* HAPPINESS METER */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[11px] font-bold">
                  <span className="text-slate-500">❤️ Happiness (Loyalty)</span>
                  <span className="font-mono font-black text-slate-855">
                    {pet.happiness}% {pet.happiness > 80 ? '💖 Ecstatic' : pet.happiness < 40 ? '💔 Lonely' : '🙂 Content'}
                  </span>
                </div>
                <div className="h-3 w-full bg-slate-50 border border-slate-200 rounded-full overflow-hidden p-0.5">
                  <div 
                    className="h-full transition-all duration-300 rounded-full bg-red-500"
                    style={{ width: `${pet.happiness}%` }}
                  />
                </div>
              </div>

              {/* ENERGY METER */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[11px] font-bold">
                  <span className="text-slate-500">⚡ Energy</span>
                  <span className="font-mono font-black text-slate-855">
                    {pet.energy}% {pet.energy < 25 ? '😴 Sleepy' : '🔋 Energetic'}
                  </span>
                </div>
                <div className="h-3 w-full bg-slate-50 border border-slate-200 rounded-full overflow-hidden p-0.5">
                  <div 
                    className="h-full transition-all duration-300 rounded-full bg-sky-500"
                    style={{ width: `${pet.energy}%` }}
                  />
                </div>
              </div>

              {/* WEEKLY ROUTINES TICK TRACKER */}
              <div className="pt-2.5 border-t border-dashed border-slate-150">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-purple-700 font-extrabold">📅 Weekly Routine Ticks:</span>
                  <span className="font-mono font-black text-purple-800">{(pet.tickedWeeksCount || 0)} / 4 Weeks</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 mt-2">
                  {Array.from({ length: 4 }).map((_, i) => {
                    const active = (pet.tickedWeeksCount || 0) > i;
                    return (
                      <div key={i} className={`h-6.5 rounded-lg flex items-center justify-center text-[9px] font-black uppercase text-white shadow-3xs ${
                        active ? 'bg-purple-600 animate-pulse' : 'bg-slate-100 text-slate-400 border border-slate-200'
                      }`}>
                        {active ? '✓' : `W${i+1}`}
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10.5px] text-slate-400 leading-relaxed italic mt-2.5">
                  💡 Complete exercises or tick routines inside programs weekly to evolve {pet.name} into a rare grey Wolf Pup!
                </p>
              </div>

            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: TRAINING INSTRUCTIONS AND TRIVIA */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* TIPS AND EVOLUTION GUIDE */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs text-left">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b pb-2 mb-4 border-slate-150 flex items-center space-x-1.5">
              <span>✨ Companion Trainer Handbook</span>
            </h3>
            
            <div className="space-y-4 text-xs text-slate-600 leading-relaxed font-normal">
              <div>
                <h4 className="font-extrabold text-slate-800 mb-1">🍗 Feeding Your Companion</h4>
                <p>
                  Keep the hunger meter full by using kibbles, protein rawhide, or sweet potato chews. Hunger degrades slowly every minute.
                </p>
              </div>

              <div>
                <h4 className="font-extrabold text-slate-800 mb-1">⚡ Rest & Energy Rules</h4>
                <p>
                  Workout drills degrade energy by -25 per session. To restore energy, tap "Rest Mode" to put your pup to bed. They will restore +10% energy gradually.
                </p>
              </div>

              <div>
                <h4 className="font-extrabold text-slate-800 mb-1">🐺 Evolving into a Wolf Pup</h4>
                <p>
                  By completing weeks of routines (click "Tick Week" or check off weekly routine exercises from your training checklist), your Kelpie levels up, grows, and after 4 weeks of routines, evolves into a wolf pup with a stunning silver-grey coat and shining golden pupils!
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
