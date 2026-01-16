
import React, { useState, useRef, useEffect } from 'react';

interface NegativeInverterProps {
  onClose: () => void;
}

export const NegativeInverter: React.FC<NegativeInverterProps> = ({ onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const touchStartRef = useRef<number | null>(null);
  const [orangeMask, setOrangeMask] = useState(30); 
  const [exposure, setExposure] = useState(1);
  const [contrast, setContrast] = useState(1.2);

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

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) { console.error("Camera failed", err); }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black flex flex-col animate-fade-in font-display overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      <header className="px-6 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-6 border-b border-white/10 flex justify-between items-center z-20 bg-black/80 backdrop-blur-2xl">
        <button onClick={onClose} className="size-12 -ml-2 rounded-full bg-white/5 border border-white/10 flex items-center justify-center active:scale-90 transition-all shadow-xl">
          <span className="material-symbols-outlined text-3xl">arrow_back</span>
        </button>
        <div className="text-center">
          <span className="text-[10px] text-primary font-black uppercase tracking-[0.4em] mb-1 block">Laboratory</span>
          <h2 className="text-xs font-black uppercase tracking-widest text-white/90">底片反转预览</h2>
        </div>
        <div className="size-12 -mr-2 flex items-center justify-center opacity-30">
            <span className="material-symbols-outlined">filter_b_and_w</span>
        </div>
      </header>

      <main className="flex-1 relative flex items-center justify-center bg-[#050505]">
        <div className="relative w-full aspect-[4/3] max-w-lg border-y md:border border-white/10 overflow-hidden shadow-[0_0_100px_rgba(166,23,39,0.1)]">
            <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                style={{ filter: `invert(1) hue-rotate(${orangeMask}deg) brightness(${exposure}) contrast(${contrast})` }}
                className="w-full h-full object-cover transition-all duration-300"
            />
            {/* Guide Grid */}
            <div className="absolute inset-8 border border-white/20 rounded-xl pointer-events-none border-dashed opacity-40"></div>
            <div className="absolute top-1/2 left-0 right-0 h-px bg-white/10 pointer-events-none"></div>
            <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/10 pointer-events-none"></div>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 p-8 pb-[calc(env(safe-area-inset-bottom)+2rem)] space-y-8 bg-gradient-to-t from-black via-black/90 to-transparent pt-20">
            <div className="space-y-6 max-w-sm mx-auto">
                <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-orange-400 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">palette</span>
                        Orange Mask Comp.
                      </label>
                      <span className="text-[10px] font-mono text-white/40">{orangeMask}°</span>
                    </div>
                    <input type="range" min="0" max="360" value={orangeMask} onChange={e => setOrangeMask(parseInt(e.target.value))} className="w-full accent-primary h-1 bg-white/5 rounded-full appearance-none hover:bg-white/10 transition-all" />
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">light_mode</span>
                        Exposure Balance
                      </label>
                      <span className="text-[10px] font-mono text-white/40">{exposure.toFixed(1)}x</span>
                    </div>
                    <input type="range" min="0.5" max="2" step="0.1" value={exposure} onChange={e => setExposure(parseFloat(e.target.value))} className="w-full accent-primary h-1 bg-white/5 rounded-full appearance-none hover:bg-white/10 transition-all" />
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-green-400 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">contrast</span>
                        Shadow Depth
                      </label>
                      <span className="text-[10px] font-mono text-white/40">{contrast.toFixed(1)}x</span>
                    </div>
                    <input type="range" min="0.5" max="2.5" step="0.1" value={contrast} onChange={e => setContrast(parseFloat(e.target.value))} className="w-full accent-primary h-1 bg-white/5 rounded-full appearance-none hover:bg-white/10 transition-all" />
                </div>
            </div>
            <p className="text-[9px] text-center text-muted uppercase tracking-[0.4em] font-black opacity-50 pb-2">Real-time Emulsion Simulation</p>
        </div>
      </main>
    </div>
  );
};
