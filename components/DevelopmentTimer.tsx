
import React, { useState, useEffect, useRef } from 'react';
import { getDevelopmentRecipe, DevelopmentRecipe } from '../services/geminiService';

interface DevelopmentTimerProps {
  onClose: () => void;
}

type Recipe = DevelopmentRecipe;

const INITIAL_RECIPES: Recipe[] = [
  {
    id: 'bw-standard',
    name: 'B&W Standard',
    temp: '20°C',
    steps: [
      { name: '显影 (Dev)', duration: 360, color: 'text-green-500', description: '前30秒持续搅动，之后每分钟搅动10秒' },
      { name: '停显 (Stop)', duration: 60, color: 'text-yellow-500', description: '持续搅动' },
      { name: '定影 (Fix)', duration: 300, color: 'text-purple-500', description: '每分钟搅动10秒' },
      { name: '水洗 (Wash)', duration: 600, color: 'text-blue-500', description: '流动水冲洗' },
      { name: '去水渍 (Wetting)', duration: 60, color: 'text-pink-500', description: '浸泡，不要搅动' }
    ]
  },
  {
    id: 'c41-standard',
    name: 'C-41 Color',
    temp: '38°C',
    steps: [
      { name: '显影 (Dev)', duration: 195, color: 'text-red-500', description: '严格温控 38°C !' },
      { name: '漂定 (Blix)', duration: 390, color: 'text-orange-500', description: '漂白 + 定影' },
      { name: '水洗 (Wash)', duration: 180, color: 'text-blue-500', description: '温水冲洗' },
      { name: '稳定 (Stab)', duration: 60, color: 'text-pink-500', description: '浸泡，不要水洗' }
    ]
  }
];

export const DevelopmentTimer: React.FC<DevelopmentTimerProps> = ({ onClose }) => {
  const [activeRecipe, setActiveRecipe] = useState<Recipe>(INITIAL_RECIPES[0]);
  const [baseRecipe, setBaseRecipe] = useState<Recipe>(JSON.parse(JSON.stringify(INITIAL_RECIPES[0])));
  
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(activeRecipe.steps[0].duration);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [currentTemp, setCurrentTemp] = useState(20);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartRef = useRef<number | null>(null);

  // 手势返回处理
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartRef.current === null) return;
    const currentX = e.touches[0].clientX;
    const diffX = currentX - touchStartRef.current;
    // 从屏幕左侧边缘起步，向右滑动超过100px触发返回
    if (touchStartRef.current < 40 && diffX > 100) {
      onClose();
      touchStartRef.current = null;
    }
  };

  useEffect(() => {
    if (activeRecipe.id !== baseRecipe.id) {
        const t = parseInt(activeRecipe.temp) || 20;
        setCurrentTemp(t);
        setBaseRecipe(JSON.parse(JSON.stringify(activeRecipe)));
        setTimeLeft(activeRecipe.steps[0].duration);
        setCurrentStepIndex(0);
    }
  }, [activeRecipe.id]);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleStepComplete();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, timeLeft]);

  const handleStepComplete = () => {
    setIsRunning(false);
    if (currentStepIndex >= activeRecipe.steps.length - 1) {
      setIsFinished(true);
    }
  };

  const nextStep = () => {
    if (currentStepIndex < activeRecipe.steps.length - 1) {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      setTimeLeft(activeRecipe.steps[nextIndex].duration);
      setIsRunning(false);
    } else {
      setIsFinished(true);
    }
  };

  const prevStep = () => {
     if (currentStepIndex > 0) {
      const nextIndex = currentStepIndex - 1;
      setCurrentStepIndex(nextIndex);
      setTimeLeft(activeRecipe.steps[nextIndex].duration);
      setIsRunning(false);
    }
  };

  const resetStep = () => {
    setTimeLeft(activeRecipe.steps[currentStepIndex].duration);
    setIsRunning(false);
  };

  const toggleTimer = () => setIsRunning(!isRunning);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const adjustTemperature = (delta: number) => {
      const newTemp = currentTemp + delta;
      if (newTemp < 10 || newTemp > 50) return;

      setCurrentTemp(newTemp);
      const baseT = parseInt(baseRecipe.temp) || 20;
      const diff = newTemp - baseT;
      const factor = Math.pow(0.91, diff);

      const newSteps = baseRecipe.steps.map(step => {
          if (step.name.includes('Dev') || step.name.includes('显影')) {
              return { ...step, duration: Math.max(30, Math.round(step.duration * factor)) };
          }
          return step;
      });

      setActiveRecipe({ ...activeRecipe, temp: `${newTemp}°C`, steps: newSteps });
      if (!isRunning && (activeRecipe.steps[currentStepIndex].name.includes('Dev') || activeRecipe.steps[currentStepIndex].name.includes('显影'))) {
          setTimeLeft(newSteps[currentStepIndex].duration);
      }
  };

  const handleGenerateRecipe = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!prompt.trim()) return;
      setIsGenerating(true);
      const recipe = await getDevelopmentRecipe(prompt);
      if (recipe) {
          setActiveRecipe(recipe);
          setBaseRecipe(JSON.parse(JSON.stringify(recipe)));
          setCurrentStepIndex(0);
          setTimeLeft(recipe.steps[0].duration);
          setCurrentTemp(parseInt(recipe.temp) || 20);
          setIsRunning(false);
          setIsFinished(false);
          setIsSettingsOpen(false);
      } else {
          alert("无法生成配方，请重试或检查网络。");
      }
      setIsGenerating(false);
  };

  const currentStep = activeRecipe.steps[currentStepIndex];
  const getLiquidColor = (twClass: string) => {
      if (twClass.includes('green')) return 'bg-green-600';
      if (twClass.includes('yellow')) return 'bg-yellow-600';
      if (twClass.includes('purple')) return 'bg-purple-600';
      if (twClass.includes('blue')) return 'bg-blue-600';
      if (twClass.includes('red')) return 'bg-red-700';
      if (twClass.includes('orange')) return 'bg-orange-600';
      if (twClass.includes('pink')) return 'bg-pink-600';
      return 'bg-gray-600';
  };

  const currentLiquidColor = getLiquidColor(currentStep.color);
  const totalCycles = Math.ceil(currentStep.duration / 60);
  const currentCycle = Math.ceil((currentStep.duration - timeLeft) / 60) || 1;
  const isAgitationTime = (currentStep.duration - timeLeft) % 60 < 10 && isRunning; 

  return (
    <div 
      className="fixed inset-0 z-[100] bg-[#050505] text-gray-100 flex flex-col h-[100dvh] font-display overflow-hidden selection:bg-primary"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      <div className="absolute inset-0 bg-noise pointer-events-none z-0 mix-blend-overlay opacity-10"></div>
      
      {isSettingsOpen && (
        <div className="absolute inset-0 z-[120] bg-black/95 backdrop-blur-md flex flex-col p-6 pt-[calc(env(safe-area-inset-top)+2rem)] animate-fade-in">
           <div className="flex justify-between items-center mb-10">
               <h2 className="text-xl font-black uppercase tracking-widest">配方设置</h2>
               <button onClick={() => setIsSettingsOpen(false)} className="size-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all">
                   <span className="material-symbols-outlined">close</span>
               </button>
           </div>
           <div className="space-y-8 overflow-y-auto pb-24 no-scrollbar">
               <div>
                   <label className="block text-xs font-black text-primary uppercase tracking-[0.2em] mb-4">AI 智能配方生成</label>
                   <form onSubmit={handleGenerateRecipe} className="relative">
                       <input type="text" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="例如: Kodak Tri-X 400 迫冲到 1600..." className="w-full bg-[#111] border border-white/10 rounded-xl py-5 pl-5 pr-14 text-sm focus:border-primary outline-none transition-all shadow-inner" />
                       <button type="submit" disabled={isGenerating || !prompt} className="absolute right-3 top-1/2 -translate-y-1/2 size-10 flex items-center justify-center text-primary disabled:opacity-30">
                           {isGenerating ? <span className="material-symbols-outlined animate-spin">sync</span> : <span className="material-symbols-outlined text-3xl">arrow_circle_up</span>}
                       </button>
                   </form>
               </div>
               <div>
                   <label className="block text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-4">预设配方</label>
                   <div className="grid gap-3">
                       {INITIAL_RECIPES.map(recipe => (
                           <button key={recipe.id} onClick={() => { setActiveRecipe(recipe); setBaseRecipe(JSON.parse(JSON.stringify(recipe))); setCurrentStepIndex(0); setTimeLeft(recipe.steps[0].duration); setCurrentTemp(parseInt(recipe.temp) || 20); setIsRunning(false); setIsFinished(false); setIsSettingsOpen(false); }} className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${activeRecipe.id === recipe.id ? 'bg-primary/20 border-primary shadow-[0_0_20px_rgba(166,23,39,0.1)]' : 'bg-white/5 border-white/10 hover:border-white/20'}`}>
                               <div className="text-left">
                                 <div className={`font-bold uppercase tracking-wider ${activeRecipe.id === recipe.id ? 'text-primary' : 'text-white'}`}>{recipe.name}</div>
                                 <div className="text-[10px] opacity-40 mt-1 font-mono">{recipe.steps.length} 步骤</div>
                               </div>
                               <span className="text-xs font-black font-mono opacity-70">{recipe.temp}</span>
                           </button>
                       ))}
                   </div>
               </div>
           </div>
        </div>
      )}

      {/* 增强顶部栏安全区 */}
      <nav className="flex items-center justify-between px-6 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-4 z-10 relative shrink-0 bg-gradient-to-b from-[#050505] to-transparent">
        <button onClick={onClose} className="flex items-center justify-center size-12 -ml-2 rounded-full text-gray-300 hover:bg-white/10 active:scale-90 transition-all">
          <span className="material-symbols-outlined text-3xl">arrow_back</span>
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[9px] uppercase tracking-[0.4em] text-primary font-black mb-1 opacity-80">Process Control</span>
          <h1 className="text-xs font-black tracking-widest text-white uppercase">{activeRecipe.name}</h1>
        </div>
        <button onClick={() => setIsSettingsOpen(true)} className="flex items-center justify-center size-12 -mr-2 rounded-full text-gray-300 hover:bg-white/10 active:scale-90 transition-all">
          <span className="material-symbols-outlined text-3xl">tune</span>
        </button>
      </nav>

      <main className="flex-1 flex flex-col relative w-full max-w-md mx-auto px-6 z-10 justify-between min-h-0">
        <div className="flex flex-col items-center justify-center mt-2 shrink-0">
            <div className="group relative flex flex-col items-center">
                <span className="text-[10px] uppercase tracking-[0.3em] text-gray-500 font-black mb-2">Temp Target</span>
                <div className="flex items-center gap-6">
                    <button onClick={() => adjustTemperature(-1)} className="size-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center active:scale-90 transition-all hover:bg-white/10 shadow-lg"><span className="material-symbols-outlined text-xl">remove</span></button>
                    <div className="flex items-baseline gap-1 relative min-w-[120px] justify-center">
                        <span className="text-6xl font-mono font-black text-primary drop-shadow-[0_0_20px_rgba(166,23,39,0.5)]">{currentTemp.toFixed(1)}</span>
                        <span className="text-xl text-primary/70 font-black">°C</span>
                    </div>
                    <button onClick={() => adjustTemperature(1)} className="size-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center active:scale-90 transition-all hover:bg-white/10 shadow-lg"><span className="material-symbols-outlined text-xl">add</span></button>
                </div>
            </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center relative w-full min-h-0 overflow-hidden py-4">
            <div className="relative w-full h-full max-h-[38vh] min-h-[180px] flex items-center justify-center">
                 <div className="relative w-64 h-80 transform scale-75 sm:scale-100 origin-center transition-transform">
                     <div className="relative w-40 h-56 z-10 flex flex-col items-center mx-auto">
                        <div className="w-12 h-4 bg-[#1a1a1a] border border-gray-800 rounded-t-sm mb-[1px]"></div>
                        <div className="w-32 h-8 bg-[#1a1a1a] border border-gray-800 rounded-t-lg relative overflow-hidden shadow-lg"></div>
                        <div className="w-40 h-44 bg-[#1a1a1a]/90 border-x border-b border-gray-800 rounded-b-lg relative overflow-hidden backdrop-blur-sm shadow-2xl">
                            <div className="absolute bottom-0 left-0 w-full transition-all duration-[1000ms] ease-in-out h-3/4 flex items-end">
                                <div className={`w-full h-full opacity-30 ${currentLiquidColor} transition-colors duration-500`}></div>
                            </div>
                        </div>
                        <div className="absolute bottom-4 bg-black/60 px-3 py-1 rounded-full border border-gray-800">
                            <span className="text-[8px] uppercase tracking-[0.3em] text-gray-400 font-black">Submerged</span>
                        </div>
                     </div>
                 </div>
            </div>
            <div className="text-center space-y-2 min-h-[90px] shrink-0 mb-4 z-20">
                {isFinished ? (
                     <div className="animate-fade-in">
                        <h2 className="text-3xl font-black text-green-500 tracking-tighter uppercase">Success</h2>
                        <p className="text-[10px] text-gray-500 font-mono tracking-widest uppercase mt-1">Darkroom work finished</p>
                     </div>
                ) : (
                    <div className="animate-fade-in">
                        <h2 className={`text-3xl font-black tracking-tighter uppercase transition-colors duration-500 ${isAgitationTime ? 'text-primary animate-pulse' : 'text-white'}`}>
                            {isAgitationTime ? 'Agitate' : 'Resting'}
                        </h2>
                        <p className="text-[10px] text-gray-500 font-black tracking-[0.2em] uppercase mt-1">
                            Cycle {currentCycle} / {totalCycles} • {isAgitationTime ? 'Invert the tank' : 'Keep stable'}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-3 max-w-[240px] mx-auto leading-relaxed font-bold opacity-70 italic">{currentStep.description}</p>
                    </div>
                )}
            </div>
        </div>

        <div className="w-full space-y-8 shrink-0 bg-[#050505] pt-4 pb-12 z-20">
            <div className="w-full px-2">
                <div className="flex justify-between text-[8px] uppercase tracking-[0.2em] text-gray-600 mb-3 font-black">
                    {activeRecipe.steps.map((step, idx) => (<span key={idx} className={`transition-colors duration-500 ${idx === currentStepIndex ? 'text-primary' : ''}`}>{step.name.split(' ')[0]}</span>))}
                </div>
                <div className="h-1.5 w-full bg-gray-900 rounded-full overflow-hidden flex shadow-inner">
                     {activeRecipe.steps.map((step, idx) => {
                         let bgClass = 'bg-gray-800';
                         if (idx < currentStepIndex) bgClass = step.color.replace('text-', 'bg-') + '/40'; 
                         if (idx === currentStepIndex) bgClass = step.color.replace('text-', 'bg-');
                         return (<div key={idx} className={`h-full border-r border-black transition-all duration-700 ${bgClass}`} style={{ flex: 1 }}></div>);
                     })}
                </div>
                <div className="flex justify-between mt-3 font-mono">
                    <span className="text-3xl font-black text-white tabular-nums">{formatTime(timeLeft)}</span>
                    <span className="text-sm font-black text-white/30 self-end mb-1 tabular-nums">-{formatTime(activeRecipe.steps.reduce((acc, s, i) => i > currentStepIndex ? acc + s.duration : acc, 0))}</span>
                </div>
            </div>
            {!isFinished ? (
                <div className="flex items-center justify-between gap-5">
                    <button onClick={resetStep} className="size-14 rounded-2xl border border-white/5 bg-white/5 text-gray-400 flex items-center justify-center active:scale-90 transition-all hover:bg-white/10"><span className="material-symbols-outlined text-2xl">restart_alt</span></button>
                    <button onClick={toggleTimer} className="h-16 flex-1 rounded-2xl bg-primary border border-primary/20 flex items-center justify-center gap-4 text-white active:scale-[0.98] transition-all shadow-[0_8px_30px_rgba(166,23,39,0.3)]">
                        <span className={`material-symbols-outlined fill-1 text-3xl`}>{isRunning ? 'pause_circle' : 'play_circle'}</span>
                        <span className="font-black tracking-[0.2em] text-lg uppercase">{isRunning ? 'Pause' : 'Start'}</span>
                    </button>
                    <button onClick={nextStep} className="size-14 rounded-2xl border border-white/5 bg-white/5 text-gray-400 flex items-center justify-center active:scale-90 transition-all hover:bg-white/10"><span className="material-symbols-outlined text-2xl">skip_next</span></button>
                </div>
            ) : (
                <button onClick={onClose} className="w-full h-16 rounded-2xl bg-white text-black font-black text-lg uppercase tracking-widest animate-bounce shadow-2xl">Exit Lab</button>
            )}
        </div>
      </main>
    </div>
  );
};
