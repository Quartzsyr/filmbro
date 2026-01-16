import React, { useEffect, useRef, useState } from 'react';
import { identifyFilmStock, IdentificationResult } from '../services/geminiService';

interface ScannerProps {
  onScanComplete: (result: IdentificationResult, image: string) => void;
  onClose: () => void;
}

export const Scanner: React.FC<ScannerProps> = ({ onScanComplete, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);
  
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
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Camera access denied", err);
      alert("无法访问相机，请检查权限设置。若在桌面端，请尝试从相册上传。");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const toggleFlash = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    const capabilities = track.getCapabilities() as any;
    
    if (capabilities.torch) {
      try {
        await track.applyConstraints({
          advanced: [{ torch: !isFlashOn }]
        } as any);
        setIsFlashOn(!isFlashOn);
      } catch (err) {
        console.error("Flash control failed", err);
      }
    } else {
      alert("当前设备不支持闪光灯控制");
    }
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current || isAnalyzing) return;

    setIsAnalyzing(true);
    const context = canvasRef.current.getContext('2d');
    if (context) {
      // 移动端关键优化：限制最大像素宽度，防止 Base64 字符串过大导致 API 超时
      const MAX_WIDTH = 1024;
      let width = videoRef.current.videoWidth;
      let height = videoRef.current.videoHeight;

      if (width > MAX_WIDTH) {
        height = (MAX_WIDTH / width) * height;
        width = MAX_WIDTH;
      }

      canvasRef.current.width = width;
      canvasRef.current.height = height;
      context.drawImage(videoRef.current, 0, 0, width, height);
      
      // 使用 0.7 质量的 JPEG 进一步压缩体积
      const imageData = canvasRef.current.toDataURL('image/jpeg', 0.7);
      
      try {
        const result = await identifyFilmStock(imageData);
        onScanComplete(result, imageData);
      } catch (error) {
        alert("识别失败，请确保光线充足并对准胶卷标签。");
        setIsAnalyzing(false);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setIsAnalyzing(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        const result = await identifyFilmStock(base64);
        onScanComplete(result, base64);
      } catch (error) {
        alert("图片识别失败，请尝试换一张更清晰的照片。");
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const submitManual = () => {
    if (!manualData.brand || !manualData.name) {
      alert("请完整填写胶卷信息");
      return;
    }
    onScanComplete(manualData, 'https://images.unsplash.com/photo-1590483736622-39da8af75bba?auto=format&fit=crop&q=80&w=400');
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-between overflow-hidden">
      <canvas ref={canvasRef} className="hidden" />
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={handleFileUpload} 
      />

      {!isManualMode && (
        <div className="absolute inset-0 z-0">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)]"></div>
          <div className="absolute inset-0 bg-noise opacity-20 mix-blend-overlay"></div>
        </div>
      )}

      {/* Top Controls */}
      <div className="relative z-30 w-full flex items-center justify-between p-6 pt-[calc(env(safe-area-inset-top)+1rem)] bg-gradient-to-b from-black/80 to-transparent">
        <button 
            onClick={onClose}
            className="flex items-center justify-center size-12 rounded-full bg-white/5 backdrop-blur-md text-white hover:bg-primary/20 transition-colors border border-white/10 active:scale-90"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
        <div className="flex gap-4">
            <button 
              onClick={toggleFlash}
              className={`flex flex-col items-center justify-center size-12 rounded-full backdrop-blur-md transition-all border active:scale-90 ${isFlashOn ? 'bg-primary border-primary text-white shadow-[0_0_15px_rgba(166,23,39,0.5)]' : 'bg-white/5 border-white/10 text-white'}`}
            >
                <span className={`material-symbols-outlined text-[20px] ${isFlashOn ? 'font-variation-settings-"FILL"1' : ''}`}>
                  {isFlashOn ? 'flash_on' : 'flash_off'}
                </span>
            </button>
        </div>
      </div>

      {isManualMode ? (
          <div className="relative z-30 w-full max-w-sm bg-[#111] p-6 rounded-t-3xl animate-fade-in border-t border-white/10">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">edit</span>
                  手动录入信息
              </h3>
              <div className="space-y-4 mb-8">
                  <input 
                    type="text" 
                    placeholder="品牌 (Kodak/Fujifilm)" 
                    className="w-full bg-white/5 border border-white/10 p-3 rounded-lg text-white outline-none focus:border-primary" 
                    onChange={e => setManualData({...manualData, brand: e.target.value})}
                  />
                  <input 
                    type="text" 
                    placeholder="型号 (Portra 400/Gold)" 
                    className="w-full bg-white/5 border border-white/10 p-3 rounded-lg text-white outline-none focus:border-primary" 
                    onChange={e => setManualData({...manualData, name: e.target.value})}
                  />
              </div>
              <div className="flex gap-3">
                  <button onClick={() => setIsManualMode(false)} className="flex-1 py-3 rounded-lg border border-white/10 font-bold uppercase text-xs tracking-widest">取消</button>
                  <button onClick={submitManual} className="flex-1 py-3 rounded-lg bg-primary font-bold uppercase text-xs tracking-widest">确认添加</button>
              </div>
          </div>
      ) : (
        <>
            <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
              <div className="relative size-[72vw] max-w-[320px] max-h-[320px] aspect-square">
                  <div className="absolute inset-0 rounded-full border border-white/30"></div>
                  {isAnalyzing && (
                      <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-max animate-bounce">
                          <div className="flex items-center gap-2 px-4 py-2 rounded bg-primary text-white text-xs font-bold shadow-lg">
                              <span className="material-symbols-outlined text-[14px] animate-spin">sync</span>
                              <span>Gemini 识别中...</span>
                          </div>
                      </div>
                  )}
                  {/* 扫描动画条 */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-primary/60 blur-[2px] animate-[scanning_3s_ease-in-out_infinite] shadow-[0_0_15px_rgba(166,23,39,1)]"></div>
              </div>
            </div>

            <div className="relative z-30 w-full flex flex-col items-center pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-12 bg-gradient-to-t from-background-dark via-background-dark/90 to-transparent">
              <div className="flex items-center justify-between w-full px-12 max-w-md">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="relative size-12 rounded bg-surface-dark border border-white/10 flex items-center justify-center active:scale-90 transition-transform"
                  >
                      <span className="material-symbols-outlined text-white/50">image</span>
                  </button>

                  <div className="relative group">
                      <button 
                          onClick={captureAndAnalyze}
                          disabled={isAnalyzing}
                          className="relative flex items-center justify-center size-20 rounded-full border-4 border-white/10 bg-gradient-to-br from-primary to-[#800f1c] shadow-xl active:scale-90 transition-all disabled:opacity-50"
                      >
                          <div className="size-16 rounded-full border border-black/20 bg-transparent"></div>
                      </button>
                  </div>

                  <button 
                    onClick={() => setIsManualMode(true)}
                    className="flex items-center justify-center size-12 rounded-full bg-transparent text-white/50 active:scale-90 transition-transform"
                  >
                      <span className="material-symbols-outlined text-[28px]">tune</span>
                  </button>
              </div>
            </div>
        </>
      )}

      <style>{`
        @keyframes scanning {
            0% { top: 0%; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};