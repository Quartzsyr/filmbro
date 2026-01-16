
import React, { useState, useEffect, useRef } from 'react';
import { Roll } from '../types';
import html2canvas from 'html2canvas';

interface ContactSheetProps {
  roll: Roll;
  onClose: () => void;
}

export const ContactSheet: React.FC<ContactSheetProps> = ({ roll, onClose }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const FRAMES_PER_ROW = 6; 

  // 动态计算预览缩放比
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth - 48; 
        const sheetWidth = 1200; 
        const newScale = Math.min(1, containerWidth / sheetWidth);
        setScale(newScale);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /**
   * 修复后的导出函数：采用克隆副本法，避免缩放导致的渲染 Bug
   */
  const handleExport = async () => {
    const originalElement = document.getElementById('contact-sheet-inner');
    if (!originalElement) return;

    setIsExporting(true);

    try {
      // 1. 创建克隆副本，防止原 DOM 缩放干扰
      const clone = originalElement.cloneNode(true) as HTMLDivElement;
      clone.style.position = 'fixed';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      clone.style.transform = 'none';
      clone.style.width = '1200px'; 
      document.body.appendChild(clone);

      // 2. 捕获画布
      const canvas = await html2canvas(clone, {
        backgroundColor: '#000000',
        useCORS: true,
        scale: 2.5, // 2.5倍采样率，保证打印级清晰度
        logging: false,
        allowTaint: true
      });

      // 3. 移除克隆副本
      document.body.removeChild(clone);

      // 4. 触发下载
      const imageData = canvas.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      link.download = `FILM_ARCHIVE_${roll.brand}_${roll.name}_${new Date().getTime()}.jpg`;
      link.href = imageData;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error("Export Error:", error);
      alert("生成失败，请检查照片格式。");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col overflow-hidden animate-fade-in font-display selection:bg-primary">
      {/* 顶部交互栏 */}
      <div className="flex items-center justify-between px-6 py-4 pt-[calc(env(safe-area-inset-top)+1rem)] bg-[#0a0a0a] border-b border-white/5 z-50">
        <button onClick={onClose} className="flex items-center text-muted hover:text-white transition-all active:scale-90">
          <span className="material-symbols-outlined">close</span>
          <span className="ml-1 text-[10px] font-black uppercase tracking-widest">退出预览</span>
        </button>
        
        <div className="flex flex-col items-center">
            <span className="text-[9px] font-black text-primary uppercase tracking-[0.4em]">Landscape Proof</span>
            <div className="h-0.5 w-full bg-primary/20 mt-1"></div>
        </div>

        <button 
          onClick={handleExport}
          disabled={isExporting}
          className="group relative px-6 py-2 bg-primary text-white rounded-sm overflow-hidden active:scale-95 transition-all"
        >
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
            {isExporting ? <span className="material-symbols-outlined animate-spin text-sm">sync</span> : <span className="material-symbols-outlined text-sm">download</span>}
            {isExporting ? '处理中...' : '生成印样'}
          </div>
        </button>
      </div>

      {/* 滚动预览容器 */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto bg-[#0a0a0a] flex flex-col items-center p-6 no-scrollbar"
      >
        <div 
          className="origin-top transition-transform duration-500 ease-out"
          style={{ transform: `scale(${scale})`, width: '1200px' }}
        >
          {/* 印样主体 - 匹配参考图设计 */}
          <div 
            id="contact-sheet-inner"
            className="bg-black w-full p-12 text-white flex flex-col relative" 
          >
            {/* 饰纹头部 */}
            <header className="border-b border-white/20 mb-12 pb-8 flex justify-between items-end">
              <div>
                <span className="bg-primary text-white text-[10px] px-2 py-0.5 font-black uppercase tracking-widest">Archives System</span>
                <h1 className="text-7xl font-black tracking-tighter uppercase leading-none mt-2 flex items-baseline gap-4">
                  {roll.brand} <span className="text-primary opacity-90">{roll.name}</span>
                </h1>
              </div>
              
              <div className="flex gap-8 items-end text-right">
                <div className="space-y-1">
                  <div className="text-[9px] font-mono text-white/30 uppercase tracking-widest">Camera</div>
                  <div className="text-xl font-bold uppercase tracking-tight border-b border-white/10 pb-1">{roll.camera}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[9px] font-mono text-white/30 uppercase tracking-widest">ISO</div>
                  <div className="text-xl font-black font-mono">{roll.iso}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[9px] font-mono text-white/30 uppercase tracking-widest">Date</div>
                  <div className="text-xl font-black font-mono">{roll.date}</div>
                </div>
                <div className="border-[3px] border-white p-2 flex flex-col items-center min-w-[60px]">
                   <span className="text-[8px] font-black uppercase opacity-40">Roll</span>
                   <span className="text-2xl font-black font-mono leading-none">#{roll.id.slice(-4)}</span>
                </div>
              </div>
            </header>

            {/* 胶条渲染区域 */}
            <div className="flex flex-col gap-14">
              {Array.from({ length: Math.ceil(roll.photos.length / FRAMES_PER_ROW) }).map((_, rowIndex) => (
                <div key={rowIndex} className="relative bg-[#0d0d0d] pt-6 pb-12 rounded-[2px]">
                  {/* 齿孔 - 顶部 */}
                  <div className="absolute top-1.5 left-0 right-0 h-3 flex justify-around px-4 opacity-40">
                     {[...Array(50)].map((_, i) => (
                       <div key={`th-${i}`} className="w-2.5 h-full bg-white/20 rounded-[0.5px]"></div>
                     ))}
                  </div>
                  
                  {/* 照片网格 */}
                  <div className="grid grid-cols-6 gap-6 px-8 relative z-10">
                    {roll.photos.slice(rowIndex * FRAMES_PER_ROW, (rowIndex + 1) * FRAMES_PER_ROW).map((photo, colIndex) => (
                      <div key={photo.id} className="relative group">
                        <div className="aspect-[3/2] bg-[#111] overflow-hidden border border-white/5 ring-1 ring-white/10 group-hover:ring-primary/50 transition-all shadow-2xl">
                          <img 
                            src={photo.url} 
                            className="w-full h-full object-cover" 
                            crossOrigin="anonymous" 
                          />
                        </div>
                        {/* 帧号 - 鲜艳红色匹配参考图 */}
                        <div className="absolute -bottom-8 left-0 right-0 flex items-baseline justify-center gap-1">
                          <span className="text-[7px] font-mono font-black text-white/20 uppercase tracking-tighter">FRAME</span>
                          <span className="text-xl font-mono font-black text-primary tracking-tighter">
                            {String(rowIndex * FRAMES_PER_ROW + colIndex + 1).padStart(2, '0')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 齿孔 - 底部 */}
                  <div className="absolute bottom-1.5 left-0 right-0 h-3 flex justify-around px-4 opacity-40">
                     {[...Array(50)].map((_, i) => (
                       <div key={`bh-${i}`} className="w-2.5 h-full bg-white/20 rounded-[0.5px]"></div>
                     ))}
                  </div>
                </div>
              ))}
            </div>

            {/* 页脚元数据 */}
            <footer className="mt-24 pt-8 border-t border-white/10 flex justify-between items-end text-muted">
               <div className="flex gap-16">
                  <div className="space-y-1">
                      <span className="text-[9px] font-bold uppercase tracking-widest block opacity-40">Copyright</span>
                      <span className="text-white text-xs font-black uppercase">{roll.defaultExif?.copyright || 'Film Archivist'}</span>
                  </div>
                  <div className="space-y-1">
                      <span className="text-[9px] font-bold uppercase tracking-widest block opacity-40">Optics</span>
                      <span className="text-white text-xs font-black uppercase">{roll.defaultExif?.lens || 'Professional Lens'}</span>
                  </div>
               </div>
               <div className="flex items-end gap-3 grayscale opacity-40">
                  <div className="text-right">
                    <div className="text-[10px] font-black tracking-widest uppercase">FILM ARCHIVE AI</div>
                    <div className="text-[8px] font-mono">Digital Reconstruction System</div>
                  </div>
                  <span className="material-symbols-outlined text-4xl leading-none">shutter_speed</span>
               </div>
            </footer>

            {/* 背景水印 */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.015] z-0 select-none">
                <span className="text-[25vw] font-black uppercase tracking-tighter rotate-12">NEGATIVE</span>
            </div>
          </div>
        </div>
        
        {/* 占位符，防止内容被底部遮挡 */}
        <div className="h-40 shrink-0"></div>
      </div>
    </div>
  );
};
