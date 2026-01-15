import React, { useState, useEffect, useRef } from 'react';

interface LightMeterProps {
  onClose: () => void;
}

// Full & 1/3 Stop Scales
const APERTURES = [
  1.0, 1.1, 1.2, 1.4, 1.6, 1.8, 2, 2.2, 2.5, 2.8, 3.2, 3.5, 4, 4.5, 5.0, 5.6, 6.3, 7.1, 8, 9, 10, 11, 13, 14, 16, 18, 20, 22
];

const SHUTTERS = [
  "1/8000", "1/6400", "1/5000", "1/4000", "1/3200", "1/2500", "1/2000", "1/1600", "1/1250", "1/1000", 
  "1/800", "1/640", "1/500", "1/400", "1/320", "1/250", "1/200", "1/160", "1/125", "1/100", 
  "1/80", "1/60", "1/50", "1/40", "1/30", "1/25", "1/20", "1/15", "1/13", "1/10", "1/8", "1/6", "1/5", "1/4", "1/3", 
  "0.3", "0.4", "0.5", "0.6", "0.8", "1", "1.3", "1.5", "2", "2.5", "3", "4", "5", "6", "8", "10", "13", "15", "20", "30"
];

const ISO_VALUES = [
    50, 64, 80, 100, 125, 160, 200, 250, 320, 400, 500, 640, 800, 1000, 1250, 1600, 2000, 2500, 3200
];

// Helper to parse shutter string to float seconds
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
  
  // Metering State
  const [iso, setIso] = useState(400);
  const [mode, setMode] = useState<'AV' | 'TV'>('AV'); // Aperture Priority vs Shutter Priority
  const [selectedAperture, setSelectedAperture] = useState(2.8);
  const [selectedShutter, setSelectedShutter] = useState("1/60");
  
  // Visualizer State
  const [showZoneSystem, setShowZoneSystem] = useState(false); 
  const [evOffset, setEvOffset] = useState(0); // Calibration offset
  const [measuredEv, setMeasuredEv] = useState(10); // Simulated "Measured" EV
  const [isLocked, setIsLocked] = useState(false); // AEL Lock

  // Start Camera
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera access failed", err);
        alert("请允许相机权限以使用测光表");
      }
    };
    startCamera();
    
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Analysis Loop
  useEffect(() => {
    let animationId: number;
    
    const analyze = () => {
      if (isLocked) {
        animationId = requestAnimationFrame(analyze);
        return;
      }

      if (!videoRef.current || !canvasRef.current || videoRef.current.readyState !== 4) {
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
      
      let spotLumaSum = 0;
      let spotPixelCount = 0;
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const spotRadius = Math.min(canvas.width, canvas.height) * 0.15; 

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const luma = 0.299 * r + 0.587 * g + 0.114 * b;
        
        const x = (i / 4) % canvas.width;
        const y = Math.floor((i / 4) / canvas.width);
        const dist = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
        
        if (dist <= spotRadius) {
            spotLumaSum += luma;
            spotPixelCount++;
        }

        if (showZoneSystem) {
          if (luma < 25) { data[i] = 0; data[i+1] = 0; data[i+2] = 255; } 
          else if (luma >= 25 && luma < 60) { data[i] = 128; data[i+1] = 0; data[i+2] = 128; }
          else if (luma >= 190 && luma < 230) { data[i] = 255; data[i+1] = 255; data[i+2] = 0; }
          else if (luma >= 230) { data[i] = 255; data[i+1] = 0; data[i+2] = 0; }
          else if (luma >= 118 && luma <= 138) { data[i] = r * 0.8; data[i+1] = g * 1.1; data[i+2] = b * 0.8; }
        }
      }

      if (showZoneSystem) {
          ctx.putImageData(frame, 0, 0);
      } else {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      // EV Calculation
      // Base assumption: Phone auto-exposure aims for mid-grey (~128) which roughly equals EV 12 in typical indoor/overcast.
      // Offset allows user to calibrate this base.
      const avgLuma = spotPixelCount > 0 ? spotLumaSum / spotPixelCount : 128;
      const lumaFactor = (avgLuma - 128) / 30; 
      const currentEv = 12 + lumaFactor + evOffset; 
      
      setMeasuredEv(prev => prev * 0.9 + currentEv * 0.1);

      animationId = requestAnimationFrame(analyze);
    };

    analyze();
    return () => cancelAnimationFrame(animationId);
  }, [showZoneSystem, evOffset, isLocked]);

  // Main Metering Calculation Logic
  const calculateResult = () => {
    const effectiveEv = measuredEv;
    
    if (mode === 'AV') {
        // Calculate Time (t) given N (aperture)
        // t = (N^2 * 100) / (ISO * 2^EV)
        const targetT = (Math.pow(selectedAperture, 2) * 100) / (iso * Math.pow(2, effectiveEv));
        
        // Find closest standard shutter speed
        const closestShutter = SHUTTERS.reduce((prev, curr) => {
            const prevT = parseShutter(prev);
            const currT = parseShutter(curr);
            return Math.abs(currT - targetT) < Math.abs(prevT - targetT) ? curr : prev;
        });

        // Format string nicely
        if (!closestShutter.includes('/') && parseFloat(closestShutter) >= 1) {
            return closestShutter + '"'; // Add seconds symbol for >= 1s
        }
        return closestShutter;

    } else {
        // Calculate Aperture (N) given Time (t)
        // N = sqrt( (t * ISO * 2^EV) / 100 )
        const t = parseShutter(selectedShutter);
        const targetN = Math.sqrt( (t * iso * Math.pow(2, effectiveEv)) / 100 );
        
        // Find closest standard aperture
        const closestAperture = APERTURES.reduce((prev, curr) => 
            Math.abs(curr - targetN) < Math.abs(prev - targetN) ? curr : prev
        );
        return "f/" + closestAperture;
    }
  };

  const resultValue = calculateResult();

  return (
    <div className="fixed inset-0 z-[60] bg-[#121212] flex flex-col font-mono text-gray-200">
      {/* Top Bar */}
      <div className="flex justify-between items-center p-4 bg-[#1a1a1a] border-b border-white/10 z-20">
        <h2 className="text-sm font-bold tracking-widest uppercase text-primary flex items-center gap-2">
            <span className="material-symbols-outlined">exposure</span>
            手机测光表
        </h2>
        <button onClick={onClose} className="text-white/50 hover:text-white">
            <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {/* Main Viewport */}
      <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center group">
        <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
        <canvas ref={canvasRef} className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${showZoneSystem ? 'opacity-90' : 'opacity-0'} pointer-events-none`} />
        
        {/* Overlay Guides */}
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
             <div className={`size-24 border-2 rounded-full flex items-center justify-center backdrop-blur-[1px] transition-all duration-200 shadow-xl ${isLocked ? 'border-red-500 bg-red-500/10 scale-90' : 'border-white/50 bg-white/5'}`}>
                 <div className={`size-1.5 rounded-full shadow-sm ${isLocked ? 'bg-red-500' : 'bg-primary'}`}></div>
             </div>
             <div className={`mt-4 px-2 py-1 rounded text-[10px] uppercase tracking-widest font-bold border transition-colors shadow-lg ${isLocked ? 'bg-red-500 text-white border-red-500' : 'bg-black/50 text-white/90 border-white/20'}`}>
                 {isLocked ? 'AEL 锁定' : '点测光 (Spot)'}
             </div>
        </div>

        {/* Legend for Zone System */}
        {showZoneSystem && (
            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur p-2 rounded border border-white/10 text-[9px] space-y-1">
                <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-red-600"></div>
                    <span>过曝 (Zone X)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-yellow-400"></div>
                    <span>高光 (Zone VII)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-purple-600"></div>
                    <span>阴影 (Zone III)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-blue-600"></div>
                    <span>死黑 (Zone 0)</span>
                </div>
            </div>
        )}

        <button 
            onClick={() => setIsLocked(!isLocked)}
            className={`absolute bottom-6 right-6 size-16 rounded-full flex items-center justify-center shadow-lg border-2 active:scale-95 transition-all z-30 ${
                isLocked 
                ? 'bg-red-600 border-red-400 text-white shadow-red-900/50' 
                : 'bg-white text-black border-gray-300 shadow-white/20 hover:bg-gray-100'
            }`}
        >
            <span className="material-symbols-outlined text-2xl">
                {isLocked ? 'lock' : 'lock_open'}
            </span>
        </button>

        {/* Calibration Slider */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 h-48 bg-black/40 backdrop-blur rounded-full w-8 flex flex-col items-center py-2 border border-white/10">
            <span className="text-[9px] mb-2 text-white/50">EV</span>
            <input 
                type="range" 
                min="-5" max="5" step="0.5"
                value={evOffset}
                onChange={(e) => setEvOffset(parseFloat(e.target.value))}
                className="h-full w-1 appearance-none bg-white/20 rounded outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
            />
            <span className="text-[9px] mt-2 text-white/50">{evOffset > 0 ? '+' : ''}{evOffset}</span>
        </div>
      </div>

      {/* Controls Area */}
      <div className="bg-[#1a1a1a] p-6 pb-12 border-t border-white/10 z-20 flex flex-col gap-6">
          
          <div className="flex items-center justify-between">
              <div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">
                      测量值 (Measured) <span className="text-primary text-[9px] ml-1">{evOffset !== 0 ? `(Cal ${evOffset>0?'+':''}${evOffset})` : ''}</span>
                  </div>
                  <div className={`text-3xl font-mono font-light transition-colors ${isLocked ? 'text-red-500' : 'text-white'}`}>
                      EV {measuredEv.toFixed(1)}
                  </div>
              </div>
              
              <div className="text-right">
                  <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">
                      {mode === 'AV' ? '推荐快门' : '推荐光圈'}
                  </div>
                  <div className={`text-5xl font-mono font-bold drop-shadow-[0_0_10px_rgba(166,23,39,0.5)] transition-colors ${isLocked ? 'text-red-500' : 'text-primary'}`}>
                      {resultValue}
                  </div>
              </div>
          </div>

          <div className="flex gap-4">
              <div className="flex-1 space-y-2 overflow-hidden">
                  <label className="text-[9px] uppercase tracking-widest text-gray-500">ISO 感光度</label>
                  <div className="flex overflow-x-auto no-scrollbar gap-2 pb-2 mask-linear-fade">
                      {ISO_VALUES.map(val => (
                          <button
                            key={val}
                            onClick={() => setIso(val)}
                            className={`shrink-0 px-3 py-2 rounded border text-xs font-bold transition-all ${
                                iso === val 
                                ? 'bg-white text-black border-white' 
                                : 'bg-transparent text-gray-500 border-white/10 hover:border-white/30'
                            }`}
                          >
                              {val}
                          </button>
                      ))}
                  </div>
              </div>

              <div className="flex-1 space-y-2 overflow-hidden">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] uppercase tracking-widest text-gray-500">
                        {mode === 'AV' ? '锁定光圈 (f/)' : '锁定快门 (Time)'}
                    </label>
                    <button 
                        onClick={() => setMode(mode === 'AV' ? 'TV' : 'AV')}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-primary uppercase font-bold hover:bg-white/20"
                    >
                        {mode === 'AV' ? '光圈优先' : '快门优先'}
                    </button>
                  </div>
                  
                  <div className="flex overflow-x-auto no-scrollbar gap-2 pb-2">
                      {mode === 'AV' ? (
                          APERTURES.map(f => (
                            <button
                                key={f}
                                onClick={() => setSelectedAperture(f)}
                                className={`shrink-0 px-3 py-2 rounded border text-xs font-bold transition-all ${
                                    selectedAperture === f 
                                    ? 'bg-primary text-white border-primary' 
                                    : 'bg-transparent text-gray-500 border-white/10 hover:border-white/30'
                                }`}
                            >
                                {f}
                            </button>
                          ))
                      ) : (
                          SHUTTERS.map((s) => (
                            <button
                                key={s}
                                onClick={() => setSelectedShutter(s)}
                                className={`shrink-0 px-3 py-2 rounded border text-xs font-bold transition-all ${
                                    selectedShutter === s
                                    ? 'bg-primary text-white border-primary' 
                                    : 'bg-transparent text-gray-500 border-white/10 hover:border-white/30'
                                }`}
                            >
                                {s}
                            </button>
                          ))
                      )}
                  </div>
              </div>
          </div>

          <button 
            onClick={() => setShowZoneSystem(!showZoneSystem)}
            className={`w-full py-3 rounded text-xs font-bold uppercase tracking-widest border transition-all flex items-center justify-center gap-2 ${
                showZoneSystem 
                ? 'bg-white/10 text-white border-white/20' 
                : 'bg-transparent text-gray-500 border-white/5'
            }`}
          >
             <span className="material-symbols-outlined text-sm">gradient</span>
             {showZoneSystem ? '区域曝光 (Zone System): 开' : '区域曝光 (Zone System): 关'}
          </button>
      </div>
    </div>
  );
};
