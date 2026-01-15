import React, { useState, useEffect } from 'react';
import { View, Roll, RollStatus, ExifData, FilmPhoto, PhotoAnalysis, UserProfile } from './types';
import { Navigation } from './components/Navigation';
import { Scanner } from './components/Scanner';
import { BatchExifEditor } from './components/BatchExifEditor';
import { ContactSheet } from './components/ContactSheet';
import { DevelopmentTimer } from './components/DevelopmentTimer';
import { ProfileEditor } from './components/ProfileEditor';
import { ExportSettings } from './components/ExportSettings';
import { IdentificationResult, analyzePhoto } from './services/geminiService';

// Mock Initial Data
const INITIAL_ROLLS: Roll[] = [
  {
    id: '1',
    brand: 'Kodak',
    name: 'Portra 400',
    iso: 400,
    camera: 'Canon AE-1',
    date: '2023-10-12',
    status: RollStatus.DEVELOPED,
    coverImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDV4jIrjKhkFgsHYMSyBvXcSIgVd2CUuukP-HJDnNhH2GMjaNgZpWwFrEd35zTsBvPHSKh3qjE82BfjPjKKNOq6H15DBTBLtuKw98ku7JKO6-rXIso5L9zqLHESXbGU11kv057G9wPo49rdqfw26Ekwvi4H4PwwMrIJWWApdufbFM6ePR9VVEq6uwXgpPta6Kb_tkgFUO_Z78eh4BzxV2peTSEPlZeoCtjMvkjxJVYwGv_ukdROoJBfWSAvZKn0yjVJDKBd5uRoQ1QE',
    photos: [],
    framesTaken: 36,
    totalFrames: 36,
    defaultExif: {
      camera: 'Canon AE-1',
      lens: '50mm f/1.8',
      date: '2023-10-12',
      copyright: 'Ansel'
    }
  },
  {
    id: '2',
    brand: 'Ilford',
    name: 'HP5 Plus',
    iso: 400,
    camera: 'Leica M6',
    date: '2023-08-24',
    status: RollStatus.ARCHIVED,
    coverImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCmO06RXPSz9EWWyR07zsuPqAxhTPGs5P5IcjSWwo4rORrCriJcbZNESEf9wnOKMkZsUocL3doDD-geiv-VwV9IVAhE2h4ZeNnAmrkWeEbW1ggM8d3CzBL5yqd3IstsC_E_1jI4DZ8d9MBSgKgTaVo9icXRTMW-fexv4Rh6shPyLZabY3MYjdesBHgL5bTyDHjcMYjo4gdOagC-kGdOETrmEQXydPJ_MkU6KsGg7BulO1kCG4zAXtEmnh3ag3znhWvvDCiK44N-CCdH',
    photos: [],
    framesTaken: 36,
    totalFrames: 36
  },
  {
    id: '3',
    brand: 'Cinestill',
    name: '800T',
    iso: 800,
    camera: 'Nikon F3',
    date: '2023-12-02',
    status: RollStatus.IN_LAB,
    coverImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAEdZfBh-3OfiPWrbsOJdcE5YrChxS0BUpWD3DbpypU2eh-5j4zlGvRBkQfrBZ2ebak-Rq8m4UnpW-5ysubc-7i2MeL7Xuc-6_078tVMeHXxUwhSbMchSSevAY7zmQs4Fur4rJP44mYUsOJVtzNred2L54Knmg8i_PEbHnISW9HtNXvI0XmDw6tD4TGfLuIo9l4-2ujuvk1sqKJOKj4jTmHs5Lij2uvniSaNsvBxZehBBCm_RdOc06t--ZZ7vmR5AQ3iJ9OuUVPFnCT',
    photos: [],
    framesTaken: 36,
    totalFrames: 36
  }
];

const INITIAL_PROFILE: UserProfile = {
    name: 'Julian Baskier',
    role: 'Archivist since 2021',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDtmVux-JAY4yQ064jSZFMOpHbf8fgXhgCLZojHjmOhrbC1cYAraG9FY-eotdWvGq4XTSHN_wIaZsx_mVgiIJNdQoc1IpjCgxXOsfnpghi-3eXwS2R4HSNqDv2AGfjRRyztzFBQxoxgUNNt9j2zCC6qZ1bxeTVMboIFjZCJP3xDTyg5VZSziAFFMEHEp1t4KmiNdbQchjm9FBBYtcaLVlNp-h8FtofuEgOllamTdoSJl44EHUQNvhpCmtWX48zu1jYRC03u2E8MzS35',
    bio: 'Capturing moments on silver halides. Focused on street photography and architectural abstraction.',
    favoriteCamera: 'Leica M6',
    favoriteFilm: 'Kodak Tri-X 400',
    website: 'julian.darkroom.com'
};

// --- Lightbox Component ---
const Lightbox = ({ photo, onClose, onAnalyze }: { 
    photo: FilmPhoto, 
    onClose: () => void,
    onAnalyze: (photoId: string, url: string) => void
}) => {
    const [isPanelOpen, setIsPanelOpen] = useState(false);

    useEffect(() => {
        if (photo.analysis) setIsPanelOpen(true);
    }, [photo]);

    return (
        <div className="fixed inset-0 z-[70] bg-black/95 backdrop-blur-xl flex flex-col md:flex-row animate-fade-in">
            {/* Toolbar */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20 bg-gradient-to-b from-black/80 to-transparent">
                <button onClick={onClose} className="text-white/80 hover:text-white bg-black/40 p-2 rounded-full backdrop-blur">
                    <span className="material-symbols-outlined">close</span>
                </button>
                <div className="flex gap-4">
                     <button 
                        onClick={() => {
                            if (!photo.analysis) onAnalyze(photo.id, photo.url);
                            setIsPanelOpen(!isPanelOpen);
                        }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${
                            photo.analysis 
                            ? 'bg-primary/20 border-primary text-primary-hover' 
                            : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                        }`}
                     >
                        <span className="material-symbols-outlined text-[18px]">{photo.analysis ? 'check_circle' : 'auto_awesome'}</span>
                        <span className="text-xs font-bold uppercase tracking-wider">
                            {photo.analysis ? 'AI 分析完成' : 'AI 验片'}
                        </span>
                     </button>
                </div>
            </div>

            {/* Main Image */}
            <div className="flex-1 flex items-center justify-center p-4 md:p-12 overflow-hidden h-full">
                <img 
                    src={photo.url} 
                    className="max-w-full max-h-full object-contain shadow-2xl rounded-sm" 
                    style={{boxShadow: '0 0 50px rgba(0,0,0,0.8)'}}
                />
            </div>

            {/* Analysis Panel */}
            <div className={`
                fixed inset-x-0 bottom-0 md:static md:w-96 bg-[#111] border-t md:border-t-0 md:border-l border-white/10 
                transform transition-transform duration-300 ease-out z-10 flex flex-col
                ${isPanelOpen ? 'translate-y-0' : 'translate-y-full md:translate-x-full md:translate-y-0'}
            `}>
                <div className="p-6 h-full overflow-y-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                             <span className="material-symbols-outlined text-primary">analytics</span>
                             验片报告
                        </h3>
                        {photo.analysis && (
                             <div className="px-2 py-1 bg-white/10 rounded text-sm font-mono font-bold text-primary-hover">
                                {photo.analysis.rating}/10
                             </div>
                        )}
                    </div>

                    {!photo.analysis ? (
                        <div className="flex flex-col items-center justify-center h-64 text-muted gap-4">
                            <span className="material-symbols-outlined text-4xl animate-pulse">downloading</span>
                            <p className="text-xs uppercase tracking-widest text-center">Gemini 正在观察照片...</p>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-fade-in">
                             {/* Mood */}
                             <div className="space-y-2">
                                <label className="text-[10px] uppercase tracking-widest text-muted">色彩与氛围</label>
                                <p className="text-sm text-white/90 leading-relaxed font-light">{photo.analysis.mood}</p>
                             </div>

                             {/* Composition */}
                             <div className="space-y-2">
                                <label className="text-[10px] uppercase tracking-widest text-muted">构图分析</label>
                                <p className="text-sm text-white/90 leading-relaxed font-light">{photo.analysis.composition}</p>
                             </div>

                             {/* Tags */}
                             <div className="space-y-2">
                                <label className="text-[10px] uppercase tracking-widest text-muted">推荐标签</label>
                                <div className="flex flex-wrap gap-2">
                                    {photo.analysis.tags.map(tag => (
                                        <span key={tag} className="text-[10px] text-primary bg-primary/10 border border-primary/20 px-2 py-1 rounded-sm font-mono">
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                             </div>

                             {/* Technical (from EXIF if avail) */}
                             {photo.exif && (
                                <div className="pt-6 border-t border-white/10 space-y-3">
                                    <div className="flex justify-between text-xs font-mono">
                                        <span className="text-muted">Camera</span>
                                        <span>{photo.exif.camera}</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-mono">
                                        <span className="text-muted">Lens</span>
                                        <span>{photo.exif.lens}</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-mono">
                                        <span className="text-muted">Date</span>
                                        <span>{photo.exif.date}</span>
                                    </div>
                                </div>
                             )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default function App() {
  const [currentView, setCurrentView] = useState<View>(View.SPLASH);
  const [rolls, setRolls] = useState<Roll[]>(INITIAL_ROLLS);
  const [activeRollId, setActiveRollId] = useState<string | null>(null);
  const [isExifModalOpen, setIsExifModalOpen] = useState(false);
  const [isProfileEditorOpen, setIsProfileEditorOpen] = useState(false);
  const [isExportSettingsOpen, setIsExportSettingsOpen] = useState(false);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile>(INITIAL_PROFILE);

  // Splash Screen Timer
  useEffect(() => {
    if (currentView === View.SPLASH) {
      const timer = setTimeout(() => {
        setCurrentView(View.DASHBOARD);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [currentView]);

  const handleScanComplete = (result: IdentificationResult, captureImage: string) => {
    const newRoll: Roll = {
      id: Date.now().toString(),
      brand: result.brand || 'Unknown',
      name: result.name || 'Film Stock',
      iso: result.iso || 400,
      camera: 'Unknown',
      date: new Date().toISOString().split('T')[0],
      status: RollStatus.ACTIVE,
      coverImage: captureImage,
      photos: [],
      framesTaken: 0,
      totalFrames: 36
    };

    setRolls([newRoll, ...rolls]);
    setActiveRollId(newRoll.id);
    setCurrentView(View.ROLL_DETAIL);
  };

  const handleRollClick = (id: string) => {
    setActiveRollId(id);
    setCurrentView(View.ROLL_DETAIL);
  };

  const handleUpdateRollStatus = (rollId: string, newStatus: RollStatus) => {
    setRolls(prevRolls => prevRolls.map(roll => 
        roll.id === rollId ? { ...roll, status: newStatus } : roll
    ));
  };

  const handleUpdateProfile = (newProfile: UserProfile) => {
      setUserProfile(newProfile);
  };

  const handleFileUpload = (rollId: string, files: FileList | null) => {
    if (!files) return;

    const newPhotos = Array.from(files).map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      url: URL.createObjectURL(file),
      // In a real app, we might extract EXIF here first
    }));

    setRolls(prevRolls => prevRolls.map(roll => {
      if (roll.id === rollId) {
        return {
          ...roll,
          photos: [...roll.photos, ...newPhotos],
          framesTaken: Math.min(roll.totalFrames, roll.photos.length + newPhotos.length)
        };
      }
      return roll;
    }));
  };

  const handleBatchExifSave = (exifData: ExifData) => {
    if (!activeRollId) return;

    setRolls(prevRolls => prevRolls.map(roll => {
        if (roll.id === activeRollId) {
            // Apply new camera/date to roll, and EXIF to all photos
            return {
                ...roll,
                camera: exifData.camera,
                date: exifData.date || roll.date,
                defaultExif: exifData,
                photos: roll.photos.map(p => ({
                    ...p,
                    exif: { ...p.exif, ...exifData } // Merge with existing, overwrite with new
                }))
            };
        }
        return roll;
    }));
  };

  const handleAnalyzePhoto = async (photoId: string, url: string) => {
    // Optimistic UI or loading state is handled inside Lightbox via null check
    const analysis = await analyzePhoto(url);
    
    setRolls(prevRolls => prevRolls.map(roll => ({
        ...roll,
        photos: roll.photos.map(p => {
            if (p.id === photoId) {
                return { ...p, analysis };
            }
            return p;
        })
    })));
  };

  // --- Views ---

  const renderSplash = () => (
    <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-background-dark">
      <div className="absolute inset-0 bg-noise opacity-10 mix-blend-overlay"></div>
      <div className="relative z-10 flex flex-col items-center gap-8 animate-fade-in">
        <div className="relative group">
            <div className="w-24 h-36 bg-[#111] border border-[#333] rounded-lg relative shadow-2xl flex flex-col items-center overflow-hidden animate-pulse-slow">
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.05] to-transparent"></div>
                <div className="mt-6 w-full h-16 bg-[#1a1a1a] border-y border-[#2a2a2a] flex items-center justify-center relative">
                     <div className="flex gap-1 opacity-20">
                        <div className="w-1 h-6 bg-white"></div>
                        <div className="w-3 h-6 bg-white"></div>
                        <div className="w-1 h-6 bg-white"></div>
                    </div>
                </div>
            </div>
            <div className="absolute bottom-4 -right-8 w-12 h-8 bg-[#050505] border border-[#333] rounded-r-md rotate-[-10deg] flex items-center pl-1">
                 <div className="flex gap-1">
                    <div className="w-1.5 h-2 border border-[#333]"></div>
                    <div className="w-1.5 h-2 border border-[#333]"></div>
                 </div>
            </div>
        </div>
        <div className="text-center">
            <h1 className="text-white text-3xl font-black tracking-[0.3em] leading-tight font-display">FILM<br/>ARCHIVE</h1>
            <div className="h-px w-8 bg-primary/60 mx-auto my-4"></div>
            <p className="text-white/40 text-[10px] uppercase tracking-widest font-mono">Digital Darkroom AI</p>
        </div>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="flex-1 px-4 pt-6 flex flex-col gap-8 overflow-y-auto pb-32 no-scrollbar">
       <header className="flex justify-between items-center mb-2">
         <div>
            <h2 className="text-3xl font-bold leading-tight text-white mb-1 font-display">晚上好, <span className="text-muted">{userProfile.name.split(' ')[0]}</span></h2>
            <p className="text-sm text-muted">准备好冲洗了吗?</p>
         </div>
         <div onClick={() => setCurrentView(View.PROFILE)} className="size-10 rounded-full bg-gray-800 border border-white/10 overflow-hidden cursor-pointer hover:border-primary transition-colors">
            <img src={userProfile.avatar} className="w-full h-full object-cover grayscale" />
         </div>
       </header>

       {/* Active Roll Widget */}
       {rolls.length > 0 && (
         <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted">当前胶卷</h3>
                <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">进行中</span>
            </div>
            <div 
                onClick={() => handleRollClick(rolls[0].id)}
                className="relative bg-surface-highlight rounded-lg w-full overflow-hidden shadow-2xl border border-white/5 group cursor-pointer active:scale-[0.98] transition-transform"
            >
                <div className="flex gap-2 p-1 bg-[#111] opacity-60 border-b border-white/5 overflow-hidden">
                    {[...Array(12)].map((_, i) => <div key={i} className="w-3 h-4 bg-black rounded-[2px] shrink-0" />)}
                </div>
                <div className="flex flex-col sm:flex-row">
                    <div className="relative w-full aspect-video sm:w-1/3 bg-black border-b sm:border-b-0 sm:border-r border-white/5">
                        <img src={rolls[0].coverImage} className="w-full h-full object-cover opacity-80" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent"></div>
                        <div className="absolute bottom-3 left-3">
                             <span className="text-xs font-mono text-white/70 bg-black/50 px-1.5 py-0.5 rounded backdrop-blur-sm">ISO {rolls[0].iso}</span>
                        </div>
                    </div>
                    <div className="flex-1 p-5 bg-[#141414] flex flex-col justify-between gap-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="text-white text-lg font-bold leading-none mb-1">{rolls[0].name}</h4>
                                <div className="flex items-center gap-2 text-muted text-xs uppercase tracking-wider mt-1">
                                    <span className="material-symbols-outlined text-[14px]">camera</span>
                                    {rolls[0].brand}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-bold text-white font-mono">{rolls[0].framesTaken}<span className="text-muted text-base">/{rolls[0].totalFrames}</span></div>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full" style={{width: `${(rolls[0].framesTaken / rolls[0].totalFrames) * 100}%`}}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
         </section>
       )}

       {/* Tools Section */}
       <section className="flex flex-col gap-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted px-1">暗房工具</h3>
          <div 
             onClick={() => setCurrentView(View.DEVELOP_TIMER)}
             className="bg-surface-highlight border border-white/5 p-4 rounded-lg flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors group"
          >
             <div className="flex items-center gap-4">
                <div className="size-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 group-hover:bg-red-500 group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined">timer</span>
                </div>
                <div>
                    <h4 className="font-bold text-white">冲洗助手</h4>
                    <p className="text-xs text-muted">Dev • Stop • Fix • Wash</p>
                </div>
             </div>
             <span className="material-symbols-outlined text-muted">chevron_right</span>
          </div>
       </section>

       {/* Stats Grid */}
       <div className="grid grid-cols-2 gap-3">
          <div 
            onClick={() => setCurrentView(View.LIBRARY)}
            className="bg-surface-highlight border border-white/5 p-4 rounded flex flex-col justify-between h-32 active:bg-white/5 transition-colors cursor-pointer"
          >
             <span className="text-xs font-bold text-muted/60 uppercase tracking-widest border border-muted/30 px-2 py-0.5 w-fit rounded-sm">已冲洗</span>
             <div>
                <span className="block text-2xl font-bold text-white">1,204</span>
                <span className="text-xs text-muted">归档底片</span>
             </div>
          </div>
          <div 
             onClick={() => setCurrentView(View.LIBRARY)}
             className="bg-surface-highlight border border-white/5 p-4 rounded flex flex-col justify-between h-32 active:bg-white/5 transition-colors cursor-pointer"
          >
             <span className="text-xs font-bold text-primary/80 uppercase tracking-widest border border-primary/30 px-2 py-0.5 w-fit rounded-sm">待处理</span>
             <div>
                <span className="block text-2xl font-bold text-white">3</span>
                <span className="text-xs text-muted">排队中</span>
             </div>
          </div>
       </div>
    </div>
  );

  const renderStats = () => (
    <div className="flex-1 flex flex-col h-full bg-background-dark">
        <header className="px-5 pt-8 pb-4 sticky top-0 bg-background-dark/95 backdrop-blur z-10 border-b border-white/5">
            <h1 className="text-white text-3xl font-bold uppercase leading-none font-display">数据<br/>分析</h1>
        </header>
        <div className="flex-1 overflow-y-auto p-5 pb-32 no-scrollbar space-y-6">
            
            {/* Monthly Usage Chart (Mock) */}
            <div className="bg-surface-highlight border border-white/5 p-5 rounded-lg">
                <h3 className="text-sm font-bold text-muted uppercase tracking-widest mb-6">年度拍摄概览</h3>
                <div className="flex items-end justify-between h-32 gap-2">
                    {[30, 45, 25, 60, 80, 40, 20, 50, 70, 90, 55, 65].map((h, i) => (
                        <div key={i} className="w-full bg-white/10 hover:bg-primary/80 transition-colors rounded-t-sm relative group" style={{height: `${h}%`}}>
                             <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity font-mono">
                                {h}
                             </div>
                        </div>
                    ))}
                </div>
                <div className="flex justify-between mt-3 text-[10px] text-muted font-mono uppercase">
                    <span>Jan</span>
                    <span>Dec</span>
                </div>
            </div>

            {/* Top Brands */}
            <div className="bg-surface-highlight border border-white/5 p-5 rounded-lg">
                 <h3 className="text-sm font-bold text-muted uppercase tracking-widest mb-4">胶卷品牌偏好</h3>
                 <div className="space-y-4">
                    {[
                        { name: 'Kodak', percent: 65, color: 'bg-[#ffc107]' },
                        { name: 'Ilford', percent: 20, color: 'bg-white' },
                        { name: 'Fujifilm', percent: 10, color: 'bg-[#4caf50]' },
                        { name: 'Cinestill', percent: 5, color: 'bg-[#f44336]' },
                    ].map((item) => (
                        <div key={item.name} className="flex items-center gap-3">
                            <span className="text-xs font-bold w-16 text-right">{item.name}</span>
                            <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                                <div className={`h-full ${item.color}`} style={{width: `${item.percent}%`}}></div>
                            </div>
                            <span className="text-xs font-mono text-muted w-8">{item.percent}%</span>
                        </div>
                    ))}
                 </div>
            </div>

            {/* ISO Distribution */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface-highlight border border-white/5 p-4 rounded-lg flex flex-col items-center justify-center py-6">
                     <div className="size-20 rounded-full border-4 border-primary/20 flex items-center justify-center relative">
                        <span className="text-xl font-bold font-mono">400</span>
                        <span className="absolute -bottom-6 text-[10px] text-muted uppercase">最常用 ISO</span>
                     </div>
                </div>
                 <div className="bg-surface-highlight border border-white/5 p-4 rounded-lg flex flex-col items-center justify-center py-6">
                     <div className="size-20 rounded-full border-4 border-white/10 flex items-center justify-center relative">
                        <span className="text-xl font-bold font-mono">35mm</span>
                        <span className="absolute -bottom-6 text-[10px] text-muted uppercase">主要画幅</span>
                     </div>
                </div>
            </div>

        </div>
    </div>
  );

  const renderLibrary = () => (
    <div className="flex-1 flex flex-col h-full">
        <header className="px-5 pt-8 pb-4 sticky top-0 bg-background-dark/95 backdrop-blur z-10 border-b border-white/5">
            <h1 className="text-white text-3xl font-bold uppercase leading-none mb-4 font-display">胶片<br/>档案</h1>
            <div className="flex gap-3 overflow-x-auto no-scrollbar">
                <button className="shrink-0 px-4 py-1.5 rounded-full bg-primary text-white text-xs font-bold uppercase border border-primary">全部</button>
                <button className="shrink-0 px-4 py-1.5 rounded-full text-gray-400 border border-white/20 text-xs font-bold uppercase">已冲洗</button>
                <button className="shrink-0 px-4 py-1.5 rounded-full text-gray-400 border border-white/20 text-xs font-bold uppercase">冲扫中</button>
            </div>
        </header>
        <div className="flex-1 overflow-y-auto p-5 pb-32 no-scrollbar">
            <div className="grid grid-cols-2 gap-4">
                {rolls.map(roll => (
                    <div key={roll.id} onClick={() => handleRollClick(roll.id)} className="group flex flex-col gap-3 cursor-pointer">
                        <div className="relative aspect-[4/5] w-full rounded-sm overflow-hidden bg-stone-800 border border-white/10 group-hover:border-primary/50 transition-all">
                            <img src={roll.coverImage} className="w-full h-full object-cover" />
                            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur px-2 py-0.5 rounded-sm">
                                <span className="text-[10px] font-mono font-bold text-white uppercase">{roll.status}</span>
                            </div>
                            <div className="absolute bottom-0 left-0 w-full p-3 bg-gradient-to-t from-black/90 to-transparent">
                                <h3 className="text-white font-bold text-lg leading-tight">{roll.name}</h3>
                            </div>
                        </div>
                        <div className="flex flex-col gap-1 font-mono text-xs text-gray-400 border-l border-white/20 pl-3">
                            <div className="flex justify-between items-center">
                                <span>{roll.brand}</span>
                                <span className="text-[10px] opacity-60">ISO {roll.iso}</span>
                            </div>
                            <span className="opacity-50">{roll.date}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );

  const renderRollDetail = () => {
    const roll = rolls.find(r => r.id === activeRollId);
    if (!roll) return null;

    const activePhoto = roll.photos.find(p => p.id === selectedPhotoId);

    return (
        <div className="flex-1 flex flex-col bg-background-dark h-full overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-surface-highlight">
                <button onClick={() => setCurrentView(View.LIBRARY)} className="flex items-center text-muted hover:text-white">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h2 className="text-sm font-bold uppercase tracking-widest">{roll.brand} {roll.name}</h2>
                <span className="w-6"></span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 pb-32">
                 <div className="flex items-start gap-6 mb-8">
                    <div className="w-24 h-32 rounded bg-gray-800 overflow-hidden shrink-0 border border-white/20">
                        <img src={roll.coverImage} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-white mb-2">{roll.name}</h1>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs font-mono text-muted">
                            <span>ISO: {roll.iso}</span>
                            <span>Date: {roll.date}</span>
                            <div className="flex items-center gap-2">
                                <span>Status:</span>
                                <select 
                                    value={roll.status} 
                                    onChange={(e) => handleUpdateRollStatus(roll.id, e.target.value as RollStatus)}
                                    className="bg-transparent border-b border-white/20 text-white focus:outline-none text-xs font-mono appearance-none cursor-pointer hover:border-primary hover:text-primary transition-colors pr-2"
                                >
                                    {Object.values(RollStatus).map(s => (
                                        <option key={s} value={s} className="bg-[#111] text-white">{s}</option>
                                    ))}
                                </select>
                            </div>
                            <span>Frames: {roll.photos.length}/{roll.totalFrames}</span>
                        </div>
                        {roll.defaultExif && (
                            <div className="mt-4 pt-4 border-t border-white/5 text-[10px] font-mono text-muted/60">
                                <div>CAMERA: {roll.defaultExif.camera || '-'}</div>
                                <div>LENS: {roll.defaultExif.lens || '-'}</div>
                            </div>
                        )}
                    </div>
                 </div>

                 {/* Actions Section */}
                 <div className="mb-8 grid grid-cols-2 gap-4">
                    <button 
                        onClick={() => setIsExifModalOpen(true)}
                        className="flex flex-col items-center justify-center h-24 rounded-lg bg-surface-highlight border border-white/10 hover:border-primary/50 hover:bg-white/5 transition-all group"
                    >
                        <span className="material-symbols-outlined text-muted group-hover:text-primary mb-1">edit_document</span>
                        <span className="text-xs font-bold uppercase tracking-wider text-muted group-hover:text-white">批量 EXIF</span>
                    </button>

                    <label className="flex flex-col items-center justify-center h-24 rounded-lg border-2 border-dashed border-white/20 hover:border-primary hover:bg-white/5 transition-all cursor-pointer group">
                        <span className="material-symbols-outlined text-muted group-hover:text-primary mb-1">add_photo_alternate</span>
                        <span className="text-xs font-bold uppercase tracking-wider text-muted group-hover:text-white">导入照片</span>
                        <input 
                            type="file" 
                            multiple 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => handleFileUpload(roll.id, e.target.files)}
                        />
                    </label>

                    {/* New Contact Sheet Button */}
                    <button 
                        onClick={() => setCurrentView(View.CONTACT_SHEET)}
                        className="col-span-2 flex items-center justify-center gap-2 h-12 rounded-lg bg-[#000] border border-white/20 hover:border-white transition-all group"
                    >
                        <span className="material-symbols-outlined text-sm text-gray-400 group-hover:text-white">grid_on</span>
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-400 group-hover:text-white">生成数字印样 (Contact Sheet)</span>
                    </button>
                 </div>

                 {/* Photos Grid */}
                 <div className="grid grid-cols-3 gap-1">
                    {roll.photos.map((photo, index) => (
                        <div 
                            key={photo.id} 
                            onClick={() => setSelectedPhotoId(photo.id)}
                            className="aspect-square bg-gray-900 relative group overflow-hidden cursor-pointer"
                        >
                            <img src={photo.url} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="font-mono text-xs text-white">#{index + 1}</span>
                            </div>
                             {/* EXIF Indicator Dot */}
                            {photo.exif && (
                                <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-primary rounded-full shadow-sm"></div>
                            )}
                             {/* Analyzed Indicator Dot */}
                             {photo.analysis && (
                                <div className="absolute bottom-1 right-1">
                                    <span className="material-symbols-outlined text-[10px] text-primary drop-shadow-md">auto_awesome</span>
                                </div>
                            )}
                        </div>
                    ))}
                    {/* Empty slots visualizer */}
                    {[...Array(Math.max(0, roll.totalFrames - roll.photos.length))].map((_, i) => (
                        <div key={`empty-${i}`} className="aspect-square bg-white/5 flex items-center justify-center border border-white/5">
                            <span className="text-[10px] text-white/10 font-mono">{roll.photos.length + i + 1}</span>
                        </div>
                    ))}
                 </div>
            </div>
            
            {/* Modal */}
            {isExifModalOpen && roll && (
                <BatchExifEditor 
                    roll={roll} 
                    onSave={handleBatchExifSave} 
                    onClose={() => setIsExifModalOpen(false)} 
                />
            )}

            {/* Lightbox / AI Inspector */}
            {activePhoto && (
                <Lightbox 
                    photo={activePhoto}
                    onClose={() => setSelectedPhotoId(null)}
                    onAnalyze={handleAnalyzePhoto}
                />
            )}
        </div>
    );
  };

  const renderProfile = () => (
      <div className="flex-1 flex flex-col items-center pt-12 px-6 overflow-y-auto pb-32 no-scrollbar">
        <div 
            onClick={() => setIsProfileEditorOpen(true)}
            className="relative group cursor-pointer mb-6"
        >
            <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-primary/50 shadow-lg shadow-primary/10">
                <img src={userProfile.avatar} className="w-full h-full object-cover grayscale" />
            </div>
            <div className="absolute bottom-0 right-0 bg-primary text-white p-1.5 rounded-full border-2 border-background-dark group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[16px]">edit</span>
            </div>
        </div>
        <h2 className="text-xl font-bold tracking-tight mb-1 text-center">{userProfile.name}</h2>
        <p className="text-xs font-medium text-primary/80 uppercase tracking-widest mb-6 text-center">{userProfile.role}</p>
        
        {userProfile.bio && (
             <p className="text-sm text-muted text-center max-w-xs mb-8 leading-relaxed font-light">
                {userProfile.bio}
             </p>
        )}

        <div className="grid grid-cols-2 gap-4 w-full max-w-sm mb-8">
            {userProfile.favoriteCamera && (
                <div className="bg-surface-highlight border border-white/5 p-3 rounded flex flex-col items-center">
                    <span className="text-[10px] uppercase tracking-widest text-muted mb-1">Favorite Camera</span>
                    <span className="text-sm font-bold">{userProfile.favoriteCamera}</span>
                </div>
            )}
             {userProfile.favoriteFilm && (
                <div className="bg-surface-highlight border border-white/5 p-3 rounded flex flex-col items-center">
                    <span className="text-[10px] uppercase tracking-widest text-muted mb-1">Favorite Film</span>
                    <span className="text-sm font-bold">{userProfile.favoriteFilm}</span>
                </div>
            )}
        </div>
        
        <div className="w-full max-w-sm bg-surface-highlight border border-white/5 rounded-lg overflow-hidden divide-y divide-white/5">
            <button className="w-full flex items-center justify-between p-4 hover:bg-white/5">
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-gray-400">cloud_sync</span>
                    <span className="text-sm font-medium">云同步</span>
                </div>
                <span className="text-xs text-green-500">已同步</span>
            </button>
             <button 
                onClick={() => setIsExportSettingsOpen(true)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
             >
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-gray-400">tune</span>
                    <span className="text-sm font-medium">导出设置</span>
                </div>
                <span className="material-symbols-outlined text-gray-600 text-sm">chevron_right</span>
            </button>
            {userProfile.website && (
                <a href={`https://${userProfile.website}`} target="_blank" className="w-full flex items-center justify-between p-4 hover:bg-white/5">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-gray-400">public</span>
                        <span className="text-sm font-medium">个人主页</span>
                    </div>
                    <span className="material-symbols-outlined text-gray-600 text-sm">open_in_new</span>
                </a>
            )}
        </div>
      </div>
  );

  return (
    <div className="relative w-full h-screen bg-background-dark text-white overflow-hidden flex flex-col font-body">
      {/* View Router */}
      {currentView === View.SPLASH && renderSplash()}
      {currentView === View.DASHBOARD && renderDashboard()}
      {currentView === View.LIBRARY && renderLibrary()}
      {currentView === View.ROLL_DETAIL && renderRollDetail()}
      {currentView === View.PROFILE && renderProfile()}
      {currentView === View.STATS && renderStats()}
      
      {/* New Views */}
      {currentView === View.CONTACT_SHEET && activeRollId && (
          <ContactSheet 
            roll={rolls.find(r => r.id === activeRollId)!} 
            onClose={() => setCurrentView(View.ROLL_DETAIL)} 
          />
      )}
      
      {currentView === View.DEVELOP_TIMER && (
          <DevelopmentTimer onClose={() => setCurrentView(View.DASHBOARD)} />
      )}

      {/* Overlay Scanner */}
      {currentView === View.SCANNER && (
        <Scanner 
            onScanComplete={handleScanComplete} 
            onClose={() => setCurrentView(View.DASHBOARD)} 
        />
      )}
      
      {/* Profile Editor Modal */}
      {isProfileEditorOpen && (
          <ProfileEditor 
            profile={userProfile} 
            onSave={handleUpdateProfile} 
            onClose={() => setIsProfileEditorOpen(false)} 
          />
      )}

      {/* Export Settings Modal */}
      {isExportSettingsOpen && (
          <ExportSettings onClose={() => setIsExportSettingsOpen(false)} />
      )}

      {/* Navigation (Hidden on Splash, Scanner, Contact Sheet, Timer) */}
      {currentView !== View.SPLASH && 
       currentView !== View.SCANNER && 
       currentView !== View.CONTACT_SHEET && 
       currentView !== View.DEVELOP_TIMER && (
        <Navigation currentView={currentView} onChangeView={setCurrentView} />
      )}
    </div>
  );
}