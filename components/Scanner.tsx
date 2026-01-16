
import React, { useEffect, useRef, useState } from 'react';
import { identifyFilmStock, IdentificationResult, getApiKey } from '../services/geminiService';

interface ScannerProps {
  onScanComplete: (result: IdentificationResult, image: string) => void;
  onClose: () => void;
}

export const Scanner: React.FC<ScannerProps> = ({ onScanComplete, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<string>('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [showConfigHint, setShowConfigHint] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  useEffect(() => {
    checkApiKey();
    startCamera();
    return () => stopCamera();
  }, []);

  const checkApiKey = () => {
    const key = getApiKey();
    if (key && key.trim() !== '') {
      setHasApiKey(true);
      setShowConfigHint(false);
    } else {
      setHasApiKey(false);
      setShowConfigHint(true);
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
      setErrorCode("无法启动摄像头，请检查权限。");
    }
  };

  const stopCamera = () => {
    if (stream) stream.getTracks().forEach(track => track.stop());
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current || isAnalyzing) return;
    
    const key = getApiKey();
    if (!key) {
      setShowConfigHint(true);
      return;
    }

    setIsAnalyzing(true);
    setAnalysisStatus('正在捕捉影像...');
    setErrorCode(null);
    
    const context = canvasRef.current.getContext('2d');
    if (context && videoRef.current) {
      const videoWidth = videoRef.current.videoWidth;
      const videoHeight = videoRef.current.videoHeight;
      const TARGET_WIDTH = 1000;
      const scale = TARGET_WIDTH / videoWidth;
      const targetHeight = videoHeight * scale;

      canvasRef.current.width = TARGET_WIDTH;
      canvasRef.current.height = targetHeight;
      context.drawImage(videoRef.current, 0, 0, TARGET_WIDTH, targetHeight);
      
      const imageData = canvasRef.current.toDataURL('image/jpeg', 0.8);
      
      try {
        setAnalysisStatus('AI 正在分析包装特征...');
        const result = await identifyFilmStock(imageData);
        onScanComplete(result, imageData);
      } catch (error: any) {
        console.error("Scanner Error:", error);
        setErrorCode(error.message === "API_KEY_MISSING" ? "需要 API 密钥" : "识别失败，请尝试更清晰的角度。");
        setIsAnalyzing(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-between overflow-hidden font-mono text-white select-none">
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Viewfinder Background */}
      <div className="absolute inset-0 z-0">
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover opacity-70" />
        
        {/* Overlay Decoration */}
        <div className="absolute inset-0 z-10 p-6 pt-[calc(env(safe-area-inset-top)+1rem)] pb-[calc(env(safe-area-inset-bottom)+1rem)] pointer-events-none flex flex-col justify-between">
            {/* Top Stats Overlay */}
            <div className="flex justify-between items-start opacity-60">
                <div className="space-y-1">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                        <div className={`size-1.5 rounded-full ${hasApiKey ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                        SYSTEM {hasApiKey ? 'ONLINE' : 'LOCKED'}
                    </div>
                    <div className="text-[9px] text-white/40 uppercase">GEMINI VISION ENGINE v3.0</div>
                </div>
                <div className="text-right space-y-1">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em]">AF-S 24mm f/1.8</div>
                    <div className="text-[9px] text-white/40 uppercase">MULTI-POINT METERING</div>
                </div>
            </div>

            {/* Central Viewfinder Frame */}
            <div className="relative w-full max-w-sm aspect-[4/5] mx-auto flex items-center justify-center">
                {/* Frame Corners */}
                <div className="absolute top-0 left-0 size-8 border-t-2 border-l-2 border-primary"></div>
                <div className="absolute top-0 right-0 size-8 border-t-2 border-r-2 border-primary"></div>
                <div className="absolute bottom-0 left-0 size-8 border-b-2 border-l-2 border-primary"></div>
                <div className="absolute bottom-0 right-0 size-8 border-b-2 border-r-2 border-primary"></div>

                {/* Perforation Details (Fake film look) */}
                <div className="absolute -left-8 top-0 bottom-0 w-4 flex flex-col justify-around opacity-20">
                    {[...Array(6)].map((_, i) => <div key={i} className="size-2 bg-white rounded-sm"></div>)}
                </div>
                <div className="absolute -right-8 top-0 bottom-0 w-4 flex flex-col justify-around opacity-20">
                    {[...Array(6)].map((_, i) => <div key={i} className="size-2 bg-white rounded-sm"></div>)}
                </div>

                {/* Scanning Animation */}
                <div className="relative w-full h-full overflow-hidden bg-primary/5 backdrop-blur-[1px]">
                    <div className={`absolute top-0 left-0 right-0 h-1 bg-primary/80 shadow-[0_0_20px_rgba(166,23,39,1)] transition-all ${isAnalyzing ? 'animate-[scan_1.5s_linear_infinite]' : 'top-1/2 opacity-30'}`}></div>
                    
                    {!isAnalyzing && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                            <span className="material-symbols-outlined text-white/10 text-6xl">filter_center_focus</span>
                            <div className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] text-center px-8 leading-relaxed">
                                Align film package<br/>within frame
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Status Overlay */}
            <div className="text-center">
                 {isAnalyzing ? (
                     <div className="inline-flex items-center gap-3 px-6 py-2 bg-black border border-primary/40 rounded-full animate-fade-in shadow-2xl">
                         <div className="size-2 bg-primary rounded-full animate-ping"></div>
                         <span className="text-[11px] font-black uppercase tracking-[0.4em] text-primary">{analysisStatus}</span>
                     </div>
                 ) : errorCode ? (
                     <div className="inline-flex items-center gap-3 px-6 py-2 bg-red-600/20 border border-red-500/50 rounded-full text-red-500">
                         <span className="material-symbols-outlined text-sm">error</span>
                         <span className="text-[10px] font-black uppercase tracking-widest">{errorCode}</span>
                     </div>
                 ) : (
                    <div className="text-[9px] text-white/30 uppercase tracking-[0.5em] font-black">
                        Ready to Archive
                    </div>
                 )}
            </div>
        </div>
      </div>

      {/* Actual UI Controls (Always visible) */}
      <div className="relative z-20 w-full p-6 pt-[calc(env(safe-area-inset-top)+1rem)] flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
        <button onClick={onClose} className="size-12 rounded-full bg-white/5 backdrop-blur-md flex items-center justify-center border border-white/10 active:scale-90 transition-all">
          <span className="material-symbols-outlined">close</span>
        </button>
        <div className="flex flex-col items-center">
            <span className="text-xs font-black uppercase tracking-widest leading-none">Scanning Engine</span>
            <div className="w-12 h-0.5 bg-primary mt-1"></div>
        </div>
        <div className="size-12"></div>
      </div>

      {/* Shutter Button area */}
      <div className="relative z-20 w-full p-10 pb-[calc(env(safe-area-inset-bottom)+2rem)] flex justify-center items-center bg-gradient-to-t from-black/80 to-transparent">
        <button 
          onClick={captureAndAnalyze}
          disabled={isAnalyzing}
          className="relative group disabled:opacity-50 transition-all active:scale-95"
        >
          {/* Inner Button */}
          <div className="size-24 rounded-full bg-white/10 backdrop-blur-sm border-2 border-white/20 p-2 group-hover:border-primary transition-colors">
            <div className="size-full rounded-full bg-primary flex items-center justify-center shadow-[0_0_30px_rgba(166,23,39,0.3)]">
                <span className={`material-symbols-outlined text-white text-4xl ${isAnalyzing ? 'animate-spin' : ''}`}>
                    {isAnalyzing ? 'sync' : 'shutter_speed'}
                </span>
            </div>
          </div>
          {/* Circular Rings Decoration */}
          <div className="absolute -inset-4 border border-white/5 rounded-full animate-spin-slow pointer-events-none"></div>
          <div className="absolute -inset-8 border border-white/5 rounded-full animate-reverse-spin-slow pointer-events-none"></div>
        </button>
      </div>

      {/* API Key Hint Modal */}
      {showConfigHint && (
          <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 z-[100] bg-[#0c0c0c] border-2 border-primary/40 p-10 rounded-3xl text-center shadow-2xl animate-fade-in backdrop-blur-2xl">
              <div className="size-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-primary text-5xl">vpn_key</span>
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tighter text-white mb-3">AI 锁定 (Engine Locked)</h3>
              <p className="text-xs text-white/50 leading-relaxed mb-10 max-w-[240px] mx-auto uppercase tracking-wider">
                需要有效的 Gemini API Key 才能启动胶片识别引擎。<br/>请前往个人设置页面。
              </p>
              <button 
                onClick={onClose}
                className="w-full py-5 bg-primary text-white font-black rounded-xl uppercase text-xs tracking-[0.2em] active:scale-95 transition-all shadow-xl shadow-primary/20"
              >
                前往配置 (Setup Key)
              </button>
          </div>
      )}

      <style>{`
        @keyframes scan {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(400px); opacity: 1; }
        }
        @keyframes reverse-spin-slow {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        .animate-reverse-spin-slow {
          animation: reverse-spin-slow 20s linear infinite;
        }
      `}</style>
    </div>
  );
};
