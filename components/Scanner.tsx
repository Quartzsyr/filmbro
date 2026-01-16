
import React, { useEffect, useRef, useState } from 'react';
import { identifyFilmStock, IdentificationResult } from '../services/geminiService';

interface ScannerProps {
  onScanComplete: (result: IdentificationResult, image: string) => void;
  onClose: () => void;
}

export const Scanner: React.FC<ScannerProps> = ({ onScanComplete, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const touchStartRef = useRef<{x: number, y: number} | null>(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<string>('');
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const diffX = e.touches[0].clientX - touchStartRef.current.x;
    const diffY = Math.abs(e.touches[0].clientY - touchStartRef.current.y);
    if (touchStartRef.current.x < 50 && diffX > 80 && diffY < 40) {
      onClose();
      touchStartRef.current = null;
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1920 } } 
      });
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
    } catch (err) { alert("无法开启相机"); }
  };

  const stopCamera = () => {
    if (stream) stream.getTracks().forEach(track => track.stop());
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current || isAnalyzing) return;
    setIsAnalyzing(true);
    setAnalysisStatus('正在捕捉...');
    
    const context = canvasRef.current.getContext('2d');
    if (context && videoRef.current) {
      canvasRef.current.width = 1000;
      canvasRef.current.height = (videoRef.current.videoHeight / videoRef.current.videoWidth) * 1000;
      context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
      const imageData = canvasRef.current.toDataURL('image/jpeg', 0.85);
      
      try {
        setAnalysisStatus('AI 识别中...');
        const result = await identifyFilmStock(imageData);
        onScanComplete(result, imageData);
      } catch (error) {
        alert("识别失败，请检查网络或重新对焦。");
        setIsAnalyzing(false);
      }
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-between font-mono text-white"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      <canvas ref={canvasRef} className="hidden" />
      
      <div className="absolute inset-0 z-0">
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover opacity-60 grayscale transition-all duration-1000" />
        <div className="absolute inset-0 z-10 p-8 pt-[calc(env(safe-area-inset-top)+2rem)] pointer-events-none flex flex-col justify-between">
            <div className="flex justify-between items-start opacity-40">
                <div className="space-y-1">
                    <div className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                        <div className="size-1.5 rounded-full bg-green-500 animate-pulse"></div>
                        V-ENGINE ONLINE
                    </div>
                </div>
                <div className="text-right text-[9px] font-black uppercase tracking-widest">GEMINI FLUX v3</div>
            </div>

            <div className="relative w-full max-w-sm aspect-[4/5] mx-auto flex items-center justify-center">
                <div className="absolute top-0 left-0 size-12 border-t-4 border-l-4 border-primary rounded-tl-3xl"></div>
                <div className="absolute top-0 right-0 size-12 border-t-4 border-r-4 border-primary rounded-tr-3xl"></div>
                <div className="absolute bottom-0 left-0 size-12 border-b-4 border-l-4 border-primary rounded-bl-3xl"></div>
                <div className="absolute bottom-0 right-0 size-12 border-b-4 border-r-4 border-primary rounded-br-3xl"></div>
                
                {/* 胶片装饰孔位 */}
                <div className="absolute -left-10 top-0 bottom-0 flex flex-col justify-around py-4 opacity-10">
                    {[...Array(6)].map((_, i) => <div key={i} className="size-3 bg-white rounded-sm"></div>)}
                </div>
                <div className="absolute -right-10 top-0 bottom-0 flex flex-col justify-around py-4 opacity-10">
                    {[...Array(6)].map((_, i) => <div key={i} className="size-3 bg-white rounded-sm"></div>)}
                </div>

                <div className="relative w-full h-full overflow-hidden bg-primary/5 backdrop-blur-[1px] rounded-2xl">
                    <div className={`absolute top-0 left-0 right-0 h-1 bg-primary shadow-[0_0_25px_rgba(166,23,39,1)] transition-all ${isAnalyzing ? 'animate-[scan_1.5s_linear_infinite]' : 'top-1/2 opacity-20'}`}></div>
                </div>
            </div>

            <div className="text-center">
                 {isAnalyzing ? (
                     <div className="inline-flex items-center gap-3 px-8 py-3 bg-black border-2 border-primary/50 rounded-full animate-fade-in shadow-2xl">
                         <div className="size-2 bg-primary rounded-full animate-ping"></div>
                         <span className="text-[11px] font-black uppercase tracking-[0.4em] text-primary">{analysisStatus}</span>
                     </div>
                 ) : (
                    <div className="text-[10px] text-white/30 uppercase tracking-[0.6em] font-black">Align Package</div>
                 )}
            </div>
        </div>
      </div>

      <div className="relative z-20 w-full p-8 pt-[calc(env(safe-area-inset-top)+2rem)] flex justify-between items-center bg-gradient-to-b from-black to-transparent">
        <button onClick={onClose} className="size-14 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10 active:scale-90 shadow-xl">
          <span className="material-symbols-outlined text-3xl">close</span>
        </button>
        <div className="text-center"><div className="text-xs font-black uppercase tracking-widest italic">Digital Emulsion</div><div className="w-12 h-0.5 bg-primary mt-1 mx-auto"></div></div>
        <div className="size-14"></div>
      </div>

      <div className="relative z-20 w-full p-12 pb-[calc(env(safe-area-inset-bottom)+3rem)] flex justify-center items-center">
        <button onClick={captureAndAnalyze} disabled={isAnalyzing} className="relative group transition-all active:scale-95">
          <div className="size-28 rounded-full bg-white/10 backdrop-blur-md border-4 border-white/20 p-2">
            <div className="size-full rounded-full bg-primary flex items-center justify-center shadow-[0_0_40px_rgba(166,23,39,0.5)]">
                <span className={`material-symbols-outlined text-white text-5xl ${isAnalyzing ? 'animate-spin' : ''}`}>
                    {isAnalyzing ? 'sync' : 'shutter_speed'}
                </span>
            </div>
          </div>
          <div className="absolute -inset-4 border-2 border-white/5 rounded-full animate-spin-slow"></div>
        </button>
      </div>

      <style>{`
        @keyframes scan {
          0% { transform: translateY(-10%); }
          100% { transform: translateY(100%); }
        }
      `}</style>
    </div>
  );
};
