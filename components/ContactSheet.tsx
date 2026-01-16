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

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && sheetRef.current) {
        // 增加边距考虑，让预览更完整
        const containerWidth = containerRef.current.offsetWidth - 32; 
        const sheetWidth = 1200; 
        const newScale = Math.min(1, containerWidth / sheetWidth);
        setScale(newScale);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleExport = async () => {
    const element = document.getElementById('contact-sheet');
    if (!element) return;

    setIsExporting(true);

    try {
      const originalTransform = element.style.transform;
      element.style.transform = 'none';

      const canvas = await html2canvas(element, {
        backgroundColor: '#000000',
        useCORS: true,
        scale: 2.5, 
        logging: false,
        width: 1200, 
      });

      element.style.transform = originalTransform;

      const imageData = canvas.toDataURL('image/jpeg', 0.9);
      const link = document.createElement('a');
      link.download = `Archive_Landscape_Sheet_${roll.name}_${new Date().toISOString().slice(0,10)}.jpg`;
      link.href = imageData;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error("Export failed:", error);
      alert("导出失败，请重试。");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-[#0a0a0a] flex flex-col overflow-hidden animate-fade-in font-display">
      {/* 顶部工具栏 - 增加安全区域适配 */}
      <div className="flex items-center justify-between px-4 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)] bg-surface-highlight border-b border-white/10 shrink-0 shadow-lg z-20">
        <button onClick={onClose} className="flex items-center text-muted hover:text-white transition-colors h-10 px-2 active:scale-90">
          <span className="material-symbols-outlined">close</span>
          <span className="ml-1 text-xs font-bold uppercase tracking-widest">返回</span>
        </button>
        <div className="flex flex-col items-center">
            <h2 className="text-white font-black uppercase tracking-[0.4em] text-[10px]">Digital Archive Preview</h2>
            <p className="text-[9px] text-primary font-mono mt-0.5">全貌预览模式 • 自动适配</p>
        </div>
        <button 
          onClick={handleExport}
          disabled={isExporting}
          className="flex items-center gap-2 px-6 py-2 bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white rounded-full text-[10px] font-black uppercase transition-all shadow-[0_4px_15px_rgba(166,23,39,0.3)] active:scale-95"
        >
          {isExporting ? (
            <span className="material-symbols-outlined animate-spin text-sm">sync</span>
          ) : (
            <span className="material-symbols-outlined text-sm">download</span>
          )}
          {isExporting ? '处理中' : '导出'}
        </button>
      </div>

      {/* 预览区域 */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto p-4 bg-[#121212] flex flex-col items-center no-scrollbar"
      >
        <div 
          className="origin-top transition-transform duration-300 ease-out mt-4"
          style={{ 
            transform: `scale(${scale})`,
            width: '1200px', 
            height: 'fit-content'
          }}
        >
          <div 
            ref={sheetRef}
            className="bg-black w-full shadow-[0_40px_120px_rgba(0,0,0,1)] p-12 text-white flex flex-col relative" 
            id="contact-sheet"
          >
            
            <div className="absolute top-4 left-4 text-[8px] font-mono text-gray-800 uppercase tracking-widest">Kodak Safety Film • Archive System</div>
            <div className="absolute top-4 right-4 text-[8px] font-mono text-gray-800 uppercase tracking-widest">Landscape Proof Sheet</div>

            <div className="border-b-[4px] border-white mb-10 pb-6 flex justify-between items-end">
              <div className="flex items-end gap-10">
                <div className="space-y-1">
                  <span className="bg-primary text-white text-[9px] px-2 py-0.5 font-black uppercase tracking-[0.2em]">Record</span>
                  <h1 className="text-6xl font-black tracking-tighter uppercase leading-none mt-2">
                    {roll.brand} <span className="text-primary">{roll.name}</span>
                  </h1>
                </div>
                <div className="space-y-1 mb-1 border-l border-white/20 pl-6">
                  <div className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Camera</div>
                  <div className="text-lg font-bold uppercase tracking-tight">{roll.camera}</div>
                </div>
              </div>
              
              <div className="flex items-end gap-12 text-right">
                <div className="space-y-1 mb-1">
                  <div className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">ISO</div>
                  <div className="text-xl font-black font-mono">{roll.iso}</div>
                </div>
                <div className="space-y-1 mb-1">
                  <div className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Date</div>
                  <div className="text-xl font-black font-mono">{roll.date}</div>
                </div>
                <div className="bg-white text-black px-4 py-2 flex flex-col items-center justify-center">
                   <span className="text-[8px] font-black uppercase tracking-widest opacity-50">ID</span>
                   <span className="text-2xl font-black font-mono leading-none">#{roll.id.slice(-5)}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-12">
              {Array.from({ length: Math.ceil(roll.photos.length / FRAMES_PER_ROW) }).map((_, rowIndex) => (
                <div key={rowIndex} className="relative bg-[#080808] py-8 rounded-sm group border-y border-white/5">
                  <div className="absolute top-1 left-0 right-0 h-3 flex justify-around px-2 opacity-30">
                     {[...Array(64)].map((_, i) => (
                       <div key={`t-${i}`} className="w-1.5 h-full bg-white/20 rounded-[0.5px]"></div>
                     ))}
                  </div>
                  
                  <div className="grid grid-cols-6 gap-5 px-6 relative z-10">
                    {roll.photos.slice(rowIndex * FRAMES_PER_ROW, (rowIndex + 1) * FRAMES_PER_ROW).map((photo, colIndex) => (
                      <div key={photo.id} className="relative flex flex-col">
                        <div className="aspect-[3/2] bg-[#111] overflow-hidden border border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                          <img 
                            src={photo.url} 
                            className="w-full h-full object-cover grayscale-[5%] contrast-[1.1] brightness-[0.9]" 
                            crossOrigin="anonymous" 
                          />
                        </div>
                        <div className="mt-3 flex items-center justify-between px-1">
                          <div className="flex flex-col">
                              <span className="text-[9px] font-mono font-black text-gray-600 tracking-tighter">FRAME</span>
                              <span className="text-sm font-mono font-black text-primary leading-none">
                                {String(rowIndex * FRAMES_PER_ROW + colIndex + 1).padStart(2, '0')}
                              </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="absolute bottom-1 left-0 right-0 h-3 flex justify-around px-2 opacity-30">
                     {[...Array(64)].map((_, i) => (
                       <div key={`b-${i}`} className="w-1.5 h-full bg-white/20 rounded-[0.5px]"></div>
                     ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-20 pt-8 border-t-2 border-white/20 flex justify-between items-center text-[10px] font-mono text-gray-500 uppercase tracking-widest">
               <div className="flex gap-12">
                  <div className="flex flex-col gap-1">
                      <span className="text-gray-700 font-bold">Copyright</span>
                      <span className="text-white font-black text-xs">{roll.defaultExif?.copyright || 'Archive User'}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                      <span className="text-gray-700 font-bold">Lens</span>
                      <span className="text-white font-black text-xs">{roll.defaultExif?.lens || 'Manual Optics'}</span>
                  </div>
               </div>
               <div className="text-right flex items-center gap-3">
                  <span className="text-white font-black">FILM ARCHIVE AI</span>
                  <div className="size-2 bg-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(166,23,39,1)]"></div>
               </div>
            </div>

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-[0.02] z-0">
                <span className="text-[20vw] font-display font-black whitespace-nowrap uppercase tracking-tighter">PROOF SHEET</span>
            </div>
          </div>
        </div>
        
        <div style={{ height: '150px', flexShrink: 0 }}></div>
      </div>
    </div>
  );
};
