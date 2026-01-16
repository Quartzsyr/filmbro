
import React, { useState } from 'react';

interface ReciprocityLabProps {
  onClose: () => void;
}

const FILM_CURVES = [
  { name: 'Kodak Portra 400', p: 1.35 },
  { name: 'Kodak T-Max 100', p: 1.30 },
  { name: 'Fuji Acros 100 II', p: 1.05 }, // Outstanding reciprocity
  { name: 'Ilford HP5 Plus', p: 1.31 },
  { name: 'CineStill 800T', p: 1.4 }
];

export const ReciprocityLab: React.FC<ReciprocityLabProps> = ({ onClose }) => {
  const [meteredTime, setMeteredTime] = useState(1);
  const [selectedFilm, setSelectedFilm] = useState(FILM_CURVES[0]);

  // Reciprocity Formula: Adjusted Time = Metered ^ p
  // This is a simplified Schwarzschild model
  const adjustedTime = Math.pow(meteredTime, selectedFilm.p);

  const formatTime = (t: number) => {
    if (t < 60) return `${t.toFixed(1)}s`;
    const m = Math.floor(t / 60);
    const s = Math.round(t % 60);
    return `${m}m ${s}s`;
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#050505] flex flex-col font-display animate-fade-in selection:bg-primary overflow-hidden">
      <header className="px-6 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-6 border-b border-white/5 flex justify-between items-center bg-surface-highlight/80 backdrop-blur-2xl z-20 shadow-2xl">
        <button onClick={onClose} className="size-12 -ml-2 rounded-full bg-white/5 flex items-center justify-center active:scale-90 transition-all">
          <span className="material-symbols-outlined text-3xl">arrow_back</span>
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[9px] text-primary font-black uppercase tracking-[0.5em] mb-1">Exposure Physics</span>
          <h2 className="text-xs font-black uppercase tracking-widest text-white/90">倒易律失效计算</h2>
        </div>
        <div className="size-12"></div>
      </header>

      <main className="flex-1 p-8 space-y-12 max-w-md mx-auto w-full overflow-y-auto no-scrollbar pt-12 pb-[calc(env(safe-area-inset-bottom)+4rem)]">
        <section className="bg-surface-dark border border-white/5 rounded-[3rem] p-12 flex flex-col items-center space-y-8 shadow-2xl relative overflow-hidden">
            <div className="text-[10px] font-black uppercase tracking-[0.4em] text-muted">实际所需曝光时间</div>
            <div className="text-7xl font-mono font-black text-primary drop-shadow-[0_0_25px_rgba(166,23,39,0.3)] tabular-nums">
                {formatTime(adjustedTime)}
            </div>
            <div className="px-6 py-2 bg-primary/10 border border-primary/20 rounded-full text-[10px] font-black uppercase tracking-widest text-primary">
                补偿增量: +{(adjustedTime - meteredTime).toFixed(1)}s
            </div>
            
            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-8">
                <div className="h-full bg-primary" style={{ width: `${Math.min(100, (meteredTime/adjustedTime)*100)}%` }}></div>
            </div>
        </section>

        <section className="space-y-10 px-2">
            <div className="space-y-6">
                <div className="flex justify-between items-end">
                    <label className="text-[10px] font-black uppercase text-muted tracking-[0.2em]">测光表读数</label>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black font-mono text-white tabular-nums">{meteredTime}</span>
                      <span className="text-[10px] font-black text-muted uppercase">SEC</span>
                    </div>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="120" 
                  step="1" 
                  value={meteredTime} 
                  onChange={e => setMeteredTime(parseInt(e.target.value))} 
                  className="w-full h-1.5 bg-white/5 rounded-full appearance-none accent-primary cursor-pointer hover:bg-white/10 transition-all" 
                />
                <div className="flex justify-between text-[8px] font-mono text-muted uppercase tracking-widest">
                    <span>1s</span><span>30s</span><span>60s</span><span>120s</span>
                </div>
            </div>

            <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-muted tracking-[0.2em] block ml-1">选择胶片型号</label>
                <div className="grid gap-3">
                    {FILM_CURVES.map(film => (
                        <button 
                          key={film.name} 
                          onClick={() => setSelectedFilm(film)} 
                          className={`p-5 rounded-2xl border flex justify-between items-center transition-all ${selectedFilm.name === film.name ? 'bg-primary/20 border-primary shadow-lg shadow-primary/10' : 'bg-white/5 border-white/5 hover:border-white/10'}`}
                        >
                            <span className={`text-xs font-black uppercase tracking-widest ${selectedFilm.name === film.name ? 'text-primary' : 'text-white/70'}`}>{film.name}</span>
                            <span className="text-[9px] font-mono opacity-40">P={film.p}</span>
                        </button>
                    ))}
                </div>
            </div>
        </section>

        <p className="text-[9px] text-center text-muted leading-relaxed opacity-40 font-mono">
            * 倒易律失效计算基于 Schwarzschild 方程经验值。<br/>
            不同冲洗工艺可能影响实际效果。
        </p>
      </main>
    </div>
  );
};
