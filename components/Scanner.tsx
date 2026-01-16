
import React, { useEffect, useRef, useState } from 'react';
import { identifyFilmStock, IdentificationResult } from '../services/geminiService';

interface ScannerProps {
  onScanComplete: (result: IdentificationResult, image: string) => void;
  onClose: () => void;
}

// Fixed: Using 'var' inside 'declare global' instead of 'interface Window' to avoid "identical modifiers" error.
// This ensures 'aistudio' is recognized as a global property available on the window object.
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  var aistudio: AIStudio;
}

export const Scanner: React.FC<ScannerProps> = ({ onScanComplete, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [keySelected, setKeySelected] = useState<boolean | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  useEffect(() => {
    checkApiKey();
    startCamera();
    return () => stopCamera();
  }, []);

  const checkApiKey = async () => {
    if (window.aistudio) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      setKeySelected(hasKey);
      if (!hasKey) setShowConfig(true);
    }
  };

  const startCamera = async () => {
    try {
      const constraints = { 
        video: { facingMode: 'environment', width: { ideal: 1280 } } 
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
    } catch (err) {
      setErrorCode("CAMERA_DENIED");
    }
  };

  const stopCamera = () => {
    if (stream) stream.getTracks().forEach(track => track.stop());
  };

  const handleOpenKeySelector = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      // Assume success after trigger to avoid race conditions as per guidelines
      setKeySelected(true);
      setShowConfig(false);
      setErrorCode(null);
    }
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current || isAnalyzing) return;
    
    // 如果没有选择密钥，拦截并弹出配置
    if (!keySelected) {
      setShowConfig(true);
      return;
    }

    setIsAnalyzing(true);
    setErrorCode(null);
    
    const context = canvasRef.current.getContext('2d');
    if (context) {
      const TARGET_WIDTH = 640;
      const scale = TARGET_WIDTH / videoRef.current.videoWidth;
      const targetHeight = videoRef.current.videoHeight * scale;

      canvasRef.current.width = TARGET_WIDTH;
      canvasRef.current.height = targetHeight;
      context.drawImage(videoRef.current, 0, 0, TARGET_WIDTH, targetHeight);
      
      const imageData = canvasRef.current.toDataURL('image/jpeg', 0.6);
      
      try {
        const result = await identifyFilmStock(imageData);
        onScanComplete(result, imageData);
      } catch (error: any) {
        console.error("AI Error:", error);
        const errorMsg = error.message || "";
        
        // Handle invalid key error as per guidelines
        if (errorMsg.includes("Requested entity was not found") || errorMsg.includes("API_KEY")) {
          setKeySelected(false);
          setShowConfig(true);
          setErrorCode("INVALID_KEY");
        } else {
          setErrorCode("API_FAILURE");
        }
        setIsAnalyzing(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-between overflow-hidden font-mono selection:bg-primary selection:text-white">
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
                      setErrorCode("API_FAILURE");
                  }
              };
              reader.readAsDataURL(e.target.files[0]);
          }
      }} />

      {/* 核心取景器 */}
      <div className="absolute inset-0 z-0">
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover opacity-60 grayscale-[0.3]" />
        
        {/* 电影感叠加层 */}
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 py-16">
            <div className="flex justify-between items-start">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <div className={`size-2 rounded-full ${keySelected ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]' : 'bg-red-500 animate-pulse'} `}></div>
                        <span className="text-[10px] text-white/40 tracking-[0.3em] uppercase">AI Link Status: {keySelected ? 'Encrypted' : 'Required'}</span>
                    </div>
                    <div className="text-[8px] text-white/20 uppercase tracking-widest">System Model: gemini-3-flash</div>
                </div>
                <div className="text-right">
                    <div className="text-[10px] text-primary/60 font-black tracking-widest uppercase italic">Kodak Vision 3 / 500T</div>
                    <div className="text-[8px] text-white/20 uppercase mt-1">Ref: 7219-014-A</div>
                </div>
            </div>

            {/* 左右齿孔装饰 */}
            <div className="absolute inset-y-0 left-3 flex flex-col justify-around py-32 opacity-20">
                {[...Array(10)].map((_, i) => <div key={i} className="size-3 rounded-sm bg-white border border-black"></div>)}
            </div>
            <div className="absolute inset-y-0 right-3 flex flex-col justify-around py-32 opacity-20">
                {[...Array(10)].map((_, i) => <div key={i} className="size-3 rounded-sm bg-white border border-black"></div>)}
            </div>

            {/* 中心识别框 */}
            <div className="relative w-full max-w-sm aspect-[4/3] mx-auto border border-white/10 rounded-lg">
                <div className="absolute inset-0 bg-primary/5 rounded-lg"></div>
                {/* 激光扫描 */}
                <div className={`absolute left-0 right-0 h-0.5 bg-primary shadow-[0_0_15px_rgba(166,23,39,1)] ${isAnalyzing ? 'animate-[scan_1.5s_linear_infinite]' : 'animate-[scan_5s_ease-in-out_infinite]'}`}></div>
                
                {/* 四角 */}
                <div className="absolute top-0 left-0 size-4 border-t-2 border-l-2 border-primary/40 rounded-tl"></div>
                <div className="absolute top-0 right-0 size-4 border-t-2 border-r-2 border-primary/40 rounded-tr"></div>
                <div className="absolute bottom-0 left-0 size-4 border-b-2 border-l-2 border-primary/40 rounded-bl"></div>
                <div className="absolute bottom-0 right-0 size-4 border-b-2 border-r-2 border-primary/40 rounded-br"></div>

                {/* 实时分析动效 */}
                {isAnalyzing && (
                    <div className="absolute -bottom-10 left-0 right-0 text-center animate-fade-in">
                        <span className="text-[10px] text-primary font-bold uppercase tracking-[0.4em] animate-pulse">正在提取银盐特征...</span>
                    </div>
                )}
            </div>

            <div className="flex justify-between items-end text-[10px] text-white/30 tracking-[0.4em] px-4">
                <span>00:12:45:09</span>
                <span>REC ●</span>
                <span>FR: 24.00</span>
            </div>
        </div>
      </div>

      {/* 顶部控制 */}
      <div className="relative z-30 w-full flex items-center justify-between p-6 pt-[calc(env(safe-area-inset-top)+1rem)]">
        <button onClick={onClose} className="size-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/10 active:scale-90 transition-transform">
          <span className="material-symbols-outlined">close</span>
        </button>
        <div className="bg-black/60 backdrop-blur px-5 py-1.5 rounded-full border border-white/5 flex items-center gap-3">
            <span className="text-[9px] font-bold text-white/60 tracking-widest uppercase">Scanner V3.1</span>
            {errorCode && <span className="px-2 py-0.5 bg-red-500/20 text-red-500 text-[8px] rounded border border-red-500/30">ERROR: {errorCode}</span>}
        </div>
        <div className="size-12"></div>
      </div>

      {/* 错误与配置覆盖层 */}
      {showConfig && (
          <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 z-50 bg-[#0c0c0c]/95 backdrop-blur-xl border border-primary/30 p-8 rounded-3xl shadow-2xl animate-fade-in flex flex-col items-center text-center">
              <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-primary text-4xl">key_visualizer</span>
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight text-white mb-2">
                {errorCode === "INVALID_KEY" ? "API 认证失效" : "需要 AI 模块配置"}
              </h3>
              <p className="text-xs text-white/50 leading-relaxed mb-8 max-w-[240px]">
                由于 Vercel 的安全策略，你需要手动选择 API 密钥以启动 AI 识别功能。
                <br/><a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-primary underline mt-2 inline-block">了解计费详情</a>
              </p>
              <button 
                onClick={handleOpenKeySelector}
                className="w-full py-4 bg-primary text-white font-bold rounded-2xl uppercase tracking-widest text-sm shadow-[0_10px_30px_rgba(166,23,39,0.3)] active:scale-95 transition-all"
              >
                立即配置 API 密钥
              </button>
              <button onClick={() => setShowConfig(false)} className="mt-6 text-[10px] text-white/30 uppercase tracking-widest hover:text-white transition-colors">暂时忽略</button>
          </div>
      )}

      {/* 底部交互 */}
      <div className="relative z-30 w-full p-8 pb-[calc(env(safe-area-inset-bottom)+2rem)] flex flex-col items-center gap-6 bg-gradient-to-t from-black via-black/80 to-transparent">
        
        <div className="flex items-center justify-between w-full max-w-xs px-4">
          <button onClick={() => fileInputRef.current?.click()} className="size-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center active:scale-90 transition-all group">
            <span className="material-symbols-outlined text-white/40 group-hover:text-primary transition-colors">add_photo_alternate</span>
          </button>

          <button 
            onClick={captureAndAnalyze}
            disabled={isAnalyzing}
            className="group relative size-24 rounded-full bg-white/5 p-1 border-4 border-white/10 active:scale-95 transition-all disabled:opacity-50"
          >
            <div className="size-full rounded-full bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center shadow-[0_0_40px_rgba(166,23,39,0.3)]">
                 <span className={`material-symbols-outlined text-white text-5xl transition-transform ${isAnalyzing ? 'animate-spin' : ''}`}>
                    {isAnalyzing ? 'sync' : 'camera'}
                 </span>
            </div>
            {!isAnalyzing && <div className="absolute inset-[-6px] border border-primary/30 rounded-full animate-ping opacity-20"></div>}
          </button>

          <button onClick={() => setShowConfig(true)} className="size-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center active:scale-90 transition-all group">
            <span className={`material-symbols-outlined transition-colors ${keySelected ? 'text-primary' : 'text-white/40 group-hover:text-primary'}`}>
                {keySelected ? 'verified' : 'vpn_key'}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-4 text-[9px] text-white/20 tracking-[0.5em] uppercase font-bold">
            <span className="size-1.5 rounded-full bg-primary animate-pulse"></span>
            Vision Module Ready
        </div>
      </div>

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
