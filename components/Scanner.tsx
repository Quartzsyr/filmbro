
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
  const [keySelected, setKeySelected] = useState<boolean>(false);
  const [showConfig, setShowConfig] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  useEffect(() => {
    checkApiKey();
    startCamera();
    return () => stopCamera();
  }, []);

  const checkApiKey = async () => {
    // 1. 检查手动配置
    const manualKey = localStorage.getItem('GEMINI_API_KEY');
    if (manualKey && manualKey.trim() !== '') {
      setKeySelected(true);
      return;
    }

    // 2. 检查平台 Key
    if (window.aistudio) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      setKeySelected(hasKey);
      if (!hasKey) setShowConfig(true);
    } else if (process.env.API_KEY) {
      setKeySelected(true);
    } else {
      setShowConfig(true);
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
      setKeySelected(true);
      setShowConfig(false);
      setErrorCode(null);
    } else {
      // 引导用户去 Profile 设置
      alert("请前往“我的”界面手动输入 API Key");
    }
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current || isAnalyzing) return;
    
    if (!keySelected && !getApiKey()) {
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
        console.error("Scanner AI Error:", error);
        const errorMsg = error.message || "";
        
        if (errorMsg.includes("Requested entity was not found") || errorMsg.includes("API_KEY") || errorMsg.includes("API_KEY_MISSING")) {
          setKeySelected(false);
          setShowConfig(true);
          setErrorCode("KEY_ERROR");
        } else {
          setErrorCode("ANALYSIS_FAILED");
        }
        setIsAnalyzing(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-between overflow-hidden font-mono">
      <canvas ref={canvasRef} className="hidden" />
      
      {/* 取景器 */}
      <div className="absolute inset-0 z-0">
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover opacity-60" />
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 py-16">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full border border-white/10">
                    <div className={`size-2 rounded-full ${keySelected || getApiKey() ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></div>
                    <span className="text-[10px] text-white/70 uppercase tracking-widest">{keySelected || getApiKey() ? 'AI Ready' : 'Key Required'}</span>
                </div>
            </div>
            
            <div className="relative w-full max-w-sm aspect-square mx-auto border border-white/10 rounded-3xl flex items-center justify-center overflow-hidden">
                <div className={`absolute left-0 right-0 h-0.5 bg-primary shadow-[0_0_15px_rgba(166,23,39,1)] ${isAnalyzing ? 'animate-[scan_1.5s_linear_infinite]' : 'top-1/2'}`}></div>
            </div>
        </div>
      </div>

      {/* 顶部按钮 */}
      <div className="relative z-30 w-full flex items-center justify-between p-6 pt-[calc(env(safe-area-inset-top)+1rem)]">
        <button onClick={onClose} className="size-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/10"><span className="material-symbols-outlined">close</span></button>
      </div>

      {/* 密钥配置引导 */}
      {showConfig && (
          <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 z-50 bg-[#0c0c0c]/95 backdrop-blur-xl border border-primary/30 p-8 rounded-3xl text-center animate-fade-in shadow-2xl">
              <span className="material-symbols-outlined text-primary text-5xl mb-4">vpn_key</span>
              <h3 className="text-xl font-black uppercase tracking-tight text-white mb-2">需要 AI 密钥</h3>
              <p className="text-xs text-white/50 leading-relaxed mb-8">
                该功能需要 Gemini API Key 支持。请前往“我的”界面手动设置，或点击下方按钮。
              </p>
              <button 
                onClick={handleOpenKeySelector}
                className="w-full py-4 bg-primary text-white font-bold rounded-2xl uppercase text-xs shadow-lg active:scale-95 transition-all"
              >
                立即配置
              </button>
          </div>
      )}

      {/* 底部快门 */}
      <div className="relative z-30 w-full p-8 pb-[calc(env(safe-area-inset-bottom)+2rem)] flex flex-col items-center gap-6 bg-gradient-to-t from-black to-transparent">
        <button 
          onClick={captureAndAnalyze}
          disabled={isAnalyzing}
          className="size-24 rounded-full bg-primary p-1 border-4 border-white/10 active:scale-95 transition-all disabled:opacity-50"
        >
          <div className="size-full rounded-full flex items-center justify-center">
             <span className={`material-symbols-outlined text-white text-5xl ${isAnalyzing ? 'animate-spin' : ''}`}>
                {isAnalyzing ? 'sync' : 'camera'}
             </span>
          </div>
        </button>
      </div>

      <style>{`
        @keyframes scan { 0% { top: 0; } 100% { top: 100%; } }
      `}</style>
    </div>
  );
};
