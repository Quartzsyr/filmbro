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
  const [baseRecipe, setBaseRecipe] = useState<Recipe>(JSON.parse(JSON.stringify(INITIAL_RECIPES[0]))); // Store original for recalc
  
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(activeRecipe.steps[0].duration);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Temperature State
  const [currentTemp, setCurrentTemp] = useState(20);

  // AI Feature States
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize Base Recipe and Temp when activeRecipe ID changes externally (e.g. from preset selection)
  useEffect(() => {
    // Check if we switched to a new recipe ID entirely (not just a temp update)
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
    if (currentStepIndex < activeRecipe.steps.length - 1) {
       // Auto-pause between steps
    } else {
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
      if (newTemp < 10 || newTemp > 50) return; // Safety limits

      setCurrentTemp(newTemp);

      // Temperature Compensation Logic
      // Standard approximation: +1°C = -9% time (factor 0.91)
      const baseT = parseInt(baseRecipe.temp) || 20;
      const diff = newTemp - baseT;
      const factor = Math.pow(0.91, diff);

      const newSteps = baseRecipe.steps.map(step => {
          // Only adjust "Developer" steps
          if (step.name.includes('Dev') || step.name.includes('显影')) {
              return {
                  ...step,
                  duration: Math.max(30, Math.round(step.duration * factor)) // Min 30s
              };
          }
          return step;
      });

      // Update active recipe
      const newRecipe = {
          ...activeRecipe,
          temp: `${newTemp}°C`,
          steps: newSteps
      };
      setActiveRecipe(newRecipe);

      // If we are currently on the Dev step and NOT running, update the display time immediately
      if (!isRunning) {
          const currentStepName = activeRecipe.steps[currentStepIndex].name;
          if (currentStepName.includes('Dev') || currentStepName.includes('显影')) {
               // Find the new duration for the *current* step index
               // We must map indices correctly, assuming order hasn't changed
               setTimeLeft(newSteps[currentStepIndex].duration);
          }
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
    <div className="fixed inset-0 z-[60] bg-[#050505] text-gray-100 flex flex-col h-[100dvh] font-display overflow-hidden selection:bg-primary selection:text-white">
      {/* Background Grain */}
      <div className="absolute inset-0 bg-noise pointer-events-none z-0 mix-blend-overlay opacity-10"></div>
      
      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col p-6 animate-fade-in">
           <div className="flex justify-between items-center mb-8">
               <h2 className="text-xl font-bold uppercase tracking-widest">配方设置</h2>
               <button onClick={() => setIsSettingsOpen(false)} className="size-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20">
                   <span className="material-symbols-outlined">close</span>
               </button>
           </div>
           
           <div className="space-y-6 overflow-y-auto pb-20 no-scrollbar">
               <div>
                   <label className="block text-xs font-bold text-primary uppercase tracking-wider mb-2">AI 智能配方生成</label>
                   <form onSubmit={handleGenerateRecipe} className="relative">
                       <input 
                           type="text" 
                           value={prompt}
                           onChange={(e) => setPrompt(e.target.value)}
                           placeholder="例如: Kodak Tri-X 400 迫冲到 1600..."
                           className="w-full bg-[#111] border border-white/20 rounded-lg py-3 pl-4 pr-12 text-sm focus:border-primary focus:outline-none transition-colors placeholder:text-gray-600"
                       />
                       <button 
                            type="submit"
                            disabled={isGenerating || !prompt}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-white disabled:opacity-30"
                       >
                           {isGenerating ? <span className="material-symbols-outlined animate-spin">sync</span> : <span className="material-symbols-outlined">arrow_upward</span>}
                       </button>
                   </form>
               </div>

               <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">预设配方</label>
                   <div className="grid gap-2">
                       {INITIAL_RECIPES.map(recipe => (
                           <button 
                               key={recipe.id}
                               onClick={() => {
                                   setActiveRecipe(recipe);
                                   setBaseRecipe(JSON.parse(JSON.stringify(recipe)));
                                   setCurrentStepIndex(0);
                                   setTimeLeft(recipe.steps[0].duration);
                                   setCurrentTemp(parseInt(recipe.temp) || 20);
                                   setIsRunning(false);
                                   setIsFinished(false);
                                   setIsSettingsOpen(false);
                               }}
                               className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                                   activeRecipe.id === recipe.id ? 'bg-primary/20 border-primary text-primary' : 'bg-white/5 border-white/10 hover:border-white/30'
                               }`}
                           >
                               <span className="font-bold">{recipe.name}</span>
                               <span className="text-xs font-mono opacity-70">{recipe.temp}</span>
                           </button>
                       ))}
                   </div>
               </div>
           </div>
        </div>
      )}

      {/* Top Navigation */}
      <nav className="flex items-center justify-between p-6 pb-2 z-10 relative shrink-0">
        <button onClick={onClose} className="flex items-center justify-center size-10 rounded text-gray-300 hover:bg-white/10 transition-colors">
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold mb-1 drop-shadow-[0_0_5px_rgba(166,23,39,0.5)]">Processing</span>
          <h1 className="text-sm font-bold tracking-tight text-white">{activeRecipe.name}</h1>
        </div>
        <button onClick={() => setIsSettingsOpen(true)} className="flex items-center justify-center size-10 rounded text-gray-300 hover:bg-white/10 transition-colors">
          <span className="material-symbols-outlined text-2xl">settings</span>
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative w-full max-w-md mx-auto px-6 z-10 justify-between min-h-0">
        
        {/* Temperature Controls */}
        <div className="flex flex-col items-center justify-center mt-2 shrink-0">
            <div className="group relative flex flex-col items-center">
                <span className="text-xs uppercase tracking-widest text-gray-500 mb-1">Temperature</span>
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => adjustTemperature(-1)}
                        className="size-8 rounded-full bg-white/5 flex items-center justify-center text-muted hover:text-white hover:bg-white/10 active:scale-90 transition-all"
                    >
                        <span className="material-symbols-outlined text-lg">remove</span>
                    </button>

                    <div className="flex items-baseline gap-1 relative min-w-[100px] justify-center">
                        <span className="text-5xl font-mono font-medium text-primary drop-shadow-[0_0_15px_rgba(166,23,39,0.6)]">
                            {currentTemp.toFixed(1)}
                        </span>
                        <span className="text-xl text-primary/70 font-light">°C</span>
                        {isRunning && (
                            <div className="absolute -right-1 top-2 w-1.5 h-1.5 bg-primary rounded-full animate-pulse shadow-[0_0_10px_rgba(166,23,39,0.8)]"></div>
                        )}
                    </div>

                    <button 
                         onClick={() => adjustTemperature(1)}
                         className="size-8 rounded-full bg-white/5 flex items-center justify-center text-muted hover:text-white hover:bg-white/10 active:scale-90 transition-all"
                    >
                        <span className="material-symbols-outlined text-lg">add</span>
                    </button>
                </div>
                <div className="text-[10px] text-primary/60 mt-1 font-mono">
                    {currentTemp !== (parseInt(baseRecipe.temp) || 20) && '自动补偿已应用'}
                </div>
            </div>
        </div>

        {/* Tank Visualization - Flexible Height */}
        <div className="flex-1 flex flex-col items-center justify-center relative w-full min-h-0 overflow-hidden">
            <div className="relative w-full h-full max-h-[40vh] min-h-[200px] flex items-center justify-center">
                 {/* Scalable Container for SVG-like tank */}
                 <div className="relative w-64 h-80 transform scale-75 sm:scale-100 origin-center transition-transform">
                     {/* Tank Graphics */}
                     <div className="absolute top-10 right-4 w-24 h-[2px] bg-[#2a2a2a] rotate-12 z-0"></div>
                     <div className="absolute top-24 right-4 w-24 h-[2px] bg-[#2a2a2a] rotate-[-12deg] z-0"></div>
                     
                     <div className="relative w-40 h-56 z-10 flex flex-col items-center mx-auto">
                        <div className="w-12 h-4 bg-[#1a1a1a] border border-gray-800 rounded-t-sm mb-[1px]"></div>
                        <div className="w-32 h-8 bg-[#1a1a1a] border border-gray-800 rounded-t-lg relative overflow-hidden flex items-center justify-center shadow-lg">
                            <div className="w-full h-[1px] bg-gray-800 absolute top-1/2"></div>
                        </div>
                        <div className="w-40 h-44 bg-[#1a1a1a]/90 border-x border-b border-gray-800 rounded-b-lg relative overflow-hidden backdrop-blur-sm shadow-2xl">
                            <div className="absolute bottom-0 left-0 w-full transition-all duration-[1000ms] ease-in-out h-3/4 flex items-end">
                                <div className={`w-full h-full opacity-30 ${currentLiquidColor} transition-colors duration-500`}></div>
                                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.1),transparent)] opacity-50"></div>
                            </div>
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-30 pointer-events-none">
                                <div className="w-32 h-1 bg-gray-600"></div>
                                <div className="w-32 h-1 bg-gray-600"></div>
                                <div className="w-32 h-1 bg-gray-600"></div>
                                <div className="w-32 h-1 bg-gray-600"></div>
                                <div className="w-4 h-full bg-gray-700 absolute"></div>
                            </div>
                            <div className="absolute top-0 right-4 w-2 h-full bg-white/5 skew-x-[-15deg]"></div>
                        </div>
                        <div className="absolute bottom-4 bg-black/60 px-2 py-0.5 rounded border border-gray-800 backdrop-blur-md">
                            <span className="text-[9px] uppercase tracking-widest text-gray-400">Patterson System 4</span>
                        </div>
                     </div>

                     {/* Side Bottles */}
                     <div className="absolute right-[-20px] top-1/2 -translate-y-1/2 flex flex-col gap-6 w-16">
                        <div className={`relative w-10 h-14 border border-gray-700 rounded-b-md bg-white/5 overflow-hidden flex flex-col justify-end transition-opacity ${currentStep.name.includes('Dev') || currentStep.name.includes('显影') ? 'opacity-100 ring-1 ring-primary/50' : 'opacity-30'}`}>
                            <div className="w-full h-[20%] bg-red-700/50"></div>
                            <span className="absolute -left-6 top-1/2 -translate-y-1/2 text-[9px] text-gray-500 font-mono rotate-[-90deg]">DEV</span>
                        </div>
                        <div className={`relative w-10 h-14 border border-gray-700 rounded-b-md bg-white/5 overflow-hidden flex flex-col justify-end transition-opacity ${currentStep.name.includes('Stop') || currentStep.name.includes('停显') ? 'opacity-100 ring-1 ring-yellow-500/50' : 'opacity-30'}`}>
                            <div className="w-full h-full bg-yellow-600/50"></div>
                            <span className="absolute -left-6 top-1/2 -translate-y-1/2 text-[9px] text-gray-500 font-mono rotate-[-90deg]">STOP</span>
                        </div>
                        <div className={`relative w-10 h-14 border border-gray-700 rounded-b-md bg-white/5 overflow-hidden flex flex-col justify-end transition-opacity ${currentStep.name.includes('Fix') || currentStep.name.includes('定影') ? 'opacity-100 ring-1 ring-purple-500/50' : 'opacity-30'}`}>
                            <div className="w-full h-full bg-purple-600/50"></div>
                            <span className="absolute -left-6 top-1/2 -translate-y-1/2 text-[9px] text-gray-500 font-mono rotate-[-90deg]">FIX</span>
                        </div>
                        <div className="absolute left-[-20px] top-0 bottom-0 w-[2px] bg-gradient-to-b from-primary/50 via-transparent to-transparent opacity-50"></div>
                     </div>
                 </div>
            </div>

            {/* Instruction Text */}
            <div className="text-center space-y-1 min-h-[80px] shrink-0 mb-4 z-20">
                {isFinished ? (
                     <>
                        <h2 className="text-2xl font-bold text-green-500 tracking-tight">完成 (Finished)</h2>
                        <p className="text-sm text-gray-500 font-mono">所有步骤已结束</p>
                     </>
                ) : (
                    <>
                        <h2 className={`text-2xl font-bold tracking-tight animate-fade-in ${isAgitationTime ? 'text-primary animate-pulse' : 'text-white'}`}>
                            {isAgitationTime ? '搅动 (Agitate)' : '静置 (Stand)'}
                        </h2>
                        <p className="text-sm text-gray-500 font-mono">
                            第 {currentCycle} / {totalCycles} 轮 • {isAgitationTime ? '请颠倒显影罐' : '请保持静置'}
                        </p>
                        <p className="text-xs text-gray-600 mt-2 max-w-[200px] mx-auto leading-tight">{currentStep.description}</p>
                    </>
                )}
            </div>
        </div>

        {/* Bottom Section: Progress & Controls */}
        <div className="w-full space-y-6 shrink-0 bg-[#050505] pt-2 pb-8 z-20">
            {/* Step Indicators */}
            <div className="w-full">
                <div className="flex justify-between text-[10px] uppercase tracking-wider text-gray-500 mb-2">
                    {activeRecipe.steps.map((step, idx) => (
                         <span key={idx} className={`${idx === currentStepIndex ? 'text-white font-bold' : ''}`}>
                             {step.name.split(' ')[0]}
                         </span>
                    ))}
                </div>
                {/* Segmented Progress Bar */}
                <div className="h-1 w-full bg-gray-900 rounded-full overflow-hidden flex">
                     {activeRecipe.steps.map((step, idx) => {
                         let bgClass = 'bg-gray-800';
                         if (idx < currentStepIndex) bgClass = step.color.replace('text-', 'bg-') + '/50'; 
                         if (idx === currentStepIndex) bgClass = step.color.replace('text-', 'bg-');

                         return (
                             <div key={idx} className={`h-full border-r border-black transition-colors duration-500 ${bgClass}`} style={{ flex: 1 }}></div>
                         );
                     })}
                </div>
                {/* Time Display */}
                <div className="flex justify-between mt-2 font-mono text-xs text-gray-400">
                    <span className="text-xl text-white">{formatTime(timeLeft)}</span>
                    <span>-{formatTime(activeRecipe.steps.reduce((acc, s, i) => i > currentStepIndex ? acc + s.duration : acc, 0))}</span>
                </div>
            </div>

            {/* Controls */}
            {!isFinished && (
                <div className="flex items-center justify-between gap-4 px-4">
                    <button 
                        onClick={resetStep}
                        className="size-12 rounded-full border border-gray-800 text-gray-400 flex items-center justify-center hover:bg-white/5 hover:text-white transition-all active:scale-95"
                    >
                        <span className="material-symbols-outlined text-xl">restart_alt</span>
                    </button>
                    
                    <button 
                        onClick={toggleTimer}
                        className="h-16 flex-1 rounded-full bg-surface-dark border border-gray-800 flex items-center justify-center gap-3 text-white shadow-lg active:scale-[0.98] transition-all group relative overflow-hidden"
                    >
                        <div className={`absolute inset-0 bg-primary/10 w-0 transition-all duration-500 ${!isRunning ? 'w-full' : 'group-hover:w-full'}`}></div>
                        <span className={`material-symbols-outlined fill-1 text-primary transition-colors ${!isRunning ? 'text-white' : ''}`}>
                            {isRunning ? 'pause' : 'play_arrow'}
                        </span>
                        <span className="font-bold tracking-wide text-lg group-hover:text-primary-glow transition-colors">
                            {isRunning ? 'PAUSE' : 'START'}
                        </span>
                    </button>
                    
                    <button 
                        onClick={nextStep}
                        className="size-12 rounded-full border border-gray-800 text-gray-400 flex items-center justify-center hover:bg-white/5 hover:text-white transition-all active:scale-95"
                    >
                        <span className="material-symbols-outlined text-xl">skip_next</span>
                    </button>
                </div>
            )}
            
            {isFinished && (
                <button 
                    onClick={onClose}
                    className="w-full py-4 rounded-full bg-white text-black font-bold text-lg hover:bg-gray-200 transition-colors"
                >
                    退出暗房 (Exit)
                </button>
            )}
        </div>
      </main>
    </div>
  );
};