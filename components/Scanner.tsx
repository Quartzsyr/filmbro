
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
    
    // 实时检查 Key
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
      // 保持合适的识别比例
      const videoWidth = videoRef.current.videoWidth;
      const videoHeight = videoRef.current.videoHeight;
      const TARGET_WIDTH = 800;
      const scale = TARGET_WIDTH / videoWidth;
      const targetHeight = videoHeight * scale;

      canvasRef.current.width = TARGET_WIDTH;
      canvasRef.current.height = targetHeight;
      context.drawImage(videoRef.current, 0, 0, TARGET_WIDTH, targetHeight);
      
      const imageData = canvasRef.current.toDataURL('image/jpeg', 0.6);
      
      try {
        setAnalysisStatus('AI 正在分析包装特征...');
        const result = await identifyFilmStock(imageData);
        onScanComplete(result, imageData);
      } catch (error: any) {
        console.error("Scanner Error:", error);
        if (error.message === "API_KEY_MISSING") {
          setShowConfigHint(true);
        } else {
          setErrorCode("识别失败，请尝试更清晰的角度。");
        }
        setIsAnalyzing(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-between overflow-hidden font-mono text-white">
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Viewfinder */}
      <div className="absolute inset-0 z-0">
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover opacity-60" />
        <div className="absolute inset-0 pointer-events-none p-6 py-20 flex flex-col justify-between border-[20px] border-black/20">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full border border-white/10">
                    <div className={`size-2 rounded-full ${hasApiKey ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></div>
                    <span className="text-[10px] text-white/70 uppercase tracking-widest">{hasApiKey ? 'AI 识别已就绪' : '等待 API 密钥'}</span>
                </div>
                <div className="text-[10px] bg-black/40 px-3 py-1 rounded border border-white/10">AF-S 24mm</div>
            </div>
            
            <div className="relative w-full max-w-sm aspect-[3/4] mx-auto border border-white/20 rounded-2xl flex items-center justify-center overflow-hidden">
                <div className={`absolute inset-0 bg-primary/5 ${isAnalyzing ? 'animate-pulse' : ''}`}></div>
                {/* Scanning Line */}
                <div className={`absolute left-0 right-0 h-0.5 bg-primary shadow-[0_0_15px_rgba(166,23,39,1)] ${isAnalyzing ? 'animate-[scan_1.5s_linear_infinite]' : 'top-1/2 opacity-50'}`}></div>
                
                {!isAnalyzing && !errorCode && (
                    <div className="text-[10px] font-bold text-white/30 uppercase text-center max-w-[150px] leading-relaxed">
                        请将胶卷包装盒置于方框内
                    </div>
                )}
            </div>

            <div className="text-center">
                {analysisStatus && !errorCode && (
                    <div className="inline-flex items-center gap-2 bg-black/60 px-4 py-2 rounded-full border border-primary/30 animate-fade-in">
                        <span className="material-symbols-outlined text-sm animate-spin text-primary">sync</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest">{analysisStatus}</span>
                    </div>
                )}
                {errorCode && (
                    <div className="bg-red-500/20 text-red-500 text-[10px] px-4 py-2 rounded border border-red-500/30">
                        {errorCode}
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* Header */}
      <div className="relative z-30 w-full flex items-center justify-between p-6 pt-[calc(env(safe-area-inset-top)+1rem)]">
        <button onClick={onClose} className="size-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/10 active:scale-90">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {/* API Key Modal Hint */}
      {showConfigHint && (
          <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 z-50 bg-[#0c0c0c]/95 backdrop-blur-xl border border-primary/30 p-8 rounded-[2.5rem] text-center animate-fade-in shadow-2xl">
              <span className="material-symbols-outlined text-primary text-5xl mb-4">vpn_key</span>
              <h3 className="text-xl font-black uppercase tracking-tighter text-white mb-2">需要 API 密钥</h3>
              <p className="text-xs text-white/50 leading-relaxed mb-8">
                AI 识别功能需要您提供 Gemini API Key。请前往“我的”界面进行配置。
              </p>
              <button 
                onClick={onClose}
                className="w-full py-4 bg-primary text-white font-bold rounded-2xl uppercase text-xs active:scale-95 transition-all"
              >
                前往配置
              </button>
          </div>
      )}

      {/* Shutter Button Container */}
      <div className="relative z-30 w-full p-8 pb-[calc(env(safe-area-inset-bottom)+2rem)] flex justify-center items-center bg-gradient-to-t from-black via-black/80 to-transparent">
        <button 
          onClick={captureAndAnalyze}
          disabled={isAnalyzing}
          className="size-24 rounded-full bg-primary p-1 shadow-[0_0_30px_rgba(166,23,39,0.4)] active:scale-90 transition-transform disabled:opacity-50 disabled:grayscale"
        >
          <div className="size-full rounded-full border-4 border-white/20 flex items-center justify-center">
             <span className={`material-symbols-outlined text-white text-5xl ${isAnalyzing ? 'animate-spin' : ''}`}>
                {isAnalyzing ? 'sync' : 'camera'}
             </span>
          </div>
        </button>
      </div>

      <style>{`
        @keyframes scan {
          0% { top: 10%; }
          100% { top: 90%; }
        }
      `}</style>
    </div>
  );
};
