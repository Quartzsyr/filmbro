import React, { useState, useEffect, useRef } from 'react';

interface DevelopmentTimerProps {
  onClose: () => void;
}

interface Step {
  name: string;
  duration: number; // seconds
  color: string;
  description: string;
}

interface Recipe {
  id: string;
  name: string;
  temp: string;
  steps: Step[];
}

const RECIPES: Recipe[] = [
  {
    id: 'bw-standard',
    name: 'B&W Standard',
    temp: '20°C',
    steps: [
      { name: 'Developer', duration: 360, color: 'text-green-500', description: 'Agitate every minute' },
      { name: 'Stop Bath', duration: 60, color: 'text-yellow-500', description: 'Continuous agitation' },
      { name: 'Fixer', duration: 300, color: 'text-purple-500', description: 'Agitate periodically' },
      { name: 'Wash', duration: 600, color: 'text-blue-500', description: 'Running water' }
    ]
  },
  {
    id: 'c41-standard',
    name: 'C-41 Color',
    temp: '38°C',
    steps: [
      { name: 'Developer', duration: 195, color: 'text-red-500', description: 'Strict temp control!' },
      { name: 'Blix', duration: 390, color: 'text-orange-500', description: 'Bleach + Fix' },
      { name: 'Wash', duration: 180, color: 'text-blue-500', description: 'Warm water' },
      { name: 'Stabilizer', duration: 60, color: 'text-pink-500', description: 'Do not rinse after' }
    ]
  }
];

export const DevelopmentTimer: React.FC<DevelopmentTimerProps> = ({ onClose }) => {
  const [activeRecipe, setActiveRecipe] = useState<Recipe>(RECIPES[0]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(activeRecipe.steps[0].duration);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      // Auto advance or wait? Let's wait for user confirmation to proceed in a real darkroom usually
      // But for this UI, let's play a sound (simulated) and wait.
      // Ideally we'd have a 'Next' button.
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
  }

  const toggleTimer = () => setIsRunning(!isRunning);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentStep = activeRecipe.steps[currentStepIndex];

  return (
    <div className="fixed inset-0 z-[60] bg-black text-white flex flex-col animate-fade-in font-mono">
      {/* Top Bar */}
      <div className="flex justify-between items-center p-6 border-b border-white/10">
        <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors">
          <span className="material-symbols-outlined">close</span>
        </button>
        <div className="flex gap-2">
            {RECIPES.map(recipe => (
                <button
                    key={recipe.id}
                    onClick={() => {
                        setActiveRecipe(recipe);
                        setCurrentStepIndex(0);
                        setTimeLeft(recipe.steps[0].duration);
                        setIsRunning(false);
                        setIsFinished(false);
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border transition-all ${
                        activeRecipe.id === recipe.id 
                        ? 'bg-primary border-primary text-white' 
                        : 'bg-transparent border-white/20 text-muted hover:border-white'
                    }`}
                >
                    {recipe.name}
                </button>
            ))}
        </div>
      </div>

      {/* Main Timer Display */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden">
         {/* Background Pulse */}
         {isRunning && (
             <div className="absolute inset-0 bg-primary/5 animate-pulse-slow pointer-events-none"></div>
         )}
         
         {!isFinished ? (
             <>
                <div className="text-center mb-12 relative z-10">
                    <h2 className={`text-2xl font-bold uppercase tracking-[0.2em] mb-2 ${currentStep.color}`}>
                        {currentStep.name}
                    </h2>
                    <p className="text-muted text-sm">{currentStep.description}</p>
                </div>

                <div className="text-[120px] font-black leading-none font-display tracking-tighter tabular-nums relative z-10">
                    {formatTime(timeLeft)}
                </div>
                
                <div className="mt-4 flex gap-1 opacity-50">
                    {activeRecipe.steps.map((_, idx) => (
                        <div key={idx} className={`h-1 w-8 rounded-full ${idx === currentStepIndex ? 'bg-white' : 'bg-white/20'}`}></div>
                    ))}
                </div>
             </>
         ) : (
             <div className="text-center animate-fade-in">
                 <span className="material-symbols-outlined text-[80px] text-green-500 mb-4">check_circle</span>
                 <h2 className="text-4xl font-bold uppercase">Finished</h2>
                 <p className="text-muted mt-2">Process Complete</p>
                 <button 
                    onClick={() => onClose()}
                    className="mt-8 px-8 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform"
                 >
                    Exit Darkroom
                 </button>
             </div>
         )}
      </div>

      {/* Controls */}
      {!isFinished && (
          <div className="p-8 pb-12 flex items-center justify-between max-w-md mx-auto w-full">
            <button 
                onClick={prevStep} 
                disabled={currentStepIndex === 0}
                className="p-4 rounded-full bg-surface-highlight border border-white/10 disabled:opacity-30 hover:bg-white/10"
            >
                <span className="material-symbols-outlined">skip_previous</span>
            </button>

            <button 
                onClick={toggleTimer}
                className={`size-20 rounded-full flex items-center justify-center border-4 shadow-[0_0_30px_rgba(166,23,39,0.3)] transition-all active:scale-95 ${
                    isRunning 
                    ? 'border-red-500/50 bg-red-500/20 text-red-500' 
                    : 'border-primary bg-primary text-white'
                }`}
            >
                <span className="material-symbols-outlined text-[32px]">
                    {isRunning ? 'pause' : 'play_arrow'}
                </span>
            </button>

            <button 
                onClick={nextStep}
                className="p-4 rounded-full bg-surface-highlight border border-white/10 hover:bg-white/10"
            >
                <span className="material-symbols-outlined">skip_next</span>
            </button>
          </div>
      )}
    </div>
  );
};