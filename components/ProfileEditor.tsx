
import React, { useState } from 'react';
import { UserProfile } from '../types';

interface ProfileEditorProps {
  profile: UserProfile;
  onSave: (profile: UserProfile) => void;
  onClose: () => void;
}

const AVATAR_PRESETS = [
    'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=200', // Camera Lens
    'https://images.unsplash.com/photo-1590483736622-39da8af75bba?auto=format&fit=crop&q=80&w=200', // Film Roll
    'https://images.unsplash.com/photo-1543157145-f78c636d023d?auto=format&fit=crop&q=80&w=200', // Darkroom
    'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&q=80&w=200', // Vintage SLR
    'https://images.unsplash.com/photo-1517139031939-68c67946979a?auto=format&fit=crop&q=80&w=200', // Shutter
    'https://images.unsplash.com/photo-1495121553079-4c61bbbc19ef?auto=format&fit=crop&q=80&w=200'  // Negative
];

export const ProfileEditor: React.FC<ProfileEditorProps> = ({ profile, onSave, onClose }) => {
  const [formData, setFormData] = useState<UserProfile>(profile);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (field: keyof UserProfile, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => handleChange('avatar', ev.target?.result as string);
      reader.readAsDataURL(e.target.files[0]);
    }
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
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative w-full max-w-md bg-[#111] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in">
        <div className="px-8 py-6 border-b border-white/10 flex justify-between items-center">
            <h2 className="text-white font-black text-xl uppercase tracking-tighter">Edit Identity</h2>
            <button onClick={onClose} className="size-8 rounded-full bg-white/5 flex items-center justify-center text-muted hover:text-white transition-colors">
                <span className="material-symbols-outlined text-sm">close</span>
            </button>
        </div>

        <div className="p-8 overflow-y-auto space-y-8 no-scrollbar">
            {/* Avatar Section */}
            <div className="space-y-4">
                <label className={labelClass}>Profile Image</label>
                <div className="flex flex-col items-center gap-6">
                    <div className="relative group size-24">
                        <div className="size-full rounded-full overflow-hidden border-2 border-primary/20 bg-surface-highlight shadow-xl">
                            <img src={formData.avatar} className="w-full h-full object-cover" />
                        </div>
                        <button 
                            onClick={() => document.getElementById('avatar-upload')?.click()}
                            className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <span className="material-symbols-outlined text-white">add_a_photo</span>
                        </button>
                        <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                    </div>
                    
                    <div className="grid grid-cols-6 gap-2 w-full">
                        {AVATAR_PRESETS.map((url, idx) => (
                            <button 
                                key={idx}
                                onClick={() => handleChange('avatar', url)}
                                className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${formData.avatar === url ? 'border-primary scale-110 shadow-lg' : 'border-transparent opacity-40 hover:opacity-100'}`}
                            >
                                <img src={url} className="size-full object-cover" />
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <label className={labelClass}>Display Name</label>
                    <input type="text" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} className={inputClass} />
                </div>
                <div>
                    <label className={labelClass}>Signature / Role</label>
                    <input type="text" value={formData.role} onChange={(e) => handleChange('role', e.target.value)} className={inputClass} />
                </div>
                <div>
                    <label className={labelClass}>Bio</label>
                    <textarea value={formData.bio || ''} onChange={(e) => handleChange('bio', e.target.value)} className={`${inputClass} h-20 resize-none`} />
                </div>
            </div>
        </div>

        <div className="p-8 border-t border-white/10 bg-black/20">
            <button 
                onClick={handleSave}
                disabled={isSaving}
                className="w-full py-4 bg-primary text-white font-black rounded-xl uppercase text-xs tracking-[0.2em] active:scale-[0.98] transition-all shadow-xl shadow-primary/20"
            >
                {isSaving ? <span className="material-symbols-outlined animate-spin">sync</span> : 'Save Changes'}
            </button>
        </div>
      </div>
    </div>
  );
};
