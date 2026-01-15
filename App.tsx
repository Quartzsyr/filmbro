import React, { useState, useEffect } from 'react';
import { View, Roll, RollStatus, ExifData, FilmPhoto, PhotoAnalysis, UserProfile } from './types';
import { Navigation } from './components/Navigation';
import { Scanner } from './components/Scanner';
import { BatchExifEditor } from './components/BatchExifEditor';
import { ContactSheet } from './components/ContactSheet';
import { DevelopmentTimer } from './components/DevelopmentTimer';
import { ProfileEditor } from './components/ProfileEditor';
import { ExportSettings } from './components/ExportSettings';
import { LightMeter } from './components/LightMeter';
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

// --- Filters Definition ---
const FILTERS = [
    { id: 'normal', name: '原片', style: {} },
    { id: 'bw-contrast', name: '黑白高反差', style: { filter: 'grayscale(100%) contrast(120%) brightness(95%)' } },
    { id: 'vintage-warm', name: '复古暖调', style: { filter: 'sepia(30%) saturate(140%) contrast(90%) hue-rotate(-10deg)' } },
    { id: 'cinematic', name: '电影感', style: { filter: 'contrast(110%) saturate(80%) brightness(90%) hue-rotate(185deg) sepia(20%)' } }, // Makeshift teal/orange
    { id: 'faded', name: '过期胶卷', style: { filter: 'brightness(110%) contrast(80%) sepia(30%) hue-rotate(50deg) saturate(70%)' } },
];

// --- Lightbox Component ---
const Lightbox = ({ photo, onClose, onAnalyze }: { 
    photo: FilmPhoto, 
    onClose: () => void,
    onAnalyze: (photoId: string, url: string) => void
}) => {
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [activeFilterId, setActiveFilterId] = useState('normal');

    useEffect(() => {
        if (photo.analysis) setIsPanelOpen(true);
    }, [photo]);

    const activeFilter = FILTERS.find(f => f.id === activeFilterId) || FILTERS[0];

    return (
        <div className="fixed inset-0 z-[70] bg-black/95 backdrop-blur-xl flex flex-col md:flex-row animate-fade-in">
            {/* Toolbar */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
                <button onClick={onClose} className="text-white/80 hover:text-white bg-black/40 p-2 rounded-full backdrop-blur pointer-events-auto">
                    <span className="material-symbols-outlined">close</span>
                </button>
                <div className="flex gap-4 pointer-events-auto">
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

            {/* Main Image Area */}
            <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden h-full">
                <div className="relative flex-1 w-full flex items-center justify-center p-4 md:p-12">
                    <img 
                        src={photo.url} 
                        className="max-w-full max-h-full object-contain shadow-2xl rounded-sm transition-all duration-300 ease-out" 
                        style={{
                            boxShadow: '0 0 50px rgba(0,0,0,0.8)',
                            ...activeFilter.style
                        }}
                    />
                </div>

                {/* Filter Selector (Floating Bottom) */}
                <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 max-w-[90%] z-20 transition-transform duration-300 ${isPanelOpen ? 'translate-y-32 opacity-0 pointer-events-none' : 'translate-y-0'}`}>
                    <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-full p-1.5 flex gap-1 overflow-x-auto no-scrollbar shadow-2xl">
                        {FILTERS.map(filter => (
                            <button
                                key={filter.id}
                                onClick={() => setActiveFilterId(filter.id)}
                                className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase whitespace-nowrap transition-all ${
                                    activeFilterId === filter.id 
                                    ? 'bg-white text-black' 
                                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                                }`}
                            >
                                {filter.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Analysis Panel */}
            <div className={`
                fixed inset-x-0 bottom-0 md:static md:w-96 bg-[#111] border-t md:border-t-0 md:border-l border-white/10 
                transform transition-transform duration-300 ease-out z-30 flex flex-col
                ${isPanelOpen ? 'translate-y-0' : 'translate-y-full md:translate-x-full md:translate-y-0'}
            `}>
                <div className="p-6 h-full overflow-y-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                             <span className="material-symbols-outlined text-primary">analytics</span>
                             验片报告
                        </h3>
                         {/* Close Panel Button for Mobile */}
                         <button onClick={() => setIsPanelOpen(false)} className="md:hidden text-muted p-1">
                             <span className="material-symbols-outlined">expand_more</span>
                         </button>
                        {photo.analysis && (
                             <div className="px-2 py-1 bg-white/10 rounded text-sm font-mono font-bold text-primary-hover hidden md:block">
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
  const [isAddRollModalOpen, setIsAddRollModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  
  // New Roll Form State
  const [newRollData, setNewRollData] = useState({ brand: '', name: '', iso: '400' });
  const [addMethod, setAddMethod] = useState<'SELECT' | 'MANUAL'>('SELECT');

  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile>(INITIAL_PROFILE);
  const [libraryFilter, setLibraryFilter] = useState<'ALL' | RollStatus>('ALL');

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

  const handleManualAddRoll = () => {
      if(!newRollData.brand || !newRollData.name) {
          alert('请填写品牌和名称');
          return;
      }

      const newRoll: Roll = {
        id: Date.now().toString(),
        brand: newRollData.brand,
        name: newRollData.name,
        iso: parseInt(newRollData.iso) || 400,
        camera: 'Unknown',
        date: new Date().toISOString().split('T')[0],
        status: RollStatus.ACTIVE,
        coverImage: 'https://images.unsplash.com/photo-1596707323214-41d34c118679?q=80&w=2940&auto=format&fit=crop', // Generic placeholder
        photos: [],
        framesTaken: 0,
        totalFrames: 36
      };

      setRolls([newRoll, ...rolls]);
      setActiveRollId(newRoll.id);
      setIsAddRollModalOpen(false);
      setAddMethod('SELECT');
      setNewRollData({ brand: '', name: '', iso: '400' });
      setCurrentView(View.ROLL_DETAIL);
  };

  const confirmDeleteRoll = () => {
      if (activeRollId) {
          setRolls(prevRolls => prevRolls.filter(r => r.id !== activeRollId));
          setActiveRollId(null);
          setIsDeleteConfirmOpen(false);
          setCurrentView(View.LIBRARY);
      }
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 5) return "夜深了";
    if (hour < 11) return "早上好";
    if (hour < 13) return "中午好";
    if (hour < 18) return "下午好";
    return "晚上好";
  };

  // --- Views ---

  const renderAddRollModal = () => (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsAddRollModalOpen(false)}></div>
        
        <div className="relative w-full max-w-sm bg-[#111] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-fade-in">
             <div className="px-6 py-4 border-b border-white/10 bg-surface-highlight flex justify-between items-center">
                <h2 className="text-white font-bold text-lg">新建胶卷</h2>
                <button onClick={() => setIsAddRollModalOpen(false)} className="text-muted hover:text-white">
                    <span className="material-symbols-outlined">close</span>
                </button>
            </div>

            <div className="p-6">
                {addMethod === 'SELECT' ? (
                    <div className="grid grid-cols-2 gap-4">
                        <button 
                            onClick={() => {
                                setIsAddRollModalOpen(false);
                                setCurrentView(View.SCANNER);
                            }}
                            className="aspect-square bg-surface-highlight border border-white/10 rounded-lg flex flex-col items-center justify-center gap-3 hover:bg-white/5 hover:border-primary/50 transition-all group"
                        >
                            <span className="material-symbols-outlined text-4xl text-primary group-hover:scale-110 transition-transform">qr_code_scanner</span>
                            <span className="text-sm font-bold text-white">AI 扫描识别</span>
                        </button>
                         <button 
                            onClick={() => setAddMethod('MANUAL')}
                            className="aspect-square bg-surface-highlight border border-white/10 rounded-lg flex flex-col items-center justify-center gap-3 hover:bg-white/5 hover:border-white/50 transition-all group"
                        >
                            <span className="material-symbols-outlined text-4xl text-muted group-hover:text-white transition-colors">edit_square</span>
                            <span className="text-sm font-bold text-white">手动输入</span>
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest text-muted mb-1.5">胶卷品牌</label>
                            <input 
                                type="text" 
                                className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
                                placeholder="Kodak, Fujifilm..."
                                value={newRollData.brand}
                                onChange={(e) => setNewRollData({...newRollData, brand: e.target.value})}
                            />
                        </div>
                         <div>
                            <label className="block text-[10px] uppercase tracking-widest text-muted mb-1.5">胶卷名称</label>
                            <input 
                                type="text" 
                                className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
                                placeholder="Gold 200, HP5..."
                                value={newRollData.name}
                                onChange={(e) => setNewRollData({...newRollData, name: e.target.value})}
                            />
                        </div>
                         <div>
                            <label className="block text-[10px] uppercase tracking-widest text-muted mb-1.5">ISO 感光度</label>
                            <select 
                                className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-primary focus:outline-none appearance-none"
                                value={newRollData.iso}
                                onChange={(e) => setNewRollData({...newRollData, iso: e.target.value})}
                            >
                                {[50, 100, 160, 200, 400, 800, 1600, 3200].map(iso => (
                                    <option key={iso} value={iso}>{iso}</option>
                                ))}
                            </select>
                        </div>
                        <button 
                            onClick={handleManualAddRoll}
                            className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded mt-4"
                        >
                            创建胶卷
                        </button>
                        <button 
                            onClick={() => setAddMethod('SELECT')}
                            className="w-full py-2 text-xs text-muted hover:text-white"
                        >
                            返回
                        </button>
                    </div>
                )}
            </div>
        </div>
      </div>
  );

  const renderDeleteConfirmModal = () => (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsDeleteConfirmOpen(false)}></div>
        <div className="relative w-full max-w-xs bg-[#111] border border-white/10 rounded-xl shadow-2xl p-6 animate-fade-in text-center">
            <div className="size-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-2xl">warning</span>
            </div>
            <h3 className="text-white font-bold text-lg mb-2">删除胶卷?</h3>
            <p className="text-sm text-muted mb-6">
                确定要删除这个胶卷吗？<br/>此操作无法撤销，所有照片将丢失。
            </p>
            <div className="flex gap-3">
                <button 
                    onClick={() => setIsDeleteConfirmOpen(false)}
                    className="flex-1 py-2.5 rounded-lg bg-white/5 text-white text-xs font-bold hover:bg-white/10 transition-colors"
                >
                    取消
                </button>
                <button 
                    onClick={confirmDeleteRoll}
                    className="flex-1 py-2.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors"
                >
                    确认删除
                </button>
            </div>
        </div>
    </div>
  );

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
    <div className="flex-1 px-4 pt-6 flex flex-col gap-8 overflow-y-auto pb-40 no-scrollbar">
       <header className="flex justify-between items-center mb-2">
         <div>
            <h2 className="text-3xl font-bold leading-tight text-white mb-1 font-display">{getGreeting()}, <span className="text-muted">{userProfile.name.split(' ')[0]}</span></h2>
            <p className="text-sm text-muted">准备好冲洗了吗?</p>
         </div>
         <div onClick={() => setCurrentView(View.PROFILE)} className="size-10 rounded-full bg-gray-800 border border-white/10 overflow-hidden cursor-pointer hover:border-primary transition-colors">
            <img src={userProfile.avatar} className="w-full h-full object-cover grayscale" />
         </div>
       </header>

       {/* Active Roll Widget */}
       {rolls.length > 0 ? (
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
       ) : (
        <section className="flex flex-col gap-3">
            <div 
                onClick={() => setIsAddRollModalOpen(true)}
                className="relative bg-surface-highlight rounded-lg w-full p-8 flex flex-col items-center justify-center border border-white/10 border-dashed cursor-pointer hover:bg-white/5 hover:border-primary/50 transition-all gap-3 group"
            >
                <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <span className="material-symbols-outlined text-3xl text-primary">add_a_photo</span>
                </div>
                <div className="text-center">
                    <h3 className="text-white font-bold">开始新胶卷</h3>
                    <p className="text-xs text-muted mt-1">手动添加或 AI 识别</p>
                </div>
            </div>
        </section>
       )}

       {/* Tools Section */}
       <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
             <h3 className="text-xs font-bold uppercase tracking-widest text-muted">暗房工具</h3>
             <button onClick={() => setIsAddRollModalOpen(true)} className="flex items-center gap-1 text-[10px] uppercase font-bold text-primary hover:text-white transition-colors">
                 <span className="material-symbols-outlined text-sm">add</span>
                 新建胶卷
             </button>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
              <div 
                 onClick={() => setCurrentView(View.DEVELOP_TIMER)}
                 className="bg-surface-highlight border border-white/5 p-4 rounded-lg flex flex-col justify-between h-32 cursor-pointer hover:bg-white/5 transition-colors group"
              >
                 <div className="size-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 group-hover:bg-red-500 group-hover:text-white transition-colors mb-2">
                    <span className="material-symbols-outlined">timer</span>
                 </div>
                 <div>
                    <h4 className="font-bold text-white">冲洗助手</h4>
                    <p className="text-[10px] text-muted">Dev • Stop • Fix</p>
                 </div>
              </div>

              <div 
                 onClick={() => setCurrentView(View.LIGHT_METER)}
                 className="bg-surface-highlight border border-white/5 p-4 rounded-lg flex flex-col justify-between h-32 cursor-pointer hover:bg-white/5 transition-colors group"
              >
                 <div className="size-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors mb-2">
                    <span className="material-symbols-outlined">exposure</span>
                 </div>
                 <div>
                    <h4 className="font-bold text-white">测光表</h4>
                    <p className="text-[10px] text-muted">Zone System</p>
                 </div>
              </div>
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
                <span className="block text-2xl font-bold text-white">
                    {rolls.filter(r => r.status === RollStatus.ARCHIVED).length + rolls.filter(r => r.status === RollStatus.DEVELOPED).length}
                </span>
                <span className="text-xs text-muted">归档底片</span>
             </div>
          </div>
          <div 
             onClick={() => setCurrentView(View.LIBRARY)}
             className="bg-surface-highlight border border-white/5 p-4 rounded flex flex-col justify-between h-32 active:bg-white/5 transition-colors cursor-pointer"
          >
             <span className="text-xs font-bold text-primary/80 uppercase tracking-widest border border-primary/30 px-2 py-0.5 w-fit rounded-sm">待处理</span>
             <div>
                <span className="block text-2xl font-bold text-white">
                    {rolls.filter(r => r.status === RollStatus.IN_LAB).length}
                </span>
                <span className="text-xs text-muted">排队中</span>
             </div>
          </div>
       </div>
    </div>
  );

  const renderLibrary = () => {
    const visibleRolls = rolls.filter(roll => {
        if (libraryFilter === 'ALL') return true;
        return roll.status === libraryFilter;
    });

    return (
    <div className="flex-1 flex flex-col h-full">
        <header className="px-5 pt-8 pb-4 sticky top-0 bg-background-dark/95 backdrop-blur z-10 border-b border-white/5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h1 className="text-white text-3xl font-bold uppercase leading-none font-display">胶片<br/>档案</h1>
                <button 
                    onClick={() => {
                        setAddMethod('SELECT');
                        setIsAddRollModalOpen(true);
                    }}
                    className="size-10 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:bg-primary-hover transition-colors"
                >
                    <span className="material-symbols-outlined">add</span>
                </button>
            </div>
            
            <div className="flex gap-3 overflow-x-auto no-scrollbar">
                <button 
                    onClick={() => setLibraryFilter('ALL')}
                    className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold uppercase border transition-colors ${
                        libraryFilter === 'ALL' 
                        ? 'bg-primary text-white border-primary' 
                        : 'text-gray-400 border-white/20 hover:border-white/50'
                    }`}
                >
                    全部
                </button>
                <button 
                    onClick={() => setLibraryFilter(RollStatus.DEVELOPED)}
                    className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold uppercase border transition-colors ${
                        libraryFilter === RollStatus.DEVELOPED
                        ? 'bg-primary text-white border-primary' 
                        : 'text-gray-400 border-white/20 hover:border-white/50'
                    }`}
                >
                    已冲洗
                </button>
                <button 
                    onClick={() => setLibraryFilter(RollStatus.IN_LAB)}
                    className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold uppercase border transition-colors ${
                        libraryFilter === RollStatus.IN_LAB
                        ? 'bg-primary text-white border-primary' 
                        : 'text-gray-400 border-white/20 hover:border-white/50'
                    }`}
                >
                    冲扫中
                </button>
                 <button 
                    onClick={() => setLibraryFilter(RollStatus.ARCHIVED)}
                    className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold uppercase border transition-colors ${
                        libraryFilter === RollStatus.ARCHIVED
                        ? 'bg-primary text-white border-primary' 
                        : 'text-gray-400 border-white/20 hover:border-white/50'
                    }`}
                >
                    已归档
                </button>
            </div>
        </header>
        <div className="flex-1 overflow-y-auto p-5 pb-40 no-scrollbar">
            <div className="grid grid-cols-2 gap-4">
                {visibleRolls.map(roll => (
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
                {visibleRolls.length === 0 && (
                    <div className="col-span-2 py-12 text-center opacity-50">
                        <span className="material-symbols-outlined text-4xl mb-2">filter_none</span>
                        <p className="text-sm">没有找到相关胶卷</p>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
  }

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
            
            <div className="flex-1 overflow-y-auto p-6 pb-40">
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
                 <div className="grid grid-cols-3 gap-1 mb-12">
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
                 
                 {/* Delete Zone */}
                 <div className="border-t border-white/10 pt-8 flex justify-center pb-8">
                     <button 
                        onClick={() => setIsDeleteConfirmOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 rounded-full border border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white transition-all group"
                     >
                         <span className="material-symbols-outlined group-hover:scale-110 transition-transform">delete</span>
                         <span className="text-xs font-bold uppercase tracking-widest">删除胶卷</span>
                     </button>
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

  const renderProfile = () => {
    // Basic stats calculation
    const totalRolls = rolls.length;
    const totalPhotos = rolls.reduce((acc, roll) => acc + roll.photos.length, 0);

    return (
      <div className="flex-1 w-full h-full overflow-y-auto no-scrollbar bg-background-dark">
        <div className="flex flex-col items-center pt-12 px-6 pb-40">
            <div 
                onClick={() => setIsProfileEditorOpen(true)}
                className="relative group cursor-pointer mb-6"
            >
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary/50 shadow-lg shadow-primary/10">
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

            {/* Profile Stats Widget */}
            <div className="flex items-center gap-6 mb-8 w-full max-w-xs justify-center">
                <div className="text-center">
                    <div className="text-xl font-bold font-mono text-white">{totalRolls}</div>
                    <div className="text-[10px] text-muted uppercase tracking-wider">胶卷</div>
                </div>
                <div className="w-px h-8 bg-white/10"></div>
                <div className="text-center">
                    <div className="text-xl font-bold font-mono text-white">{totalPhotos}</div>
                    <div className="text-[10px] text-muted uppercase tracking-wider">照片</div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full max-w-sm mb-8">
                {userProfile.favoriteCamera && (
                    <div className="bg-surface-highlight border border-white/5 p-3 rounded flex flex-col items-center text-center">
                        <span className="text-[10px] uppercase tracking-widest text-muted mb-1">常用相机</span>
                        <span className="text-sm font-bold">{userProfile.favoriteCamera}</span>
                    </div>
                )}
                {userProfile.favoriteFilm && (
                    <div className="bg-surface-highlight border border-white/5 p-3 rounded flex flex-col items-center text-center">
                        <span className="text-[10px] uppercase tracking-widest text-muted mb-1">常用胶卷</span>
                        <span className="text-sm font-bold">{userProfile.favoriteFilm}</span>
                    </div>
                )}
            </div>
            
            <div className="w-full max-w-sm bg-surface-highlight border border-white/5 rounded-lg overflow-hidden divide-y divide-white/5">
                <button 
                    onClick={() => alert("云同步已是最新状态。")} 
                    className="w-full flex items-center justify-between p-4 hover:bg-white/5 active:bg-white/10"
                >
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-gray-400">cloud_sync</span>
                        <span className="text-sm font-medium">云同步</span>
                    </div>
                    <span className="text-xs text-green-500 font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">check</span>
                        已同步
                    </span>
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
            
            {/* Explicit Spacer for Safe Area */}
            <div className="h-12 w-full shrink-0"></div>
        </div>
      </div>
    );
  };

  const renderStats = () => {
    // Basic stats calculation
    const totalRolls = rolls.length;
    const totalPhotos = rolls.reduce((acc, roll) => acc + roll.photos.length, 0);
    const developedRolls = rolls.filter(r => r.status === RollStatus.DEVELOPED || r.status === RollStatus.ARCHIVED).length;
    
    // Most popular camera
    const cameraCounts: Record<string, number> = {};
    rolls.forEach(r => {
        if (r.camera && r.camera !== 'Unknown') {
            cameraCounts[r.camera] = (cameraCounts[r.camera] || 0) + 1;
        }
    });
    const popularCamera = Object.entries(cameraCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';

    // Most popular film
    const filmCounts: Record<string, number> = {};
    rolls.forEach(r => {
        const name = `${r.brand} ${r.name}`;
        filmCounts[name] = (filmCounts[name] || 0) + 1;
    });
    const popularFilm = Object.entries(filmCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';

    return (
        <div className="flex-1 flex flex-col bg-background-dark h-full overflow-y-auto no-scrollbar pb-24">
             <header className="px-6 pt-12 pb-6">
                <h1 className="text-white text-3xl font-bold uppercase leading-none font-display mb-2">数据<br/>统计</h1>
                <p className="text-xs text-muted uppercase tracking-widest">Your Analog Journey</p>
             </header>

             <div className="px-6 space-y-6">
                {/* Big Numbers */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-surface-highlight border border-white/5 p-5 rounded-lg">
                        <div className="text-3xl font-bold text-white font-mono">{totalRolls}</div>
                        <div className="text-[10px] text-muted uppercase tracking-wider mt-1">Total Rolls</div>
                    </div>
                     <div className="bg-surface-highlight border border-white/5 p-5 rounded-lg">
                        <div className="text-3xl font-bold text-white font-mono">{totalPhotos}</div>
                        <div className="text-[10px] text-muted uppercase tracking-wider mt-1">Total Photos</div>
                    </div>
                </div>
                
                <div className="bg-surface-highlight border border-white/5 p-5 rounded-lg flex items-center justify-between">
                     <div>
                        <div className="text-2xl font-bold text-primary font-mono">{developedRolls}</div>
                        <div className="text-[10px] text-muted uppercase tracking-wider mt-1">Developed & Archived</div>
                    </div>
                    <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined">inbox</span>
                    </div>
                </div>

                {/* Favorites */}
                <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted mb-3">最爱器材</h3>
                    <div className="space-y-3">
                         <div className="flex items-center justify-between p-4 bg-[#111] border border-white/5 rounded-lg">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-gray-500">camera_alt</span>
                                <div>
                                    <div className="text-sm font-bold text-white">{popularCamera}</div>
                                    <div className="text-[10px] text-muted">Most Used Camera</div>
                                </div>
                            </div>
                         </div>
                         <div className="flex items-center justify-between p-4 bg-[#111] border border-white/5 rounded-lg">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-gray-500">film</span>
                                <div>
                                    <div className="text-sm font-bold text-white">{popularFilm}</div>
                                    <div className="text-[10px] text-muted">Most Used Film Stock</div>
                                </div>
                            </div>
                         </div>
                    </div>
                </div>
                
                {/* Status Distribution Visualizer */}
                <div>
                     <h3 className="text-xs font-bold uppercase tracking-widest text-muted mb-3">状态分布</h3>
                     <div className="flex h-4 rounded-full overflow-hidden w-full bg-white/5 mb-3">
                        {Object.values(RollStatus).map((status, idx) => {
                            const count = rolls.filter(r => r.status === status).length;
                            if (count === 0) return null;
                            const percentage = (count / totalRolls) * 100;
                            const colors = ['bg-primary', 'bg-blue-600', 'bg-yellow-600', 'bg-green-600'];
                            
                            return (
                                <div key={status} style={{ width: `${percentage}%` }} className={`${colors[idx % colors.length]} h-full border-r border-black/20`} />
                            );
                        })}
                     </div>
                     <div className="grid grid-cols-2 gap-2">
                        {Object.values(RollStatus).map((status, idx) => {
                             const count = rolls.filter(r => r.status === status).length;
                             // if (count === 0) return null; // Show all for legend consistency? No, hide empty usually better or show 0
                             const colors = ['bg-primary', 'bg-blue-600', 'bg-yellow-600', 'bg-green-600'];
                             return (
                                 <div key={status} className="flex items-center gap-2">
                                     <div className={`size-2 rounded-full ${colors[idx % colors.length]}`}></div>
                                     <span className="text-[10px] text-muted uppercase flex-1">{status}</span>
                                     <span className="text-[10px] font-mono text-white">{count}</span>
                                 </div>
                             )
                        })}
                     </div>
                </div>
             </div>
        </div>
    );
  };

  return (
    <div className="relative w-full h-[100dvh] bg-background-dark text-white overflow-hidden flex flex-col font-body">
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

      {currentView === View.LIGHT_METER && (
          <LightMeter onClose={() => setCurrentView(View.DASHBOARD)} />
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

      {/* Add Roll Modal */}
      {isAddRollModalOpen && renderAddRollModal()}
      
      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && renderDeleteConfirmModal()}

      {/* Navigation (Hidden on Splash, Scanner, Contact Sheet, Timer) */}
      {currentView !== View.SPLASH && 
       currentView !== View.SCANNER && 
       currentView !== View.CONTACT_SHEET && 
       currentView !== View.DEVELOP_TIMER && 
       currentView !== View.LIGHT_METER && (
        <Navigation currentView={currentView} onChangeView={setCurrentView} />
      )}
    </div>
  );
}