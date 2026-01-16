
import React, { useState } from 'react';

interface ChemistryCalculatorProps {
  onClose: () => void;
}

export const ChemistryCalculator: React.FC<ChemistryCalculatorProps> = ({ onClose }) => {
  const [totalVolume, setTotalVolume] = useState(500); 
  const [ratioPartB, setRatioPartB] = useState(25);

  const calculate = () => {
    const totalParts = 1 + ratioPartB;
    const unit = totalVolume / totalParts;
    return { stock: (unit).toFixed(1), water: (unit * ratioPartB).toFixed(1) };
  };

  const results = calculate();

  return (
    <div className="fixed inset-0 z-[100] bg-[#0a0a0a] flex flex-col animate-fade-in font-display selection:bg-primary">
      <header className="p-6 pt-[calc(env(safe-area-inset-top)+1rem)] border-b border-white/5 flex justify-between items-center bg-surface-highlight/50 backdrop-blur-md">
        <button onClick={onClose} className="size-10 rounded-full bg-white/5 flex items-center justify-center active:scale-90 transition-transform">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-primary font-bold uppercase tracking-[0.3em]">Darkroom Math</span>
          <h2 className="text-xl font-black uppercase">药液配比</h2>
        </div>
        <div className="size-10"></div>
      </header>

      <main className="flex-1 p-6 space-y-12 max-w-md mx-auto w-full overflow-y-auto no-scrollbar pb-32">
        <section className="bg-surface-dark border border-white/5 rounded-3xl p-8 flex flex-col items-center justify-center space-y-6 shadow-2xl">
            <div className="flex w-full justify-between items-end gap-4">
                <div className="flex-1 text-center">
                    <div className="text-[10px] text-primary font-bold uppercase tracking-widest mb-1">药液原液</div>
                    <div className="text-5xl font-mono font-black">{results.stock}</div>
                    <div className="text-[10px] text-muted font-mono mt-1">ML</div>
                </div>
                <div className="text-primary pb-4 font-black">+</div>
                <div className="flex-1 text-center">
                    <div className="text-[10px] text-muted font-bold uppercase tracking-widest mb-1">纯净水</div>
                    <div className="text-5xl font-mono font-black">{results.water}</div>
                    <div className="text-[10px] text-muted font-mono mt-1">ML</div>
                </div>
            </div>
            <p className="text-[10px] text-muted text-center leading-relaxed">总容量: {totalVolume}ml / 配比 1:{ratioPartB}</p>
        </section>

        <section className="space-y-8">
            <div className="space-y-4">
                <div className="flex justify-between items-center"><label className="text-xs font-bold uppercase text-muted tracking-widest">显影罐容量</label><span className="text-lg font-mono font-bold text-primary">{totalVolume} ML</span></div>
                <input type="range" min="100" max="2000" step="50" value={totalVolume} onChange={e => setTotalVolume(parseInt(e.target.value))} className="w-full h-1.5 bg-white/5 rounded-full appearance-none accent-primary" />
            </div>
            <div className="space-y-4">
                <div className="flex justify-between items-center"><label className="text-xs font-bold uppercase text-muted tracking-widest">稀释配比 (1 : X)</label><span className="text-lg font-mono font-bold text-primary">1 : {ratioPartB}</span></div>
                <input type="range" min="1" max="100" step="1" value={ratioPartB} onChange={e => setRatioPartB(parseInt(e.target.value))} className="w-full h-1.5 bg-white/5 rounded-full appearance-none accent-primary" />
            </div>
        </section>
        
        <div className="grid grid-cols-2 gap-3 pt-4">
            <button onClick={() => setRatioPartB(25)} className="py-4 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest">1 + 25 (Rodinal)</button>
            <button onClick={() => setRatioPartB(50)} className="py-4 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest">1 + 50 (Rodinal)</button>
            <button onClick={() => setRatioPartB(31)} className="py-4 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest">1 + 31 (HC-110 B)</button>
            <button onClick={() => setRatioPartB(11)} className="py-4 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest">1 + 11 (X-TOL)</button>
        </div>
      </main>
    </div>
  );
};
