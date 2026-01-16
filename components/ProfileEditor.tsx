
import React, { useState } from 'react';
import { UserProfile } from '../types';

interface ProfileEditorProps {
  profile: UserProfile;
  onSave: (profile: UserProfile) => void;
  onClose: () => void;
}

const AVATAR_PRESETS = [
    'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=200',
    'https://images.unsplash.com/photo-1590483736622-39da8af75bba?auto=format&fit=crop&q=80&w=200',
    'https://images.unsplash.com/photo-1543157145-f78c636d023d?auto=format&fit=crop&q=80&w=200',
    'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&q=80&w=200',
    'https://images.unsplash.com/photo-1517139031939-68c67946979a?auto=format&fit=crop&q=80&w=200',
    'https://images.unsplash.com/photo-1495121553079-4c61bbbc19ef?auto=format&fit=crop&q=80&w=200'
];

export const ProfileEditor: React.FC<ProfileEditorProps> = ({ profile, onSave, onClose }) => {
  const [formData, setFormData] = useState<UserProfile>(profile);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (field: keyof UserProfile, value: any) => {
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

  const inputClass = "w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white font-mono focus:border-primary focus:outline-none transition-all";
  const labelClass = "block text-[10px] uppercase tracking-widest text-muted mb-2 ml-1";

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose}></div>
      
      <div className="relative w-full max-w-md bg-surface-dark border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in">
        <div className="px-8 py-6 border-b border-white/10 flex justify-between items-center">
            <h2 className="text-white font-black text-xl uppercase tracking-tighter">Edit Identity</h2>
            <button onClick={onClose} className="size-10 rounded-full bg-white/5 flex items-center justify-center text-muted">
                <span className="material-symbols-outlined">close</span>
            </button>
        </div>

        <div className="p-8 overflow-y-auto space-y-8 no-scrollbar">
            <div className="space-y-4">
                <label className={labelClass}>选择头像</label>
                <div className="grid grid-cols-6 gap-2">
                    {AVATAR_PRESETS.map((url, idx) => (
                        <button 
                            key={idx}
                            onClick={() => handleChange('avatar', url)}
                            className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${formData.avatar === url ? 'border-primary scale-105' : 'border-transparent opacity-40'}`}
                        >
                            <img src={url} className="size-full object-cover" />
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-5">
                <div>
                    <label className={labelClass}>显示名称</label>
                    <input type="text" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} className={inputClass} />
                </div>
                <div>
                    <label className={labelClass}>个人简介 (Bio)</label>
                    <textarea value={formData.bio || ''} onChange={(e) => handleChange('bio', e.target.value)} className={`${inputClass} h-32 resize-none`} placeholder="写点什么..." />
                </div>
                <div>
                    <label className={labelClass}>最爱相机</label>
                    <input type="text" value={formData.favoriteCamera || ''} onChange={(e) => handleChange('favoriteCamera', e.target.value)} className={inputClass} placeholder="例如: Hasselblad 503CX" />
                </div>
            </div>
        </div>

        <div className="p-8 border-t border-white/5 bg-black/20">
            <button 
                onClick={handleSave}
                disabled={isSaving}
                className="w-full py-5 bg-primary text-white font-black rounded-2xl uppercase text-xs tracking-[0.2em] shadow-xl active:scale-[0.98] transition-all"
            >
                {isSaving ? <span className="material-symbols-outlined animate-spin">sync</span> : '保存更改'}
            </button>
        </div>
      </div>
    </div>
  );
};
