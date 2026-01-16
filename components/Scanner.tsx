
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
      const constraints = { 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      alert("无法访问相机，请确保已授予权限并在 HTTPS 环境下运行。");
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
      // 关键改进：针对手机端压缩图片尺寸至 800px 宽度
      // 这能显著减小 Base64 负载，防止 API 超时或失败
      const TARGET_WIDTH = 800;
      const scale = TARGET_WIDTH / videoRef.current.videoWidth;
      const targetHeight = videoRef.current.videoHeight * scale;

      canvasRef.current.width = TARGET_WIDTH;
      canvasRef.current.height = targetHeight;
      
      // 绘制压缩后的图像
      context.drawImage(videoRef.current, 0, 0, TARGET_WIDTH, targetHeight);
      
      // 使用 0.6 的质量进一步压缩体积 (约 100-200KB)
      const imageData = canvasRef.current.toDataURL('image/jpeg', 0.6);
      
      try {
        const result = await identifyFilmStock(imageData);
        onScanComplete(result, imageData);
      } catch (error) {
        alert("识别遇到了问题，请检查网络并重试。");
        setIsAnalyzing(false);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setIsAnalyzing(true);
    const file = e.target.files[0];
    
    // 图片上传也需要前端压缩
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const cvs = document.createElement('canvas');
        const scale = 800 / img.width;
        cvs.width = 800;
        cvs.height = img.height * scale;
        cvs.getContext('2d')?.drawImage(img, 0, 0, cvs.width, cvs.height);
        const compressed = cvs.toDataURL('image/jpeg', 0.6);
        try {
          const result = await identifyFilmStock(compressed);
          onScanComplete(result, compressed);
        } catch (e) {
          alert("识别失败");
          setIsAnalyzing(false);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-between overflow-hidden">
      <canvas ref={canvasRef} className="hidden" />
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />

      {/* 实时视频背景 */}
      {!isManualMode && (
        <div className="absolute inset-0 z-0">
          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover opacity-70" />
          
          {/* 取景器装饰元素 */}
          <div className="absolute inset-0 pointer-events-none">
            {/* 四角边框 */}
            <div className="absolute top-10 left-10 size-10 border-t-2 border-l-2 border-white/40"></div>
            <div className="absolute top-10 right-10 size-10 border-t-2 border-r-2 border-white/40"></div>
            <div className="absolute bottom-10 left-10 size-10 border-b-2 border-l-2 border-white/40"></div>
            <div className="absolute bottom-10 right-10 size-10 border-b-2 border-r-2 border-white/40"></div>
            
            {/* 水平仪 */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-0.5 bg-white/10">
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-2 rounded-full border border-white/30"></div>
            </div>

            {/* 中心扫描区域 */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70vw] h-[40vw] max-w-md border border-primary/30 rounded-lg">
                <div className="absolute inset-0 bg-primary/5"></div>
                {/* 动态扫描线 */}
                <div className="absolute top-0 left-0 w-full h-0.5 bg-primary shadow-[0_0_15px_rgba(166,23,39,1)] animate-[scan_3s_linear_infinite]"></div>
            </div>
          </div>
        </div>
      )}

      {/* 顶部栏 */}
      <div className="relative z-30 w-full flex items-center justify-between p-6 pt-[calc(env(safe-area-inset-top)+1rem)]">
        <button onClick={onClose} className="size-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/10 active:scale-90 transition-transform">
          <span className="material-symbols-outlined">close</span>
        </button>
        <div className="bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 text-[10px] font-mono tracking-widest text-white/80 uppercase">
          {isAnalyzing ? "Gemini 深度分析中..." : "取景模式 / Environment"}
        </div>
        <div className="size-12"></div>
      </div>

      {/* 底部控制区 */}
      <div className="relative z-30 w-full p-8 pb-[calc(env(safe-area-inset-bottom)+2rem)] flex flex-col items-center gap-8 bg-gradient-to-t from-black via-black/40 to-transparent">
        
        {isAnalyzing && (
            <div className="flex flex-col items-center gap-2">
                <div className="flex gap-1">
                    {[1,2,3].map(i => <div key={i} className="size-1.5 bg-primary rounded-full animate-bounce" style={{animationDelay: `${i*0.2}s`}}></div>)}
                </div>
                <span className="text-[10px] font-mono text-primary uppercase tracking-[0.3em] font-bold">识别胶卷型号...</span>
            </div>
        )}

        <div className="flex items-center justify-between w-full max-w-xs">
          <button onClick={() => fileInputRef.current?.click()} className="size-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 active:scale-90 transition-all">
            <span className="material-symbols-outlined text-white/60">image</span>
          </button>

          <button 
            onClick={captureAndAnalyze}
            disabled={isAnalyzing}
            className="group relative size-20 rounded-full bg-white p-1 shadow-[0_0_30px_rgba(255,255,255,0.3)] active:scale-95 transition-all disabled:opacity-50"
          >
            <div className="size-full rounded-full border-4 border-black/10 flex items-center justify-center">
              <div className="size-14 rounded-full bg-primary flex items-center justify-center">
                 <span className={`material-symbols-outlined text-white text-3xl transition-transform ${isAnalyzing ? 'animate-spin' : ''}`}>
                    {isAnalyzing ? 'sync' : 'shutter_speed'}
                 </span>
              </div>
            </div>
            {/* 外部光环动效 */}
            {!isAnalyzing && <div className="absolute inset-[-8px] border border-white/20 rounded-full animate-ping pointer-events-none"></div>}
          </button>

          <button onClick={() => setIsManualMode(!isManualMode)} className={`size-12 rounded-full border flex items-center justify-center transition-all active:scale-90 ${isManualMode ? 'bg-primary border-primary text-white' : 'bg-white/5 border-white/10 text-white/60'}`}>
            <span className="material-symbols-outlined">edit</span>
          </button>
        </div>

        <p className="text-[9px] text-white/40 uppercase tracking-widest font-mono">
            Optical identification system v2.1
        </p>
      </div>

      {isManualMode && (
          <div className="absolute inset-x-0 bottom-0 z-40 bg-[#0a0a0a] border-t border-white/10 p-8 pt-12 rounded-t-[2.5rem] animate-fade-in">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold uppercase tracking-tight">手动录入</h3>
                <button onClick={() => setIsManualMode(false)} className="text-muted"><span className="material-symbols-outlined">close</span></button>
              </div>
              <div className="space-y-4">
                  <input type="text" placeholder="品牌 (Kodak/Fuji)" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white font-mono" onChange={e => setManualData({...manualData, brand: e.target.value})} />
                  <input type="text" placeholder="型号 (Portra 400)" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white font-mono" onChange={e => setManualData({...manualData, name: e.target.value})} />
                  <button 
                    onClick={() => onScanComplete(manualData, 'https://images.unsplash.com/photo-1590483736622-39da8af75bba?auto=format&fit=crop&q=80&w=400')} 
                    className="w-full py-4 bg-primary text-white font-bold rounded-xl uppercase tracking-widest text-sm"
                  >
                    确认添加
                  </button>
              </div>
          </div>
      )}

      <style>{`
        @keyframes scan {
            0% { top: 0; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};
