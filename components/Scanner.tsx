
import React, { useEffect, useRef, useState } from 'react';
import { identifyFilmStock, IdentificationResult, getApiKey } from '../services/geminiService';

interface ScannerProps {
  onScanComplete: (result: IdentificationResult, image: string) => void;
  onClose: () => void;
}

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
  const [hasValidKey, setHasValidKey] = useState(false);
  const [showConfigHint, setShowConfigHint] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    checkKeyStatus();
    startCamera();
    return () => stopCamera();
  }, []);

  const checkKeyStatus = async () => {
    // 优先检查本地手动配置的 Key
    const localKey = getApiKey();
    if (localKey) {
      setHasValidKey(true);
      return;
    }

    // 其次检查平台自动注入的 Key 状态
    if (window.aistudio) {
      const platformKey = await window.aistudio.hasSelectedApiKey();
      setHasValidKey(platformKey);
      if (!platformKey) setShowConfigHint(true);
    } else {
      setShowConfigHint(true);
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 } } 
      });
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
    } catch (err) {
      setErrorMessage("无法访问摄像头");
    }
  };

  const stopCamera = () => {
    if (stream) stream.getTracks().forEach(track => track.stop());
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current || isAnalyzing) return;
    
    // 如果没有 Key，提示去配置
    if (!hasValidKey) {
      setShowConfigHint(true);
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);
    
    const context = canvasRef.current.getContext('2d');
    if (context) {
      canvasRef.current.width = 640;
      canvasRef.current.height = (videoRef.current.videoHeight / videoRef.current.videoWidth) * 640;
      context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
      const imageData = canvasRef.current.toDataURL('image/jpeg', 0.6);
      
      try {
        const result = await identifyFilmStock(imageData);
        onScanComplete(result, imageData);
      } catch (error: any) {
        if (error.message === "API_KEY_MISSING") {
          setHasValidKey(false);
          setShowConfigHint(true);
        } else {
          setErrorMessage("识别失败，请确保拍摄清晰");
        }
        setIsAnalyzing(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-between overflow-hidden font-mono">
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Viewfinder */}
      <div className="absolute inset-0 z-0">
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover opacity-60" />
        <div className="absolute inset-0 pointer-events-none p-6 py-16 flex flex-col justify-between">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full border border-white/10">
                    <div className={`size-2 rounded-full ${hasValidKey ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,1)]' : 'bg-red-500 animate-pulse'}`}></div>
                    <span className="text-[10px] text-white/70 uppercase tracking-widest">{hasValidKey ? 'AI Ready' : 'API Key Required'}</span>
                </div>
            </div>
            
            <div className="relative w-full max-w-sm aspect-square mx-auto border border-white/10 rounded-3xl flex items-center justify-center overflow-hidden">
                <div className={`absolute inset-0 bg-primary/5 ${isAnalyzing ? 'animate-pulse' : ''}`}></div>
                <div className={`absolute left-0 right-0 h-0.5 bg-primary shadow-[0_0_15px_rgba(166,23,39,1)] transition-all duration-1000 ${isAnalyzing ? 'animate-[scan_1.5s_linear_infinite]' : 'top-1/2'}`}></div>
            </div>

            <div className="text-center">
                {errorMessage && <div className="text-red-500 text-[10px] font-bold bg-red-500/10 py-1 px-4 rounded-full border border-red-500/20 inline-block">{errorMessage}</div>}
            </div>
        </div>
      </div>

      {/* Header */}
      <div className="relative z-30 w-full flex items-center justify-between p-6 pt-[calc(env(safe-area-inset-top)+1rem)]">
        <button onClick={onClose} className="size-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/10"><span className="material-symbols-outlined">close</span></button>
      </div>

      {/* API Key Hint Overlay */}
      {showConfigHint && (
          <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 z-50 bg-[#0c0c0c]/95 backdrop-blur-xl border border-primary/30 p-8 rounded-[2.5rem] text-center animate-fade-in shadow-2xl">
              <span className="material-symbols-outlined text-primary text-5xl mb-4">vpn_key</span>
              <h3 className="text-xl font-black uppercase text-white mb-2">需要 AI 密钥</h3>
              <p className="text-xs text-white/50 leading-relaxed mb-8">
                  请前往“我的”界面配置 Gemini API Key，或在此点击按钮从平台选择。
              </p>
              <div className="flex flex-col gap-3">
                  <button 
                    onClick={async () => {
                        if (window.aistudio) {
                            await window.aistudio.openSelectKey();
                            setHasValidKey(true);
                            setShowConfigHint(false);
                        }
                    }}
                    className="w-full py-4 bg-primary text-white font-bold rounded-2xl uppercase text-xs"
                  >
                    平台选择 Key
                  </button>
                  <button 
                    onClick={onClose}
                    className="w-full py-4 bg-white/5 text-white/50 font-bold rounded-2xl uppercase text-xs"
                  >
                    前往“我的”手动输入
                  </button>
              </div>
          </div>
      )}

      {/* Footer */}
      <div className="relative z-30 w-full p-8 pb-[calc(env(safe-area-inset-bottom)+2rem)] flex justify-center items-center bg-gradient-to-t from-black to-transparent">
        <button 
          onClick={captureAndAnalyze}
          disabled={isAnalyzing}
          className="size-24 rounded-full bg-primary p-1 shadow-[0_0_30px_rgba(166,23,39,0.4)] active:scale-90 transition-transform disabled:opacity-50"
        >
          <div className="size-full rounded-full border-4 border-white/20 flex items-center justify-center">
             <span className={`material-symbols-outlined text-white text-5xl ${isAnalyzing ? 'animate-spin' : ''}`}>
                {isAnalyzing ? 'sync' : 'camera'}
             </span>
          </div>
        </button>
      </div>

      <style>{` @keyframes scan { 0% { top: 0; } 100% { top: 100%; } } `}</style>
    </div>
  );
};
