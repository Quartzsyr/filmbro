import React, { useState } from 'react';
import { Roll } from '../types';
import html2canvas from 'html2canvas';

interface ContactSheetProps {
  roll: Roll;
  onClose: () => void;
}

export const ContactSheet: React.FC<ContactSheetProps> = ({ roll, onClose }) => {
  const [isExporting, setIsExporting] = useState(false);
  const FRAMES_PER_ROW = 6; // Changed from 4 to 6 for wider format

  const handleExport = async () => {
    const element = document.getElementById('contact-sheet');
    if (!element) return;

    setIsExporting(true);

    try {
      // Use html2canvas to capture the element
      const canvas = await html2canvas(element, {
        backgroundColor: '#000000',
        useCORS: true, // Important for loading cross-origin images
        scale: 2, // Higher resolution for better quality
        logging: false,
      });

      // Convert canvas to blob URL
      const imageType = 'image/jpeg';
      const imageData = canvas.toDataURL(imageType, 0.9);

      // Create download link
      const link = document.createElement('a');
      link.download = `ContactSheet_${roll.brand}_${roll.name}_${new Date().toISOString().slice(0,10)}.jpg`;
      link.href = imageData;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error("Export failed:", error);
      alert("导出失败，请重试 (可能是图片跨域限制)");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-[#0a0a0a] flex flex-col overflow-hidden animate-fade-in">
      {/* Header Toolbar */}
      <div className="flex items-center justify-between p-4 bg-surface-highlight border-b border-white/10 shrink-0">
        <button onClick={onClose} className="flex items-center text-muted hover:text-white transition-colors">
          <span className="material-symbols-outlined">close</span>
          <span className="ml-1 text-sm font-bold uppercase">关闭</span>
        </button>
        <h2 className="text-white font-bold uppercase tracking-widest text-sm">数字印样预览 (6张/行)</h2>
        <button 
          onClick={handleExport}
          disabled={isExporting}
          className="flex items-center gap-2 px-4 py-1.5 bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white rounded-full text-xs font-bold uppercase transition-all"
        >
          {isExporting ? (
            <span className="material-symbols-outlined animate-spin text-sm">sync</span>
          ) : (
            <span className="material-symbols-outlined text-sm">download</span>
          )}
          {isExporting ? '生成中...' : '保存印样'}
        </button>
      </div>

      {/* Sheet Preview Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#1a1a1a] flex justify-center">
        {/* Widened container to max-w-7xl for landscape/wide format */}
        <div className="bg-black w-full max-w-7xl shadow-2xl p-8 min-h-[600px] text-white flex flex-col relative origin-top" id="contact-sheet">
          
          {/* Sheet Header */}
          <div className="border-b-2 border-white mb-8 pb-4 flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-black font-display tracking-tighter uppercase leading-none">
                {roll.brand}<br/>{roll.name}
              </h1>
              <div className="mt-2 text-sm font-mono text-gray-400">
                ISO {roll.iso} • {roll.status}
              </div>
            </div>
            <div className="text-right font-mono text-xs">
              <div className="uppercase tracking-widest text-gray-500 mb-1">ARCHIVE ID</div>
              <div className="text-xl font-bold">{roll.id.padStart(8, '0')}</div>
              <div className="text-gray-400 mt-1">{roll.date}</div>
            </div>
          </div>

          {/* Film Strips */}
          <div className="flex flex-col gap-8">
            {/* Split photos into chunks of 6 for rows */}
            {Array.from({ length: Math.ceil(roll.photos.length / FRAMES_PER_ROW) }).map((_, rowIndex) => (
              <div key={rowIndex} className="relative bg-black py-4">
                {/* Top Sprockets - Increased count for wider 6-frame strip */}
                <div className="absolute top-0 left-0 right-0 h-3 flex justify-between px-2 opacity-80">
                   {[...Array(64)].map((_, i) => (
                     <div key={`t-${i}`} className="w-1.5 h-full bg-white/15 rounded-[1px]"></div>
                   ))}
                </div>
                
                {/* Photos Row */}
                <div className="flex gap-4 px-4 relative z-10">
                  {roll.photos.slice(rowIndex * FRAMES_PER_ROW, (rowIndex + 1) * FRAMES_PER_ROW).map((photo, colIndex) => (
                    // 3:2 Aspect Ratio (Standard 135 format landscape)
                    <div key={photo.id} className="flex-1 aspect-[3/2] bg-gray-900 relative group border border-white/5">
                      <img 
                        src={photo.url} 
                        className="w-full h-full object-cover grayscale-[20%] contrast-110" 
                        crossOrigin="anonymous" 
                      />
                      {/* Frame Number */}
                      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-mono font-bold text-gray-500">
                        {rowIndex * FRAMES_PER_ROW + colIndex + 1}
                        <span className="ml-0.5 text-[8px]">A</span>
                      </div>
                    </div>
                  ))}
                  {/* Fill empty spots in last row */}
                  {rowIndex === Math.ceil(roll.photos.length / FRAMES_PER_ROW) - 1 && 
                   roll.photos.slice(rowIndex * FRAMES_PER_ROW).length < FRAMES_PER_ROW && 
                   [...Array(FRAMES_PER_ROW - roll.photos.slice(rowIndex * FRAMES_PER_ROW).length)].map((_, i) => (
                     <div key={`empty-${i}`} className="flex-1 aspect-[3/2] bg-[#111] border border-white/5 flex items-center justify-center">
                       <span className="text-[10px] text-white/10">EMPTY</span>
                     </div>
                   ))
                  }
                </div>

                {/* Bottom Sprockets */}
                <div className="absolute bottom-0 left-0 right-0 h-3 flex justify-between px-2 opacity-80">
                   {[...Array(64)].map((_, i) => (
                     <div key={`b-${i}`} className="w-1.5 h-full bg-white/15 rounded-[1px]"></div>
                   ))}
                </div>
                
                {/* Film Brand Text on Edge */}
                <div className="absolute -bottom-5 left-4 text-[9px] font-mono text-gray-600 uppercase tracking-widest">
                  {roll.brand} SAFETY FILM
                </div>
                <div className="absolute -bottom-5 right-4 text-[9px] font-mono text-gray-600 uppercase tracking-widest">
                  {roll.name} • {roll.iso}
                </div>
              </div>
            ))}
          </div>

          {/* Sheet Footer */}
          <div className="mt-auto pt-16 border-t border-white/20 flex justify-between items-start text-xs font-mono text-gray-500 uppercase">
             <div>
                <div className="mb-1">Photographer: <span className="text-white">{roll.defaultExif?.copyright || 'Unknown'}</span></div>
                <div>Camera: {roll.camera}</div>
                <div>Lens: {roll.defaultExif?.lens || '-'}</div>
             </div>
             <div className="text-right">
                <div className="mb-1 text-white">Digital Contact Sheet</div>
                <div>Generated by AI Film Archive</div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};