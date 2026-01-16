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
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);
  
  // 手动模式表单状态
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
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);
      const imageData = canvasRef.current.toDataURL('image/jpeg', 0.8);
      
      try {
        const result = await identifyFilmStock(imageData);
        onScanComplete(result, imageData);
      } catch (error) {
        alert("识别失败，请重试或手动输入");
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
        alert("识别失败，请重试");
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
    // 使用占位图作为手动添加的封面
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

      {/* Camera Feed */}
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
        </div>
      )}

      {/* Manual Mode UI */}
      {isManualMode && (
        <div className="absolute inset-0 z-20 bg-background-dark/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 animate-fade-in">
          <div className="w-full max-w-sm space-y-6">
            <header className="text-center">
              <h3 className="text-2xl font-display font-black uppercase tracking-tight">手动输入</h3>
              <p className="text-xs text-muted uppercase tracking-widest mt-1">Manual Identification</p>
            </header>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-primary font-bold">品牌 Brand</label>
                <input 
                  type="text" 
                  value={manualData.brand}
                  onChange={e => setManualData({...manualData, brand: e.target.value})}
                  placeholder="例如: Kodak, Fujifilm..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-primary focus:outline-none transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-primary font-bold">型号 Name</label>
                <input 
                  type="text" 
                  value={manualData.name}
                  onChange={e => setManualData({...manualData, name: e.target.value})}
                  placeholder="例如: Portra 400, Gold 200..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-primary focus:outline-none transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest text-primary font-bold">感光度 ISO</label>
                  <input 
                    type="number" 
                    value={manualData.iso}
                    onChange={e => setManualData({...manualData, iso: parseInt(e.target.value) || 400})}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-primary focus:outline-none transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest text-primary font-bold">类型 Type</label>
                  <select 
                    value={manualData.type}
                    onChange={e => setManualData({...manualData, type: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-primary focus:outline-none transition-colors appearance-none"
                  >
                    <option value="Color Negative">彩色负片</option>
                    <option value="B&W">黑白</option>
                    <option value="Slide">反转片</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-4">
              <button 
                onClick={submitManual}
                className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg active:scale-95 transition-transform"
              >
                确认添加
              </button>
              <button 
                onClick={() => setIsManualMode(false)}
                className="w-full py-4 bg-white/5 border border-white/10 text-white/50 font-bold rounded-xl active:scale-95 transition-transform"
              >
                返回扫描
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Controls */}
      <div className="relative z-30 w-full flex items-center justify-between p-6 pt-12 bg-gradient-to-b from-black/80 to-transparent">
        <button 
            onClick={onClose}
            className="flex items-center justify-center size-12 rounded-full bg-white/5 backdrop-blur-md text-white hover:bg-primary/20 transition-colors border border-white/10"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
        <div className="flex gap-4">
            <button 
              onClick={toggleFlash}
              className={`flex flex-col items-center justify-center size-12 rounded-full backdrop-blur-md transition-all border ${isFlashOn ? 'bg-primary border-primary text-white shadow-[0_0_15px_rgba(166,23,39,0.5)]' : 'bg-white/5 border-white/10 text-white'}`}
            >
                <span className={`material-symbols-outlined text-[20px] ${isFlashOn ? 'font-variation-settings-"FILL"1' : ''}`}>
                  {isFlashOn ? 'flash_on' : 'flash_off'}
                </span>
            </button>
        </div>
      </div>

      {/* Focus Area / Reticle */}
      {!isManualMode && (
        <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
          <div className="relative size-[72vw] max-w-[320px] max-h-[320px] aspect-square">
              <div className="absolute inset-0 rounded-full border border-white/30 shadow-[0_0_30px_rgba(0,0,0,0.5)]"></div>
              <div className={`absolute inset-2 rounded-full border border-white/10 border-dashed ${isAnalyzing ? 'animate-spin' : 'animate-spin-slow'}`}></div>
              
              {isAnalyzing && (
                  <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-max max-w-xs animate-bounce">
                      <div className="flex items-center gap-2 px-4 py-2 rounded bg-primary/90 backdrop-blur text-white text-xs font-bold tracking-wide shadow-lg border border-white/10">
                          <span className="material-symbols-outlined text-[14px] animate-spin">sync</span>
                          <span>Gemini 识别中...</span>
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
      )}

      {/* Bottom Controls */}
      {!isManualMode && (
        <div className="relative z-30 w-full flex flex-col items-center pb-12 pt-12 bg-gradient-to-t from-background-dark via-background-dark/90 to-transparent">
          <div className="flex items-center justify-between w-full px-12 max-w-md">
              {/* Gallery Button */}
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="relative size-12 rounded bg-surface-dark border border-white/10 overflow-hidden flex items-center justify-center hover:bg-white/10 transition-colors group"
              >
                  <span className="material-symbols-outlined text-white/50 group-hover:text-white">image</span>
              </button>

              {/* Shutter Button */}
              <div className="relative group">
                  <div className={`absolute -inset-1 rounded-full bg-primary/20 blur-md group-hover:bg-primary/40 transition-all ${isAnalyzing ? 'animate-pulse' : ''}`}></div>
                  <button 
                      onClick={captureAndAnalyze}
                      disabled={isAnalyzing}
                      className="relative flex items-center justify-center size-20 rounded-full border-4 border-white/10 bg-gradient-to-br from-primary to-[#800f1c] shadow-[inset_0_2px_4px_rgba(255,255,255,0.2),0_4px_12px_rgba(0,0,0,0.5)] active:scale-95 transition-all duration-150 disabled:opacity-50"
                  >
                      <div className="size-16 rounded-full border border-black/20 bg-transparent"></div>
                  </button>
              </div>

              {/* Manual Mode Toggle */}
              <button 
                onClick={() => setIsManualMode(true)}
                className="flex items-center justify-center size-12 rounded-full bg-transparent text-white/50 hover:text-white transition-colors hover:bg-white/5"
              >
                  <span className="material-symbols-outlined text-[28px]">tune</span>
              </button>
          </div>
          
          <div className="mt-8 flex gap-6 text-[10px] font-mono text-white/30 uppercase tracking-widest">
              <span className="text-primary font-bold">AI Auto</span>
              <span>•</span>
              <span>Macro</span>
              <span>•</span>
              <span>RAW</span>
          </div>
        </div>
      )}
    </div>
  );
};