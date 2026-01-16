
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
  
  const [iso, setIso] = useState(400);
  const [mode, setMode] = useState<'AV' | 'TV'>('AV');
  const [selectedAperture, setSelectedAperture] = useState(2.8);
  const [selectedShutter, setSelectedShutter] = useState("1/60");
  const [showZoneSystem, setShowZoneSystem] = useState(false); 
  const [evOffset, setEvOffset] = useState(0);
  const [measuredEv, setMeasuredEv] = useState(10);
  const [isLocked, setIsLocked] = useState(false);

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
    <div className="fixed inset-0 z-[100] bg-[#121212] flex flex-col font-mono text-gray-200">
      <div className="flex justify-between items-center p-4 pt-[calc(env(safe-area-inset-top)+1rem)] bg-[#1a1a1a] border-b border-white/10 z-20">
        <h2 className="text-sm font-bold tracking-widest uppercase text-primary flex items-center gap-2">
            <span className="material-symbols-outlined">exposure</span>
            手机测光表
        </h2>
        <button onClick={onClose} className="text-white/50 hover:text-white p-2">
            <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center group">
        <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
        <canvas ref={canvasRef} className="hidden" />
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
             <div className={`size-24 border-2 rounded-full flex items-center justify-center backdrop-blur-[1px] ${isLocked ? 'border-red-500 bg-red-500/10' : 'border-white/50 bg-white/5'}`}>
                 <div className={`size-1.5 rounded-full ${isLocked ? 'bg-red-500' : 'bg-primary'}`}></div>
             </div>
        </div>
        <button onClick={() => setIsLocked(!isLocked)} className={`absolute bottom-6 right-6 size-16 rounded-full flex items-center justify-center shadow-lg border-2 z-30 ${isLocked ? 'bg-red-600 border-red-400 text-white' : 'bg-white text-black border-gray-300'}`}>
            <span className="material-symbols-outlined text-2xl">{isLocked ? 'lock' : 'lock_open'}</span>
        </button>
      </div>

      <div className="bg-[#1a1a1a] p-6 pb-12 border-t border-white/10 z-20 flex flex-col gap-6">
          <div className="flex items-center justify-between">
              <div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">测量值 (EV)</div>
                  <div className={`text-3xl font-mono font-light ${isLocked ? 'text-red-500' : 'text-white'}`}>EV {measuredEv.toFixed(1)}</div>
              </div>
              <div className="text-right">
                  <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">{mode === 'AV' ? '推荐快门' : '推荐光圈'}</div>
                  <div className={`text-5xl font-mono font-bold text-primary`}>{resultValue}</div>
              </div>
          </div>
          <div className="flex gap-4">
              <div className="flex-1 space-y-2 overflow-hidden">
                  <label className="text-[9px] uppercase tracking-widest text-gray-500">ISO</label>
                  <div className="flex overflow-x-auto no-scrollbar gap-2 pb-2">
                      {ISO_VALUES.map(val => (<button key={val} onClick={() => setIso(val)} className={`shrink-0 px-3 py-2 rounded border text-xs font-bold ${iso === val ? 'bg-white text-black border-white' : 'text-gray-500 border-white/10'}`}>{val}</button>))}
                  </div>
              </div>
              <div className="flex-1 space-y-2 overflow-hidden">
                  <button onClick={() => setMode(mode === 'AV' ? 'TV' : 'AV')} className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-primary uppercase font-bold">{mode === 'AV' ? '光圈优先' : '快门优先'}</button>
                  <div className="flex overflow-x-auto no-scrollbar gap-2 pb-2">
                      {mode === 'AV' ? APERTURES.map(f => (<button key={f} onClick={() => setSelectedAperture(f)} className={`shrink-0 px-3 py-2 rounded border text-xs font-bold ${selectedAperture === f ? 'bg-primary text-white border-primary' : 'text-gray-500 border-white/10'}`}>{f}</button>)) : SHUTTERS.map(s => (<button key={s} onClick={() => setSelectedShutter(s)} className={`shrink-0 px-3 py-2 rounded border text-xs font-bold ${selectedShutter === s ? 'bg-primary text-white border-primary' : 'text-gray-500 border-white/10'}`}>{s}</button>))}
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};
