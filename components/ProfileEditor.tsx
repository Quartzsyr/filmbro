import React, { useState } from 'react';
import { UserProfile } from '../types';

interface ProfileEditorProps {
  profile: UserProfile;
  onSave: (profile: UserProfile) => void;
  onClose: () => void;
}

export const ProfileEditor: React.FC<ProfileEditorProps> = ({ profile, onSave, onClose }) => {
  const [formData, setFormData] = useState<UserProfile>(profile);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (field: keyof UserProfile, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
        onSave(formData);
        setIsSaving(false);
        onClose();
    }, 800);
  };

  const inputClass = "w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white font-mono focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-white/20";
  const labelClass = "block text-[10px] uppercase tracking-widest text-muted mb-1.5";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative w-full max-w-md bg-[#111] border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in">
        <div className="px-6 py-4 border-b border-white/10 bg-surface-highlight flex justify-between items-center">
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">person_edit</span>
                编辑个人资料
            </h2>
            <button onClick={onClose} className="text-muted hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
            </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
            <div className="flex justify-center mb-6">
                <div className="relative group cursor-pointer">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white/10 group-hover:border-primary transition-colors">
                        <img src={formData.avatar} className="w-full h-full object-cover grayscale" />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 rounded-full transition-opacity">
                        <span className="material-symbols-outlined text-white">add_a_photo</span>
                    </div>
                    {/* Mock Avatar change functionality - In real app this would trigger file input */}
                </div>
            </div>

            <div>
                <label className={labelClass}>显示名称</label>
                <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className={inputClass}
                />
            </div>

            <div>
                <label className={labelClass}>头衔 / 签名</label>
                <input 
                    type="text" 
                    value={formData.role}
                    onChange={(e) => handleChange('role', e.target.value)}
                    className={inputClass}
                />
            </div>

            <div>
                <label className={labelClass}>个人简介</label>
                <textarea 
                    value={formData.bio || ''}
                    onChange={(e) => handleChange('bio', e.target.value)}
                    className={`${inputClass} h-24 resize-none`}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className={labelClass}>常用相机</label>
                    <input 
                        type="text" 
                        value={formData.favoriteCamera || ''}
                        onChange={(e) => handleChange('favoriteCamera', e.target.value)}
                        className={inputClass}
                        placeholder="e.g. Leica M6"
                    />
                </div>
                <div>
                    <label className={labelClass}>常用胶卷</label>
                    <input 
                        type="text" 
                        value={formData.favoriteFilm || ''}
                        onChange={(e) => handleChange('favoriteFilm', e.target.value)}
                        className={inputClass}
                        placeholder="e.g. Portra 400"
                    />
                </div>
            </div>
             <div>
                <label className={labelClass}>个人网站 / 社交媒体</label>
                <input 
                    type="text" 
                    value={formData.website || ''}
                    onChange={(e) => handleChange('website', e.target.value)}
                    className={inputClass}
                    placeholder="https://"
                />
            </div>
        </div>

        <div className="p-6 border-t border-white/10 bg-surface-highlight">
            <button 
                onClick={handleSave}
                disabled={isSaving}
                className="w-full py-3 bg-primary hover:bg-primary-hover disabled:bg-gray-800 text-white font-bold rounded flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
                {isSaving ? (
                    <span className="material-symbols-outlined animate-spin">sync</span>
                ) : (
                    <span>保存资料</span>
                )}
            </button>
        </div>
      </div>
    </div>
  );
};