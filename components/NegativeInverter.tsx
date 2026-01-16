
import React, { useState, useRef, useEffect } from 'react';

interface NegativeInverterProps {
  onClose: () => void;
}

export const NegativeInverter: React.FC<NegativeInverterProps> = ({ onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [orangeMask, setOrangeMask] = useState(30); 
  const [exposure, setExposure] = useState(1);
  const [contrast, setContrast] = useState(1.2);

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
    <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-fade-in font-display overflow-hidden">
      <header className="p-6 pt-[calc(env(safe-area-inset-top)+1rem)] border-b border-white/10 flex justify-between items-center z-20 bg-black/50 backdrop-blur">
        <button onClick={onClose} className="size-10 rounded-full bg-white/5 flex items-center justify-center active:scale-90 transition-transform">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="text-center">
          <span className="text-[10px] text-primary font-bold uppercase tracking-widest">Lab Tool</span>
          <h2 className="text-sm font-black uppercase">底片翻转预览</h2>
        </div>
        <div className="size-10"></div>
      </header>

      <main className="flex-1 relative flex items-center justify-center bg-[#050505]">
        <div className="relative w-full aspect-[4/3] max-w-lg border-y md:border border-white/5 overflow-hidden">
            <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                style={{ filter: `invert(1) hue-rotate(${orangeMask}deg) brightness(${exposure}) contrast(${contrast})` }}
                className="w-full h-full object-cover transition-all"
            />
            <div className="absolute inset-8 border border-white/20 rounded pointer-events-none border-dashed"></div>
        </div>
        
        <div className="absolute bottom-8 left-0 right-0 px-6 space-y-6 bg-gradient-to-t from-black via-black/80 to-transparent pt-12 pb-[env(safe-area-inset-bottom)]">
            <div className="space-y-4 max-w-sm mx-auto">
                <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-orange-500 text-sm">palette</span>
                    <input type="range" min="0" max="360" value={orangeMask} onChange={e => setOrangeMask(parseInt(e.target.value))} className="flex-1 accent-primary h-1 bg-white/10 rounded-full appearance-none" />
                </div>
                <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-blue-400 text-sm">light_mode</span>
                    <input type="range" min="0.5" max="2" step="0.1" value={exposure} onChange={e => setExposure(parseFloat(e.target.value))} className="flex-1 accent-primary h-1 bg-white/10 rounded-full appearance-none" />
                </div>
                <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-green-400 text-sm">contrast</span>
                    <input type="range" min="0.5" max="2.5" step="0.1" value={contrast} onChange={e => setContrast(parseFloat(e.target.value))} className="flex-1 accent-primary h-1 bg-white/10 rounded-full appearance-none" />
                </div>
            </div>
            <p className="text-[9px] text-center text-muted uppercase tracking-widest pb-4">实时处理：反相 + 橙色遮罩补偿</p>
        </div>
      </main>
    </div>
  );
};
