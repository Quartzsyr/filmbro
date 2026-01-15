import React, { useEffect, useRef, useState } from 'react';
import { identifyFilmStock, IdentificationResult } from '../services/geminiService';
import { View } from '../types';

interface ScannerProps {
  onScanComplete: (result: IdentificationResult, image: string) => void;
  onClose: () => void;
}

export const Scanner: React.FC<ScannerProps> = ({ onScanComplete, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Camera access denied", err);
      alert("无法访问相机，请检查权限设置");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current || isAnalyzing) return;

    setIsAnalyzing(true);

    const context = canvasRef.current.getContext('2d');
    if (context) {
      // Set canvas dimensions to match video
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      
      // Draw video frame to canvas
      context.drawImage(videoRef.current, 0, 0);
      
      // Get base64 string
      const imageData = canvasRef.current.toDataURL('image/jpeg', 0.8);
      
      // Send to AI
      try {
        const result = await identifyFilmStock(imageData);
        onScanComplete(result, imageData);
      } catch (error) {
        alert("识别失败，请重试");
        setIsAnalyzing(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-between overflow-hidden">
      {/* Hidden Canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Camera Feed */}
      <div className="absolute inset-0 z-0">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          className="w-full h-full object-cover opacity-90"
        />
        {/* Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)]"></div>
        {/* Grain Overlay */}
        <div className="absolute inset-0 bg-noise opacity-20 mix-blend-overlay"></div>
      </div>

      {/* Grid Lines */}
      <div className="absolute inset-0 z-10 pointer-events-none opacity-30">
        <div className="w-full h-full grid grid-cols-3 grid-rows-3">
            <div className="border-r border-b border-white/20"></div>
            <div className="border-r border-b border-white/20"></div>
            <div className="border-b border-white/20"></div>
            <div className="border-r border-b border-white/20"></div>
            <div className="border-r border-b border-white/20"></div>
            <div className="border-b border-white/20"></div>
            <div className="border-r border-white/20"></div>
            <div className="border-r border-white/20"></div>
            <div></div>
        </div>
      </div>

      {/* Top Controls */}
      <div className="relative z-30 w-full flex items-center justify-between p-6 pt-12 bg-gradient-to-b from-black/80 to-transparent">
        <button 
            onClick={onClose}
            className="flex items-center justify-center size-12 rounded-full bg-white/5 backdrop-blur-md text-white hover:bg-primary/20 transition-colors border border-white/10"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
        <div className="flex gap-4">
            <button className="flex flex-col items-center justify-center size-12 rounded-full bg-primary/20 backdrop-blur-md text-primary-hover border border-primary/30">
                <span className="material-symbols-outlined text-[20px]">flash_on</span>
            </button>
        </div>
      </div>

      {/* Focus Area / Reticle */}
      <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
        <div className="relative size-[72vw] max-w-[320px] max-h-[320px] aspect-square">
            {/* Outer Ring */}
            <div className="absolute inset-0 rounded-full border border-white/30 shadow-[0_0_30px_rgba(0,0,0,0.5)]"></div>
            {/* Inner Scanning Ring */}
            <div className={`absolute inset-2 rounded-full border border-white/10 border-dashed ${isAnalyzing ? 'animate-spin' : 'animate-spin-slow'}`}></div>
            
            {/* Detection Tag */}
            {isAnalyzing && (
                <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-max max-w-xs animate-bounce">
                    <div className="flex items-center gap-2 px-4 py-2 rounded bg-primary/90 backdrop-blur text-white text-xs font-bold tracking-wide shadow-lg border border-white/10">
                        <span className="material-symbols-outlined text-[14px] animate-spin">sync</span>
                        <span>AI 识别中...</span>
                    </div>
                </div>
            )}
            
            {!isAnalyzing && (
                 <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-max max-w-xs">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-black/40 backdrop-blur text-white/80 text-xs font-bold tracking-wide border border-white/10">
                        <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                        <span>对准胶卷盒</span>
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="relative z-30 w-full flex flex-col items-center pb-12 pt-12 bg-gradient-to-t from-background-dark via-background-dark/90 to-transparent">
        <div className="flex items-center justify-between w-full px-12 max-w-md">
            {/* Placeholder Gallery Button */}
            <button className="relative size-12 rounded bg-surface-dark border border-white/20 overflow-hidden opacity-50">
            </button>

            {/* Shutter Button */}
            <div className="relative group">
                <div className="absolute -inset-1 rounded-full bg-primary/20 blur-md group-hover:bg-primary/40 transition-all"></div>
                <button 
                    onClick={captureAndAnalyze}
                    disabled={isAnalyzing}
                    className="relative flex items-center justify-center size-20 rounded-full border-4 border-white/10 bg-gradient-to-br from-primary to-[#800f1c] shadow-[inset_0_2px_4px_rgba(255,255,255,0.2),0_4px_12px_rgba(0,0,0,0.5)] active:scale-95 transition-all duration-150 disabled:opacity-50"
                >
                    <div className="size-16 rounded-full border border-black/20 bg-transparent"></div>
                </button>
            </div>

            {/* Manual Mode */}
            <button className="flex items-center justify-center size-12 rounded-full bg-transparent text-white/50 hover:text-white transition-colors">
                <span className="material-symbols-outlined text-[28px]">tune</span>
            </button>
        </div>
        
        <div className="mt-8 flex gap-6 text-[10px] font-mono text-white/30 uppercase tracking-widest">
            <span>AI Auto</span>
            <span>•</span>
            <span>Macro</span>
            <span>•</span>
            <span>RAW</span>
        </div>
      </div>
    </div>
  );
};
