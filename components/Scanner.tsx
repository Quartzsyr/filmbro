
import React, { useEffect, useRef, useState } from 'react';
import { identifyFilmStock, IdentificationResult } from '../services/geminiService';

interface ScannerProps {
  onScanComplete: (result: IdentificationResult, image: string) => void;
  onClose: () => void;
}

// Fix: Redefine the global AIStudio interface and extend the Window interface
// using the named AIStudio type to avoid "identical modifiers" and "subsequent property" errors.
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio: AIStudio;
  }
}

export const Scanner: React.FC<ScannerProps> = ({ onScanComplete, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isManualMode, setIsManualMode] = useState(false);
  const [keyError, setKeyError] = useState(false);
  
  const [manualData, setManualData] = useState<IdentificationResult>({
    brand: '',
    name: '',
    iso: 400,
    type: 'Color Negative'
  });

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const constraints = { 
        video: { facingMode: 'environment', width: { ideal: 1024 } } 
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
    } catch (err) {
      alert("相机启动失败，请检查浏览器权限。");
    }
  };

  const stopCamera = () => {
    if (stream) stream.getTracks().forEach(track => track.stop());
  };

  const handleKeySetup = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setKeyError(false);
    } else {
      alert("环境不支持 API Key 动态选择，请检查部署配置。");
    }
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current || isAnalyzing) return;

    setIsAnalyzing(true);
    const context = canvasRef.current.getContext('2d');
    if (context) {
      // 极致压缩：限制为 640px 宽度
      const TARGET_WIDTH = 640;
      const scale = TARGET_WIDTH / videoRef.current.videoWidth;
      const targetHeight = videoRef.current.videoHeight * scale;

      canvasRef.current.width = TARGET_WIDTH;
      canvasRef.current.height = targetHeight;
      context.drawImage(videoRef.current, 0, 0, TARGET_WIDTH, targetHeight);
      
      // 0.5 质量的 JPEG，确保数据极小
      const imageData = canvasRef.current.toDataURL('image/jpeg', 0.5);
      
      try {
        const result = await identifyFilmStock(imageData);
        onScanComplete(result, imageData);
      } catch (error: any) {
        // Reset the key selection state if "Requested entity was not found" occurs or other key-related errors.
        if (error.message?.includes("API_KEY") || error.status === 403 || error.status === 404 || error.message?.includes("Requested entity was not found")) {
          setKeyError(true);
        } else {
          alert("识别失败，请重试。");
        }
        setIsAnalyzing(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-between overflow-hidden font-mono">
      <canvas ref={canvasRef} className="hidden" />
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
          if (e.target.files?.[0]) {
              const reader = new FileReader();
              reader.onload = async (ev) => {
                  const base64 = ev.target?.result as string;
                  setIsAnalyzing(true);
                  try {
                      const res = await identifyFilmStock(base64);
                      onScanComplete(res, base64);
                  } catch (e) {
                      setIsAnalyzing(false);
                  }
              };
              reader.readAsDataURL(e.target.files[0]);
          }
      }} />

      {/* 取景器 */}
      <div className="absolute inset-0 z-0">
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover opacity-60 grayscale-[0.2]" />
        
        {/* 电影底片装饰 */}
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 py-12">
            <div className="flex justify-between text-[10px] text-primary/60 font-black tracking-[0.5em] px-8">
                <span>KODAK 5072</span>
                <span>SAFETY FILM</span>
                <span>EASTMAN</span>
            </div>
            
            {/* 左右齿孔 */}
            <div className="absolute inset-y-0 left-2 flex flex-col justify-around py-20">
                {[...Array(8)].map((_, i) => <div key={i} className="size-4 rounded-sm border border-white/10 bg-black/40"></div>)}
            </div>
            <div className="absolute inset-y-0 right-2 flex flex-col justify-around py-20">
                {[...Array(8)].map((_, i) => <div key={i} className="size-4 rounded-sm border border-white/10 bg-black/40"></div>)}
            </div>

            <div className="flex justify-between text-[10px] text-primary/60 font-black tracking-[0.5em] px-8">
                <span>▶ 14A</span>
                <span>15</span>
                <span>▶ 15A</span>
            </div>
        </div>

        {/* 扫描动画区域 */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[50vw] max-w-md">
            <div className="absolute inset-0 border border-primary/40 rounded shadow-[0_0_20px_rgba(166,23,39,0.2)]"></div>
            {/* 激光扫描线 */}
            <div className={`absolute top-0 left-0 w-full h-1 bg-primary/80 blur-[2px] shadow-[0_0_15px_rgba(166,23,39,1)] ${isAnalyzing ? 'animate-[scan_1.5s_linear_infinite]' : 'animate-[scan_4s_ease-in-out_infinite]'}`}></div>
            
            {/* 动态测量数值 */}
            <div className="absolute -bottom-8 left-0 right-0 flex justify-between text-[8px] text-primary/80 uppercase">
                <span className="animate-pulse">LAT: 35.6895° N</span>
                <span className="animate-pulse">SCAN_RES: 800DPI</span>
            </div>
        </div>
      </div>

      {/* 顶部栏 */}
      <div className="relative z-30 w-full flex items-center justify-between p-6 pt-[calc(env(safe-area-inset-top)+1rem)]">
        <button onClick={onClose} className="size-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/10 active:scale-90 transition-transform">
          <span className="material-symbols-outlined">close</span>
        </button>
        <div className="bg-primary/20 backdrop-blur-md px-4 py-1.5 rounded-full border border-primary/30 text-[9px] font-bold text-primary uppercase tracking-[0.2em] animate-pulse">
          {isAnalyzing ? "正在解析感光特性..." : "等待捕捉胶卷"}
        </div>
        <div className="size-12"></div>
      </div>

      {/* 报错提示 (API KEY) */}
      {keyError && (
          <div className="absolute top-24 inset-x-6 z-50 bg-red-900/90 backdrop-blur border border-red-500 p-6 rounded-2xl animate-fade-in text-center">
              <span className="material-symbols-outlined text-4xl mb-2">key_off</span>
              <h3 className="font-bold mb-2">API 密钥未配置</h3>
              <p className="text-xs text-white/70 mb-4 leading-relaxed">在 Vercel 部署环境下需要手动授权或配置环境变量。点击下方按钮进行授权。</p>
              <button onClick={handleKeySetup} className="px-6 py-2 bg-white text-black rounded-full font-bold text-xs">选择 API 密钥</button>
          </div>
      )}

      {/* 底部控制 */}
      <div className="relative z-30 w-full p-8 pb-[calc(env(safe-area-inset-bottom)+2rem)] flex flex-col items-center gap-6 bg-gradient-to-t from-black via-black/60 to-transparent">
        
        <div className="flex items-center justify-between w-full max-w-xs">
          <button onClick={() => fileInputRef.current?.click()} className="size-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center active:scale-90 transition-all">
            <span className="material-symbols-outlined text-white/50">upload_file</span>
          </button>

          <button 
            onClick={captureAndAnalyze}
            disabled={isAnalyzing}
            className="group relative size-24 rounded-full bg-white/5 p-1 border-4 border-white/20 active:scale-95 transition-all"
          >
            <div className="size-full rounded-full bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center shadow-[0_0_30px_rgba(166,23,39,0.4)]">
                 <span className={`material-symbols-outlined text-white text-4xl ${isAnalyzing ? 'animate-spin' : ''}`}>
                    {isAnalyzing ? 'sync' : 'shutter_speed'}
                 </span>
            </div>
            {!isAnalyzing && <div className="absolute inset-[-4px] border border-primary/20 rounded-full animate-ping opacity-30"></div>}
          </button>

          <button onClick={() => setIsManualMode(!isManualMode)} className={`size-12 rounded-full border flex items-center justify-center transition-all active:scale-90 ${isManualMode ? 'bg-primary border-primary text-white' : 'bg-white/5 border-white/10 text-white/50'}`}>
            <span className="material-symbols-outlined">edit_note</span>
          </button>
        </div>

        <div className="text-[9px] text-white/30 tracking-[0.3em] uppercase flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-primary animate-pulse"></span>
            AI_VISION_MODULE_ENABLED
        </div>
      </div>

      {isManualMode && (
          <div className="absolute inset-x-0 bottom-0 z-40 bg-[#0a0a0a] border-t border-white/10 p-8 pt-10 rounded-t-[2.5rem] animate-fade-in">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold uppercase tracking-widest text-primary">手动录入</h3>
                <button onClick={() => setIsManualMode(false)} className="size-8 rounded-full bg-white/5 flex items-center justify-center"><span className="material-symbols-outlined">close</span></button>
              </div>
              <div className="space-y-4">
                  <div className="space-y-1">
                      <label className="text-[10px] text-white/40 uppercase">Brand</label>
                      <input type="text" placeholder="e.g. Kodak" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-primary transition-colors" onChange={e => setManualData({...manualData, brand: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                      <label className="text-[10px] text-white/40 uppercase">Film Name</label>
                      <input type="text" placeholder="e.g. Portra 400" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-primary transition-colors" onChange={e => setManualData({...manualData, name: e.target.value})} />
                  </div>
                  <button 
                    onClick={() => onScanComplete(manualData, 'https://images.unsplash.com/photo-1590483736622-39da8af75bba?auto=format&fit=crop&q=80&w=400')} 
                    className="w-full py-4 bg-primary text-white font-bold rounded-xl uppercase tracking-widest text-sm shadow-lg shadow-primary/20 active:scale-95"
                  >
                    确认录入库
                  </button>
              </div>
          </div>
      )}

      <style>{`
        @keyframes scan {
            0% { top: 0; opacity: 0; }
            15% { opacity: 1; }
            85% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};
