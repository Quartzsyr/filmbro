
import React, { useEffect, useRef, useState } from 'react';
import { analyzeSceneForFilm, SceneAnalysisResult } from '../services/geminiService';
import { StockFilm } from '../types';

interface SceneScoutProps {
  stock: StockFilm[];
  onClose: () => void;
}

export const SceneScout: React.FC<SceneScoutProps> = ({ stock, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<SceneAnalysisResult | null>(null);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment', width: { ideal: 1280 } } 
        });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) { alert("摄像头启动失败，请检查权限。"); }
    };
    startCamera();
    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const handleScout = async () => {
    if (!videoRef.current || !canvasRef.current || isAnalyzing) return;
    setIsAnalyzing(true);
    
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      canvasRef.current.width = 640;
      canvasRef.current.height = 480;
      ctx.drawImage(videoRef.current, 0, 0, 640, 480);
      const base64 = canvasRef.current.toDataURL('image/jpeg', 0.8);
      const stockNames = stock.length > 0 
        ? stock.map(s => `${s.brand} ${s.name} (ISO ${s.iso})`)
        : ["Kodak Portra 400", "Ilford HP5 Plus", "Fuji C200"];
      
      try {
        const data = await analyzeSceneForFilm(base64, stockNames);
        setResult(data);
      } catch (e) {
        alert("AI 分析暂时不可用，请稍后再试。");
      }
    }
    setIsAnalyzing(false);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col font-display animate-fade-in">
      <header className="absolute top-0 inset-x-0 p-8 pt-[calc(env(safe-area-inset-top)+1.5rem)] flex justify-between items-center z-20">
        <button onClick={onClose} className="size-12 rounded-full bg-white/10 backdrop-blur-2xl flex items-center justify-center border border-white/10 active:scale-90 transition-all">
          <span className="material-symbols-outlined">close</span>
        </button>
        <div className="flex flex-col items-center">
            <span className="text-[10px] text-primary font-black uppercase tracking-[0.4em]">Cinematic Scout</span>
            <h2 className="text-xs font-black uppercase tracking-widest text-white/90">AI 场景探员</h2>
        </div>
        <div className="size-12"></div>
      </header>

      <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-[#050505]">
        <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover transition-all duration-1000 ${isAnalyzing ? 'grayscale blur-sm scale-110' : 'opacity-60'}`} />
        <canvas ref={canvasRef} className="hidden" />
        
        {/* 扫描动画 UI */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className={`w-64 h-64 border border-white/20 rounded-2xl relative transition-opacity duration-500 ${isAnalyzing ? 'opacity-100' : 'opacity-40'}`}>
                <div className="absolute top-0 left-0 size-8 border-t-2 border-l-2 border-primary rounded-tl-xl"></div>
                <div className="absolute top-0 right-0 size-8 border-t-2 border-r-2 border-primary rounded-tr-xl"></div>
                <div className="absolute bottom-0 left-0 size-8 border-b-2 border-l-2 border-primary rounded-bl-xl"></div>
                <div className="absolute bottom-0 right-0 size-8 border-b-2 border-r-2 border-primary rounded-br-xl"></div>
                {isAnalyzing && <div className="absolute inset-0 bg-primary/10 animate-pulse"></div>}
            </div>
        </div>

        {/* 结果显示卡片 */}
        {result && (
            <div className="absolute inset-x-6 bottom-32 bg-surface-dark/95 backdrop-blur-3xl border border-white/10 p-8 rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] animate-shutter space-y-6">
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                        <span className="text-[9px] font-black uppercase text-muted tracking-widest">环境光影</span>
                        <div className="text-sm font-bold text-white/90">{result.lighting}</div>
                    </div>
                    <div className="space-y-1">
                        <span className="text-[9px] font-black uppercase text-muted tracking-widest">场景反差</span>
                        <div className="text-sm font-bold text-white/90">{result.contrast}</div>
                    </div>
                </div>
                <div className="pt-6 border-t border-white/5 space-y-4">
                    <div>
                        <span className="text-[10px] font-black uppercase text-primary tracking-widest">AI 用卷建议</span>
                        <p className="text-xl font-black italic mt-2 text-white leading-tight">“{result.recommendation}”</p>
                    </div>
                    <p className="text-[11px] text-white/50 leading-relaxed italic">{result.exposureTip}</p>
                </div>
                <button onClick={() => setResult(null)} className="w-full py-4 bg-primary/10 border border-primary/20 rounded-2xl text-[10px] font-black uppercase tracking-widest text-primary">重新探测</button>
            </div>
        )}
      </div>

      <div className="p-12 pb-[calc(env(safe-area-inset-bottom)+2rem)] flex justify-center bg-black">
         <button 
           onClick={handleScout} 
           disabled={isAnalyzing}
           className="size-24 rounded-full bg-primary flex items-center justify-center shadow-[0_0_60px_rgba(166,23,39,0.4)] active:scale-90 transition-all group"
         >
            <span className={`material-symbols-outlined text-4xl text-white ${isAnalyzing ? 'animate-spin' : ''}`}>
                {isAnalyzing ? 'sync' : 'camera_enhance'}
            </span>
         </button>
      </div>
    </div>
  );
};
