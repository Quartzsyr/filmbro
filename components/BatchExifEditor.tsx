import React, { useState } from 'react';
import { ExifData, Roll } from '../types';

interface BatchExifEditorProps {
  roll: Roll;
  onSave: (data: ExifData) => void;
  onClose: () => void;
}

export const BatchExifEditor: React.FC<BatchExifEditorProps> = ({ roll, onSave, onClose }) => {
  const [formData, setFormData] = useState<ExifData>({
    camera: roll.camera || '',
    lens: roll.defaultExif?.lens || '',
    aperture: roll.defaultExif?.aperture || '',
    shutterSpeed: roll.defaultExif?.shutterSpeed || '',
    date: roll.date || new Date().toISOString().split('T')[0],
    location: roll.defaultExif?.location || '',
    copyright: roll.defaultExif?.copyright || '© 2024 Film Archive'
  });

  const [isWriting, setIsWriting] = useState(false);

  const handleChange = (field: keyof ExifData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsWriting(true);
    // Simulate the "Writing" process to files
    await new Promise(resolve => setTimeout(resolve, 1500));
    onSave(formData);
    setIsWriting(false);
    onClose();
  };

  const inputClass = "w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white font-mono focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all";
  const labelClass = "block text-[10px] uppercase tracking-widest text-muted mb-1.5";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative w-full max-w-md bg-[#111] border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 bg-surface-highlight flex justify-between items-center">
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">edit_document</span>
                批量元数据
            </h2>
            <button onClick={onClose} className="text-muted hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
            </button>
        </div>

        {/* Form */}
        <div className="p-6 overflow-y-auto space-y-5">
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-sm mt-0.5">info</span>
                <p className="text-xs text-primary/80 leading-relaxed">
                    正在为 <strong>{roll.photos.length}</strong> 张照片写入数据。此操作将把相机、镜头和版权信息嵌入到所有照片中。
                </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className={labelClass}>Camera Body</label>
                    <input 
                        type="text" 
                        value={formData.camera}
                        onChange={(e) => handleChange('camera', e.target.value)}
                        className={inputClass}
                        placeholder="e.g. Leica M6"
                    />
                </div>
                 <div>
                    <label className={labelClass}>Lens Model</label>
                    <input 
                        type="text" 
                        value={formData.lens}
                        onChange={(e) => handleChange('lens', e.target.value)}
                        className={inputClass}
                        placeholder="e.g. Summicron 35mm"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className={labelClass}>Date Taken</label>
                    <input 
                        type="date" 
                        value={formData.date}
                        onChange={(e) => handleChange('date', e.target.value)}
                        className={inputClass}
                    />
                </div>
                 <div>
                    <label className={labelClass}>Location</label>
                    <input 
                        type="text" 
                        value={formData.location}
                        onChange={(e) => handleChange('location', e.target.value)}
                        className={inputClass}
                        placeholder="e.g. Tokyo, Japan"
                    />
                </div>
            </div>

            <div>
                <label className={labelClass}>Copyright / Artist</label>
                <input 
                    type="text" 
                    value={formData.copyright}
                    onChange={(e) => handleChange('copyright', e.target.value)}
                    className={inputClass}
                />
            </div>
            
            <div className="pt-2">
                <div className="flex items-center justify-between text-xs text-muted mb-2">
                    <span className="uppercase tracking-wider">Default Settings</span>
                </div>
                <div className="grid grid-cols-2 gap-4 opacity-60 hover:opacity-100 transition-opacity">
                    <div>
                        <label className={labelClass}>Aperture (Default)</label>
                        <input 
                            type="text" 
                            value={formData.aperture}
                            onChange={(e) => handleChange('aperture', e.target.value)}
                            className={inputClass}
                            placeholder="f/2.8"
                        />
                    </div>
                     <div>
                        <label className={labelClass}>Shutter (Default)</label>
                        <input 
                            type="text" 
                            value={formData.shutterSpeed}
                            onChange={(e) => handleChange('shutterSpeed', e.target.value)}
                            className={inputClass}
                            placeholder="1/125"
                        />
                    </div>
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 bg-surface-highlight">
            <button 
                onClick={handleSave}
                disabled={isWriting}
                className="w-full py-3 bg-primary hover:bg-primary-hover disabled:bg-gray-800 text-white font-bold rounded flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
                {isWriting ? (
                    <>
                        <span className="material-symbols-outlined animate-spin">progress_activity</span>
                        正在写入 EXIF...
                    </>
                ) : (
                    <>
                        <span className="material-symbols-outlined">save_as</span>
                        应用更改 ({roll.photos.length})
                    </>
                )}
            </button>
        </div>
      </div>
    </div>
  );
};