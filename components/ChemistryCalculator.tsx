
import React, { useState, useRef } from 'react';

interface ChemistryCalculatorProps {
  onClose: () => void;
}

export const ChemistryCalculator: React.FC<ChemistryCalculatorProps> = ({ onClose }) => {
  const [totalVolume, setTotalVolume] = useState(500); 
  const [ratioPartB, setRatioPartB] = useState(25);
  const touchStartRef = useRef<number | null>(null);

  // 手势返回处理
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartRef.current === null) return;
    const currentX = e.touches[0].clientX;
    const diffX = currentX - touchStartRef.current;
    if (touchStartRef.current < 40 && diffX > 100) {
      onClose();
      touchStartRef.current = null;
    }
  };

  const calculate = () => {
    const totalParts = 1 + ratioPartB;
    const unit = totalVolume / totalParts;
    return { stock: (unit).toFixed(1), water: (unit * ratioPartB).toFixed(1) };
  };

  const results = calculate();

  return (
    <div 
      className="fixed inset-0 z-[100] bg-[#0a0a0a] flex flex-col animate-fade-in font-display selection:bg-primary overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      <header className="px-6 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-6 border-b border-white/5 flex justify-between items-center bg-surface-highlight/80 backdrop-blur-2xl z-20 shadow-2xl">
        <button onClick={onClose} className="size-12 -ml-2 rounded-full bg-white/5 border border-white/10 flex items-center justify-center active:scale-90 transition-all">
          <span className="material-symbols-outlined text-3xl">arrow_back</span>
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[9px] text-primary font-black uppercase tracking-[0.5em] mb-1">Concentration</span>
          <h2 className="text-xs font-black uppercase tracking-widest text-white/90">药液配比计算</h2>
        </div>
        <div className="size-12 -mr-2 flex items-center justify-center opacity-30">
            <span className="material-symbols-outlined">science</span>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-12 max-w-md mx-auto w-full overflow-y-auto no-scrollbar pb-[calc(env(safe-area-inset-bottom)+4rem)] pt-6">
        <section className="bg-surface-dark border border-white/5 rounded-[2.5rem] p-10 flex flex-col items-center justify-center space-y-10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-125 transition-transform duration-1000">
                <span className="material-symbols-outlined text-9xl">beaker</span>
            </div>
            
            <div className="flex w-full justify-between items-end gap-6 relative z-10">
                <div className="flex-1 text-center space-y-1">
                    <div className="text-[10px] text-primary font-black uppercase tracking-widest opacity-80">Stock Sol.</div>
                    <div className="text-5xl font-mono font-black tabular-nums text-white">{results.stock}</div>
                    <div className="text-[10px] text-muted font-black font-mono tracking-widest opacity-40 uppercase">Milliliters</div>
                </div>
                <div className="text-primary pb-5 font-black text-2xl">+</div>
                <div className="flex-1 text-center space-y-1">
                    <div className="text-[10px] text-muted font-black uppercase tracking-widest opacity-60">Water (H2O)</div>
                    <div className="text-5xl font-mono font-black tabular-nums text-white">{results.water}</div>
                    <div className="text-[10px] text-muted font-black font-mono tracking-widest opacity-40 uppercase">Milliliters</div>
                </div>
            </div>
            
            <div className="w-full pt-6 border-t border-white/5 flex items-center justify-center gap-4">
               <span className="px-4 py-1.5 rounded-full bg-white/5 text-[10px] font-black uppercase tracking-widest text-muted border border-white/5">
                 Total: {totalVolume}ml
               </span>
               <span className="px-4 py-1.5 rounded-full bg-primary/10 text-[10px] font-black uppercase tracking-widest text-primary border border-primary/20">
                 Ratio 1:{ratioPartB}
               </span>
            </div>
        </section>

        <section className="space-y-10 px-2">
            <div className="space-y-6">
                <div className="flex justify-between items-end">
                    <label className="text-[10px] font-black uppercase text-muted tracking-[0.2em]">Tank Volume</label>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black font-mono text-primary tabular-nums">{totalVolume}</span>
                      <span className="text-[10px] font-black text-muted uppercase">ML</span>
                    </div>
                </div>
                <input type="range" min="100" max="2000" step="50" value={totalVolume} onChange={e => setTotalVolume(parseInt(e.target.value))} className="w-full h-1.5 bg-white/5 rounded-full appearance-none accent-primary cursor-pointer hover:bg-white/10 transition-all" />
            </div>
            
            <div className="space-y-6">
                <div className="flex justify-between items-end">
                    <label className="text-[10px] font-black uppercase text-muted tracking-[0.2em]">Dilution Ratio</label>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[10px] font-black text-muted uppercase">1 : </span>
                      <span className="text-2xl font-black font-mono text-primary tabular-nums">{ratioPartB}</span>
                    </div>
                </div>
                <input type="range" min="1" max="100" step="1" value={ratioPartB} onChange={e => setRatioPartB(parseInt(e.target.value))} className="w-full h-1.5 bg-white/5 rounded-full appearance-none accent-primary cursor-pointer hover:bg-white/10 transition-all" />
            </div>
        </section>
        
        <div className="grid grid-cols-2 gap-4 pt-6">
            {[
                { label: 'Rodinal', val: 25, desc: '1+25' },
                { label: 'Rodinal', val: 50, desc: '1+50' },
                { label: 'HC-110 B', val: 31, desc: '1+31' },
                { label: 'X-TOL', val: 1, desc: '1+1' }
            ].map(item => (
                <button 
                  key={item.label+item.val} 
                  onClick={() => setRatioPartB(item.val)} 
                  className={`p-5 rounded-[1.5rem] border flex flex-col items-center transition-all active:scale-95 ${ratioPartB === item.val ? 'bg-primary/20 border-primary shadow-lg shadow-primary/10' : 'bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/10'}`}
                >
                    <span className="text-[8px] font-black uppercase tracking-widest text-muted mb-1 opacity-60">{item.label}</span>
                    <span className={`text-xs font-black uppercase tracking-widest ${ratioPartB === item.val ? 'text-primary' : 'text-white/80'}`}>{item.desc}</span>
                </button>
            ))}
        </div>
      </main>
    </div>
  );
};
