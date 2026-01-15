import React, { useState } from 'react';

interface ExportSettingsProps {
  onClose: () => void;
}

export const ExportSettings: React.FC<ExportSettingsProps> = ({ onClose }) => {
  const [format, setFormat] = useState('jpg');
  const [quality, setQuality] = useState('high');
  const [watermark, setWatermark] = useState(true);
  const [includeExif, setIncludeExif] = useState(true);

  const toggleClass = (active: boolean) => 
    `w-10 h-5 rounded-full relative transition-colors duration-200 ease-in-out ${active ? 'bg-primary' : 'bg-white/20'}`;
  
  const knobClass = (active: boolean) =>
    `absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 ease-in-out ${active ? 'translate-x-5' : 'translate-x-0'}`;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative w-full max-w-sm bg-[#111] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-fade-in">
        <div className="px-6 py-4 border-b border-white/10 bg-surface-highlight flex justify-between items-center">
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-gray-400">tune</span>
                导出设置
            </h2>
            <button onClick={onClose} className="text-muted hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
            </button>
        </div>

        <div className="p-6 space-y-6">
            {/* Format Selection */}
            <div>
                <label className="block text-[10px] uppercase tracking-widest text-muted mb-3">文件格式</label>
                <div className="grid grid-cols-3 gap-2">
                    {['jpg', 'png', 'tiff'].map(fmt => (
                        <button
                            key={fmt}
                            onClick={() => setFormat(fmt)}
                            className={`py-2 rounded border text-xs font-bold uppercase transition-all ${
                                format === fmt 
                                ? 'bg-white text-black border-white' 
                                : 'bg-transparent text-muted border-white/20 hover:border-white/50'
                            }`}
                        >
                            {fmt.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            {/* Quality Selection */}
            <div>
                <label className="block text-[10px] uppercase tracking-widest text-muted mb-3">输出画质</label>
                <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
                    {['web', 'high', 'print'].map(q => (
                        <button
                            key={q}
                            onClick={() => setQuality(q)}
                            className={`flex-1 py-1.5 rounded text-xs font-bold uppercase transition-all ${
                                quality === q
                                ? 'bg-primary text-white shadow-md'
                                : 'text-muted hover:text-white'
                            }`}
                        >
                            {q}
                        </button>
                    ))}
                </div>
                <p className="text-[10px] text-muted mt-2 text-right">
                    {quality === 'web' && '适合社交媒体分享 (2MP)'}
                    {quality === 'high' && '平衡画质与体积 (12MP)'}
                    {quality === 'print' && '最大分辨率输出 (RAW)'}
                </p>
            </div>

            {/* Toggles */}
            <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-sm font-bold text-white">添加水印</div>
                        <div className="text-xs text-muted">在右下角添加版权信息</div>
                    </div>
                    <button onClick={() => setWatermark(!watermark)} className={toggleClass(watermark)}>
                        <div className={knobClass(watermark)}></div>
                    </button>
                </div>

                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-sm font-bold text-white">保留 EXIF 数据</div>
                        <div className="text-xs text-muted">嵌入相机和拍摄参数</div>
                    </div>
                    <button onClick={() => setIncludeExif(!includeExif)} className={toggleClass(includeExif)}>
                        <div className={knobClass(includeExif)}></div>
                    </button>
                </div>
            </div>
        </div>

        <div className="p-6 border-t border-white/10 bg-surface-highlight">
            <button 
                onClick={onClose}
                className="w-full py-3 bg-white text-black font-bold rounded flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
            >
                保存设置
            </button>
        </div>
      </div>
    </div>
  );
};