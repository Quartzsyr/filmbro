
import React, { useState, useEffect, useRef } from 'react';

interface LightMeterProps {
  onClose: () => void;
}

const APERTURES = [1.0, 1.1, 1.2, 1.4, 1.6, 1.8, 2, 2.2, 2.5, 2.8, 3.2, 3.5, 4, 4.5, 5.0, 5.6, 6.3, 7.1, 8, 9, 10, 11, 13, 14, 16, 18, 20, 22];
const SHUTTERS = ["1/8000", "1/4000", "1/2000", "1/1000", "1/500", "1/250", "1/125", "1/60", "1/30", "1/15", "1/8", "1/4", "1/2", "1", "2", "4", "8", "15", "30"];
const ISO_VALUES = [50, 100, 200, 400, 800, 1600, 3200];

const parseShutter = (s: string): number => {
    if (s.includes('/')) {
        const parts = s.split('/');
        return parseFloat(parts[0]) / parseFloat(parts[1]);
    }
    return parseFloat(s);
};

export const LightMeter: React.FC<LightMeterProps> = ({ onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const touchStartRef = useRef<number | null>(null);
  
  const [iso, setIso] = useState(400);
  const [mode, setMode] = useState<'AV' | 'TV'>('AV');
  const [selectedAperture, setSelectedAperture] = useState(2.8);
  const [selectedShutter, setSelectedShutter] = useState("1/60");
  const [evOffset, setEvOffset] = useState(0);
  const [measuredEv, setMeasuredEv] = useState(10);
  const [isLocked, setIsLocked] = useState(false);

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
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) { alert("请允许相机权限以使用测光表"); }
    };
    startCamera();
    return () => streamRef.current?.getTracks().forEach(track => track.stop());
  }, []);

  useEffect(() => {
    let animationId: number;
    const analyze = () => {
      if (isLocked || !videoRef.current || !canvasRef.current || videoRef.current.readyState !== 4) {
        animationId = requestAnimationFrame(analyze);
        return;
      }
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      canvas.width = videoRef.current.videoWidth / 4; 
      canvas.height = videoRef.current.videoHeight / 4;
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = frame.data;
      let lumaSum = 0;
      let count = 0;
      for (let i = 0; i < data.length; i += 4) {
        const luma = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
        lumaSum += luma;
        count++;
      }
      const avgLuma = count > 0 ? lumaSum / count : 128;
      const currentEv = 12 + (avgLuma - 128) / 30 + evOffset; 
      setMeasuredEv(prev => prev * 0.9 + currentEv * 0.1);
      animationId = requestAnimationFrame(analyze);
    };
    analyze();
    return () => cancelAnimationFrame(animationId);
  }, [evOffset, isLocked]);

  const resultValue = mode === 'AV' ? 
    SHUTTERS.reduce((prev, curr) => {
        const targetT = (Math.pow(selectedAperture, 2) * 100) / (iso * Math.pow(2, measuredEv));
        return Math.abs(parseShutter(curr) - targetT) < Math.abs(parseShutter(prev) - targetT) ? curr : prev;
    }) : 
    "f/" + APERTURES.reduce((prev, curr) => {
        const targetN = Math.sqrt( (parseShutter(selectedShutter) * iso * Math.pow(2, measuredEv)) / 100 );
        return Math.abs(curr - targetN) < Math.abs(prev - targetN) ? curr : prev;
    });

  return (
    <div 
      className="fixed inset-0 z-[100] bg-[#121212] flex flex-col font-mono text-gray-200 overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      {/* 增强顶部栏安全区 */}
      <div className="flex justify-between items-center px-4 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-4 bg-[#1a1a1a] border-b border-white/5 z-20 shadow-2xl">
        <button onClick={onClose} className="size-12 rounded-full hover:bg-white/5 flex items-center justify-center active:scale-90 transition-all -ml-2">
            <span className="material-symbols-outlined text-3xl">arrow_back</span>
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black tracking-[0.3em] uppercase text-primary mb-1">Light Sensor</span>
          <h2 className="text-xs font-black tracking-widest uppercase text-white/80">Digital Metering</h2>
        </div>
        <div className="size-12 -mr-2 flex items-center justify-center opacity-30">
            <span className="material-symbols-outlined">exposure</span>
        </div>
      </div>

      <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center group">
        <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover opacity-60" />
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Viewfinder Graphics */}
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
             <div className="absolute inset-10 border border-white/10 rounded-3xl"></div>
             <div className={`size-32 border-2 rounded-full flex items-center justify-center backdrop-blur-[1px] transition-all duration-500 ${isLocked ? 'border-primary bg-primary/10' : 'border-white/30 bg-white/5'}`}>
                 <div className={`size-2 rounded-full ${isLocked ? 'bg-primary animate-ping' : 'bg-primary'}`}></div>
             </div>
             {/* Rule of Thirds */}
             <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-20">
                <div className="border-r border-b border-white/20"></div><div className="border-r border-b border-white/20"></div><div className="border-b border-white/20"></div>
                <div className="border-r border-b border-white/20"></div><div className="border-r border-b border-white/20"></div><div className="border-b border-white/20"></div>
                <div className="border-r border-white/20"></div><div className="border-r border-white/20"></div><div></div>
             </div>
        </div>

        <button 
          onClick={() => setIsLocked(!isLocked)} 
          className={`absolute bottom-8 right-8 size-20 rounded-2xl flex flex-col items-center justify-center shadow-2xl border transition-all z-30 ${isLocked ? 'bg-primary border-primary text-white scale-95 shadow-primary/20' : 'bg-white text-black border-white active:scale-90'}`}
        >
            <span className="material-symbols-outlined text-3xl">{isLocked ? 'lock' : 'lock_open'}</span>
            <span className="text-[9px] font-black uppercase tracking-tighter mt-1">{isLocked ? 'HOLD' : 'FREE'}</span>
        </button>
      </div>

      <div className="bg-[#1a1a1a] p-8 pb-[calc(env(safe-area-inset-bottom)+2rem)] border-t border-white/10 z-20 flex flex-col gap-8 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
          <div className="flex items-end justify-between">
              <div className="space-y-1">
                  <div className="text-[10px] text-primary font-black uppercase tracking-widest">Ambient EV</div>
                  <div className={`text-4xl font-mono font-black tabular-nums transition-colors ${isLocked ? 'text-primary' : 'text-white'}`}>{measuredEv.toFixed(1)}</div>
              </div>
              <div className="text-right space-y-1">
                  <div className="text-[10px] text-muted font-black uppercase tracking-widest">{mode === 'AV' ? 'Shutter Speed' : 'Aperture'}</div>
                  <div className={`text-6xl font-mono font-black text-primary drop-shadow-[0_0_15px_rgba(166,23,39,0.3)] tabular-nums`}>{resultValue}</div>
              </div>
          </div>

          <div className="flex flex-col gap-6">
              <div className="space-y-3">
                  <label className="text-[9px] font-black uppercase tracking-[0.3em] text-muted ml-1 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[12px]">filter_vintage</span>
                    Sensitivity (ISO)
                  </label>
                  <div className="flex overflow-x-auto no-scrollbar gap-2.5 pb-2 -mx-1 px-1">
                      {ISO_VALUES.map(val => (
                        <button 
                          key={val} 
                          onClick={() => setIso(val)} 
                          className={`shrink-0 px-5 py-3 rounded-xl border text-xs font-black transition-all ${iso === val ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'text-gray-500 border-white/5 bg-white/5 active:scale-90'}`}
                        >
                          {val}
                        </button>
                      ))}
                  </div>
              </div>

              <div className="space-y-3">
                  <div className="flex justify-between items-center pr-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-muted ml-1 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[12px]">settings_input_component</span>
                      Priority Mode
                    </label>
                    <button onClick={() => setMode(mode === 'AV' ? 'TV' : 'AV')} className="text-[9px] px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase font-black tracking-widest active:scale-95 transition-all">
                      {mode === 'AV' ? 'Aperture Pri.' : 'Shutter Pri.'}
                    </button>
                  </div>
                  <div className="flex overflow-x-auto no-scrollbar gap-2.5 pb-2 -mx-1 px-1">
                      {mode === 'AV' ? APERTURES.map(f => (
                        <button 
                          key={f} 
                          onClick={() => setSelectedAperture(f)} 
                          className={`shrink-0 px-5 py-3 rounded-xl border text-xs font-black transition-all ${selectedAperture === f ? 'bg-primary text-white border-primary shadow-lg' : 'text-gray-500 border-white/5 bg-white/5 active:scale-90'}`}
                        >
                          f/{f}
                        </button>
                      )) : SHUTTERS.map(s => (
                        <button 
                          key={s} 
                          onClick={() => setSelectedShutter(s)} 
                          className={`shrink-0 px-5 py-3 rounded-xl border text-xs font-black transition-all ${selectedShutter === s ? 'bg-primary text-white border-primary shadow-lg' : 'text-gray-500 border-white/5 bg-white/5 active:scale-90'}`}
                        >
                          {s}
                        </button>
                      ))}
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};
