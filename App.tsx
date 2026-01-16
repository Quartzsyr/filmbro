import React, { useState, useEffect } from 'react';
import { View, Roll, RollStatus, FilmPhoto, UserProfile } from './types';
import { Navigation } from './components/Navigation';
import { Scanner } from './components/Scanner';
import { BatchExifEditor } from './components/BatchExifEditor';
import { ContactSheet } from './components/ContactSheet';
import { DevelopmentTimer } from './components/DevelopmentTimer';
import { ProfileEditor } from './components/ProfileEditor';
import { ExportSettings } from './components/ExportSettings';
import { LightMeter } from './components/LightMeter';
import { StatsView } from './components/StatsView';
import { IdentificationResult, analyzePhoto } from './services/geminiService';
import { resizeImage } from './utils/imageUtils';
import { getAllRollsFromDB, saveRollToDB, deleteRollFromDB } from './services/dbService';

const INITIAL_ROLLS: Roll[] = [
  {
    id: '1',
    brand: 'Kodak',
    name: 'Portra 400',
    iso: 400,
    camera: 'Canon AE-1',
    date: '2023-10-12',
    status: RollStatus.DEVELOPED,
    coverImage: 'https://images.unsplash.com/photo-1590483736622-39da8af75bba?auto=format&fit=crop&q=80&w=400',
    photos: [],
    framesTaken: 36,
    totalFrames: 36,
    defaultExif: {
      camera: 'Canon AE-1',
      lens: '50mm f/1.8',
      date: '2023-10-12',
      copyright: 'Film Archivist'
    }
  }
];

const INITIAL_PROFILE: UserProfile = {
    name: '胶片收藏家',
    role: '自 2021 年开始记录',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
    bio: '捕捉银盐间的瞬间。专注于街头摄影和建筑抽象。',
    favoriteCamera: 'Leica M6',
    favoriteFilm: 'Kodak Tri-X 400',
    website: 'darkroom.ai'
};

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
        <div className="fixed inset-0 z-[70] bg-black/95 backdrop-blur-xl flex flex-col md:flex-row animate-fade-in pt-[env(safe-area-inset-top)]">
            <div className="absolute top-0 left-0 right-0 p-4 pt-[calc(env(safe-area-inset-top)+1rem)] flex justify-between items-center z-20 pointer-events-none">
                <button onClick={onClose} className="text-white/80 hover:text-white bg-black/40 p-2 rounded-full backdrop-blur pointer-events-auto active:scale-90 transition-transform">
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

            <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden h-full">
                <div className="relative flex-1 w-full flex items-center justify-center p-4 md:p-12">
                    <img 
                        src={photo.url} 
                        className="max-w-full max-h-full object-contain shadow-2xl rounded-sm" 
                    />
                </div>
            </div>

            <div className={`fixed inset-x-0 bottom-0 md:static md:w-96 bg-[#111] border-t md:border-t-0 md:border-l border-white/10 transform transition-transform duration-300 ease-out z-30 flex flex-col pb-[env(safe-area-inset-bottom)] ${isPanelOpen ? 'translate-y-0' : 'translate-y-full md:translate-x-full md:translate-y-0'}`}>
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
                             <div className="space-y-2">
                                <label className="text-[10px] uppercase tracking-widest text-muted">色彩与氛围</label>
                                <p className="text-sm text-white/90 leading-relaxed font-light">{photo.analysis.mood}</p>
                             </div>
                             <div className="space-y-2">
                                <label className="text-[10px] uppercase tracking-widest text-muted">构图分析</label>
                                <p className="text-sm text-white/90 leading-relaxed font-light">{photo.analysis.composition}</p>
                             </div>
                             <div className="space-y-2">
                                <label className="text-[10px] uppercase tracking-widest text-muted">推荐标签</label>
                                <div className="flex flex-wrap gap-2">
                                    {photo.analysis.tags.map(tag => (
                                        <span key={tag} className="text-[10px] text-primary bg-primary/10 border border-primary/20 px-2 py-1 rounded-sm font-mono">#{tag}</span>
                                    ))}
                                </div>
                             </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default function App() {
  const [currentView, setCurrentView] = useState<View>(View.SPLASH);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const [rolls, setRolls] = useState<Roll[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>(INITIAL_PROFILE);

  const [activeRollId, setActiveRollId] = useState<string | null>(null);
  const [isExifModalOpen, setIsExifModalOpen] = useState(false);
  const [isProfileEditorOpen, setIsProfileEditorOpen] = useState(false);
  const [isExportSettingsOpen, setIsExportSettingsOpen] = useState(false);
  const [isAddRollModalOpen, setIsAddRollModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [newRollData, setNewRollData] = useState({ brand: '', name: '', iso: '400', camera: '' });
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);

  // 初始化从 IndexedDB 加载
  useEffect(() => {
      const initLoad = async () => {
          try {
              const savedRolls = await getAllRollsFromDB();
              setRolls(savedRolls.length > 0 ? savedRolls : INITIAL_ROLLS);
              
              const savedProfile = localStorage.getItem('film_archive_profile_v2');
              if (savedProfile) setUserProfile(JSON.parse(savedProfile));
          } catch (e) {
              console.error("Failed to load from DB", e);
          } finally {
              setIsLoading(false);
          }
      };
      initLoad();
  }, []);

  // 监听并同步个人资料到 localStorage
  useEffect(() => {
      localStorage.setItem('film_archive_profile_v2', JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    if (currentView === View.SPLASH) {
      const timer = setTimeout(() => { setCurrentView(View.DASHBOARD); }, 2500);
      return () => clearTimeout(timer);
    }
  }, [currentView]);

  const handleScanComplete = async (result: IdentificationResult, captureImage: string) => {
    const newRoll: Roll = {
      id: Date.now().toString(),
      brand: result.brand || '未知品牌',
      name: result.name || '识别胶卷',
      iso: result.iso || 400,
      camera: userProfile.favoriteCamera || '未知相机',
      date: new Date().toISOString().split('T')[0],
      status: RollStatus.ACTIVE,
      coverImage: captureImage,
      photos: [],
      framesTaken: 0,
      totalFrames: 36
    };
    const updatedRolls = [newRoll, ...rolls];
    setRolls(updatedRolls);
    await saveRollToDB(newRoll);
    setActiveRollId(newRoll.id);
    setCurrentView(View.ROLL_DETAIL);
  };

  const handleManualAddRoll = async () => {
      if(!newRollData.brand || !newRollData.name) { alert('请填写品牌和名称'); return; }
      const newRoll: Roll = {
        id: Date.now().toString(),
        brand: newRollData.brand,
        name: newRollData.name,
        iso: parseInt(newRollData.iso) || 400,
        camera: newRollData.camera || userProfile.favoriteCamera || '未知相机',
        date: new Date().toISOString().split('T')[0],
        status: RollStatus.ACTIVE,
        coverImage: 'https://images.unsplash.com/photo-1590483736622-39da8af75bba?auto=format&fit=crop&q=80&w=400',
        photos: [],
        framesTaken: 0,
        totalFrames: 36
      };
      setRolls([newRoll, ...rolls]);
      await saveRollToDB(newRoll);
      setIsAddRollModalOpen(false);
      setNewRollData({ brand: '', name: '', iso: '400', camera: '' });
  };

  const handleDeleteRoll = async () => {
      if (activeRollId) {
          await deleteRollFromDB(activeRollId);
          setRolls(rolls.filter(r => r.id !== activeRollId));
          setActiveRollId(null);
          setCurrentView(View.LIBRARY);
          setIsDeleteConfirmOpen(false);
      }
  };

  const handleAddPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || !activeRollId) return;
      // Fixed: Casting result of Array.from to File[] to resolve unknown type error
      const files = Array.from(e.target.files) as File[];
      setIsUploading(true);
      setUploadProgress(0);
      
      const newPhotos: FilmPhoto[] = [];
      for (let i = 0; i < files.length; i++) {
          try {
              const base64 = await resizeImage(files[i], 1600, 0.7); 
              newPhotos.push({
                  id: Math.random().toString(36).substr(2, 9),
                  url: base64,
              });
              setUploadProgress(Math.round(((i + 1) / files.length) * 100));
          } catch (err) {
              console.error("Photo process error", err);
          }
      }

      const rollToUpdate = rolls.find(r => r.id === activeRollId);
      if (rollToUpdate) {
          const updatedPhotos = [...rollToUpdate.photos, ...newPhotos];
          const updatedRoll = { 
              ...rollToUpdate, 
              photos: updatedPhotos, 
              framesTaken: updatedPhotos.length,
              coverImage: rollToUpdate.photos.length === 0 ? newPhotos[0].url : rollToUpdate.coverImage
          };
          setRolls(prev => prev.map(r => r.id === activeRollId ? updatedRoll : r));
          await saveRollToDB(updatedRoll);
      }
      setIsUploading(false);
  };

  const handleAnalyzePhoto = async (photoId: string, url: string) => {
      const result = await analyzePhoto(url);
      const rollToUpdate = rolls.find(r => r.id === activeRollId);
      if (rollToUpdate) {
          const updatedRoll = {
              ...rollToUpdate,
              photos: rollToUpdate.photos.map(p => p.id === photoId ? { ...p, analysis: result } : p)
          };
          setRolls(prev => prev.map(r => r.id === activeRollId ? updatedRoll : r));
          await saveRollToDB(updatedRoll);
      }
  };

  const handleSaveExif = async (data: any) => {
      const rollToUpdate = rolls.find(r => r.id === activeRollId);
      if (rollToUpdate) {
          const updatedRoll = { ...rollToUpdate, defaultExif: data };
          setRolls(prev => prev.map(r => r.id === activeRollId ? updatedRoll : r));
          await saveRollToDB(updatedRoll);
          setIsExifModalOpen(false);
      }
  };

  const activeRoll = rolls.find(r => r.id === activeRollId);

  if (currentView === View.SPLASH || isLoading) {
      return (
        <div className="fixed inset-0 bg-background-dark flex flex-col items-center justify-center z-[100] animate-fade-in">
            <div className="relative size-32 mb-8">
                <div className="absolute inset-0 border-4 border-primary rounded-full animate-spin-slow opacity-20"></div>
                <div className="absolute inset-4 border-2 border-primary rounded-full animate-pulse"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-5xl">shutter_speed</span>
                </div>
            </div>
            <h1 className="text-3xl font-display font-black tracking-tighter uppercase text-white mb-2">Film Archive AI</h1>
            <p className="text-[10px] font-mono tracking-[0.4em] text-muted uppercase">Digital Darkroom & Inventory</p>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-background-dark text-white font-body pb-[calc(1.5rem+env(safe-area-inset-bottom)+60px)] overflow-x-hidden selection:bg-primary">
      
      {/* Uploading Overlay */}
      {isUploading && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in">
              <div className="size-20 border-4 border-white/5 border-t-primary rounded-full animate-spin mb-6"></div>
              <h3 className="text-xl font-bold uppercase tracking-widest">正在处理照片</h3>
              <p className="text-sm text-muted mt-2">已完成 {uploadProgress}%</p>
              <div className="w-48 h-1 bg-white/5 rounded-full mt-6 overflow-hidden">
                  <div className="h-full bg-primary transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
              </div>
          </div>
      )}

      {/* DASHBOARD */}
      {currentView === View.DASHBOARD && (
        <div className="p-6 pt-[calc(env(safe-area-inset-top)+3rem)] space-y-10 animate-fade-in max-w-2xl mx-auto">
            <header className="flex justify-between items-end">
                <div>
                    <span className="text-[10px] font-mono text-primary font-bold tracking-widest uppercase">Overview</span>
                    <h2 className="text-4xl font-display font-black tracking-tight mt-1">控制台</h2>
                </div>
                <button onClick={() => setCurrentView(View.PROFILE)} className="size-12 rounded-full border-2 border-white/5 overflow-hidden active:scale-95 transition-transform">
                    <img src={userProfile.avatar} className="w-full h-full object-cover" />
                </button>
            </header>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface-dark border border-white/5 p-4 rounded-xl">
                    <span className="text-[10px] text-muted uppercase tracking-widest font-bold">已拍胶卷</span>
                    <div className="text-3xl font-display font-black mt-1">{rolls.length}</div>
                </div>
                <div className="bg-surface-dark border border-white/5 p-4 rounded-xl">
                    <span className="text-[10px] text-muted uppercase tracking-widest font-bold">快门次数</span>
                    <div className="text-3xl font-display font-black mt-1">
                        {rolls.reduce((acc, r) => acc + r.framesTaken, 0)}
                    </div>
                </div>
            </div>

            <section className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted">快速功能</h3>
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setCurrentView(View.DEVELOP_TIMER)} className="flex items-center gap-3 p-4 bg-primary/10 border border-primary/20 rounded-xl hover:bg-primary/20 transition-colors group">
                        <span className="material-symbols-outlined text-primary group-hover:rotate-12 transition-transform">timer</span>
                        <div className="text-left">
                            <div className="text-sm font-bold">暗房定时</div>
                            <div className="text-[10px] text-muted uppercase">AI 冲洗指导</div>
                        </div>
                    </button>
                    <button onClick={() => setCurrentView(View.LIGHT_METER)} className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors group">
                        <span className="material-symbols-outlined text-muted group-hover:text-primary transition-colors">exposure</span>
                        <div className="text-left">
                            <div className="text-sm font-bold">测光表</div>
                            <div className="text-[10px] text-muted uppercase">精密曝光控制</div>
                        </div>
                    </button>
                </div>
            </section>

            <section className="space-y-6 pb-12">
                <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted">最近动态</h3>
                    <button onClick={() => setCurrentView(View.LIBRARY)} className="text-[10px] uppercase font-bold text-primary hover:underline">查看全部</button>
                </div>
                <div className="space-y-4">
                    {rolls.slice(0, 3).map(roll => (
                        <div key={roll.id} onClick={() => { setActiveRollId(roll.id); setCurrentView(View.ROLL_DETAIL); }} className="flex items-center gap-4 group cursor-pointer bg-white/[0.02] p-2 rounded-lg hover:bg-white/[0.05] transition-colors border border-transparent hover:border-white/5">
                            <div className="size-16 rounded-lg overflow-hidden border border-white/10 shrink-0">
                                <img src={roll.coverImage} className="w-full h-full object-cover grayscale-[30%] group-hover:grayscale-0 transition-all" />
                            </div>
                            <div className="flex-1">
                                <div className="text-xs font-bold text-muted uppercase tracking-tighter">{roll.brand}</div>
                                <div className="text-lg font-display font-black leading-tight uppercase">{roll.name}</div>
                                <div className="text-[10px] font-mono text-muted uppercase mt-1">ISO {roll.iso} • {roll.status}</div>
                            </div>
                            <span className="material-symbols-outlined text-muted group-hover:text-primary transition-colors">chevron_right</span>
                        </div>
                    ))}
                    {rolls.length === 0 && (
                        <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-2xl">
                            <span className="material-symbols-outlined text-muted text-4xl mb-2">auto_fix_high</span>
                            <p className="text-xs text-muted">还没有胶卷，快去扫描一个吧</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
      )}

      {/* LIBRARY */}
      {currentView === View.LIBRARY && (
        <div className="p-6 pt-[calc(env(safe-area-inset-top)+3rem)] animate-fade-in max-w-4xl mx-auto pb-32">
             <header className="flex justify-between items-end mb-8">
                <div>
                    <span className="text-[10px] font-mono text-primary font-bold tracking-widest uppercase">Archive</span>
                    <h2 className="text-4xl font-display font-black tracking-tight mt-1">胶片库</h2>
                </div>
                <button onClick={() => setIsAddRollModalOpen(true)} className="size-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-primary transition-colors group active:scale-90">
                    <span className="material-symbols-outlined group-hover:rotate-90 transition-transform">add</span>
                </button>
            </header>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {rolls.map(roll => (
                    <div key={roll.id} onClick={() => { setActiveRollId(roll.id); setCurrentView(View.ROLL_DETAIL); }} className="relative aspect-[4/5] rounded-xl overflow-hidden border border-white/10 group cursor-pointer">
                        <img src={roll.coverImage} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-80 group-hover:opacity-100 transition-opacity"></div>
                        <div className="absolute bottom-4 left-4 right-4">
                            <div className="text-[8px] font-mono text-primary font-bold uppercase tracking-widest">{roll.brand}</div>
                            <div className="text-sm font-display font-black uppercase leading-tight mt-0.5">{roll.name}</div>
                            <div className="text-[8px] font-mono text-muted uppercase mt-1">{roll.framesTaken} / {roll.totalFrames} 张</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}

      {/* ROLL DETAIL */}
      {currentView === View.ROLL_DETAIL && activeRoll && (
          <div className="animate-fade-in pb-32">
              <div className="relative h-[45vh] w-full overflow-hidden">
                  <img src={activeRoll.coverImage} className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/20 to-transparent"></div>
                  
                  <div className="absolute top-[calc(env(safe-area-inset-top)+1rem)] left-6 z-10">
                      <button onClick={() => setCurrentView(View.LIBRARY)} className="size-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/10 active:scale-90 transition-transform">
                          <span className="material-symbols-outlined">arrow_back</span>
                      </button>
                  </div>

                  <div className="absolute bottom-8 left-6 right-6">
                      <span className="text-xs font-mono text-primary font-bold uppercase tracking-widest">{activeRoll.brand}</span>
                      <h2 className="text-5xl font-display font-black tracking-tighter uppercase mt-1 leading-none">{activeRoll.name}</h2>
                      <div className="flex flex-wrap gap-4 mt-4">
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-white/5 border border-white/10 text-[10px] font-mono">
                              <span className="material-symbols-outlined text-[14px]">photo_camera</span>
                              {activeRoll.camera}
                          </div>
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-white/5 border border-white/10 text-[10px] font-mono">
                              <span className="material-symbols-outlined text-[14px]">iso</span>
                              {activeRoll.iso}
                          </div>
                      </div>
                  </div>
              </div>

              <div className="p-6 space-y-8">
                  <div className="flex items-center justify-between">
                       <div className="flex gap-2">
                           <button onClick={() => setCurrentView(View.CONTACT_SHEET)} className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-white/10 transition-all active:scale-95">
                               <span className="material-symbols-outlined text-[18px]">grid_on</span>
                               数字印样
                           </button>
                           <button onClick={() => setIsExifModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-white/10 transition-all active:scale-95">
                               <span className="material-symbols-outlined text-[18px]">edit_note</span>
                               批量参数
                           </button>
                       </div>
                       <button onClick={() => setIsDeleteConfirmOpen(true)} className="size-10 rounded-lg border border-red-500/20 text-red-500/50 flex items-center justify-center hover:bg-red-500/10 transition-colors active:scale-95">
                           <span className="material-symbols-outlined">delete</span>
                       </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                      <label className="aspect-square rounded border border-white/10 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-white/5 transition-all active:scale-95">
                          <span className="material-symbols-outlined text-primary">add_a_photo</span>
                          <span className="text-[10px] font-bold uppercase text-muted">添加</span>
                          <input type="file" multiple accept="image/*" className="hidden" onChange={handleAddPhotos} />
                      </label>
                      {activeRoll.photos.map(photo => (
                          <div key={photo.id} onClick={() => setSelectedPhotoId(photo.id)} className="relative aspect-square rounded overflow-hidden group cursor-pointer border border-white/5">
                              <img src={photo.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                              {photo.analysis && (
                                   <div className="absolute top-1.5 right-1.5 size-4 rounded-full bg-primary flex items-center justify-center shadow-lg animate-fade-in">
                                       <span className="material-symbols-outlined text-[10px] text-white">auto_awesome</span>
                                   </div>
                              )}
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* STATS */}
      {currentView === View.STATS && <StatsView rolls={rolls} />}

      {/* PROFILE */}
      {currentView === View.PROFILE && (
          <div className="p-6 pt-[calc(env(safe-area-inset-top)+3rem)] animate-fade-in max-w-2xl mx-auto space-y-10 pb-32">
              <header className="flex justify-between items-start">
                  <h2 className="text-4xl font-display font-black tracking-tight uppercase">档案</h2>
                  <div className="flex gap-2">
                    <button onClick={() => setIsExportSettingsOpen(true)} className="size-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center active:scale-90">
                        <span className="material-symbols-outlined">tune</span>
                    </button>
                    <button onClick={() => setIsProfileEditorOpen(true)} className="size-10 rounded-full bg-primary flex items-center justify-center active:scale-90">
                        <span className="material-symbols-outlined">edit</span>
                    </button>
                  </div>
              </header>
              <div className="flex flex-col items-center text-center space-y-4">
                  <img src={userProfile.avatar} className="size-32 rounded-full object-cover border-4 border-white/10" />
                  <div>
                      <h3 className="text-2xl font-display font-black uppercase tracking-tight">{userProfile.name}</h3>
                      <p className="text-sm text-primary font-mono mt-1">{userProfile.role}</p>
                  </div>
                  <p className="text-sm text-muted leading-relaxed max-w-sm">{userProfile.bio}</p>
              </div>
              
              <div className="space-y-4 pt-8 border-t border-white/5">
                  <div className="flex justify-between text-xs">
                      <span className="text-muted uppercase tracking-widest">常用机型</span>
                      <span className="font-mono text-white">{userProfile.favoriteCamera}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                      <span className="text-muted uppercase tracking-widest">常用胶卷</span>
                      <span className="font-mono text-white">{userProfile.favoriteFilm}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                      <span className="text-muted uppercase tracking-widest">在线作品集</span>
                      <span className="font-mono text-primary">{userProfile.website}</span>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL OVERLAYS */}
      {currentView === View.DEVELOP_TIMER && <DevelopmentTimer onClose={() => setCurrentView(View.DASHBOARD)} />}
      {currentView === View.SCANNER && <Scanner onScanComplete={handleScanComplete} onClose={() => setCurrentView(View.DASHBOARD)} />}
      {currentView === View.LIGHT_METER && <LightMeter onClose={() => setCurrentView(View.DASHBOARD)} />}
      {currentView === View.CONTACT_SHEET && activeRoll && <ContactSheet roll={activeRoll} onClose={() => setCurrentView(View.ROLL_DETAIL)} />}
      
      {isAddRollModalOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
               <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsAddRollModalOpen(false)}></div>
               <div className="relative w-full max-w-sm bg-[#111] border border-white/10 rounded-xl p-6 space-y-5 animate-fade-in shadow-2xl">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">add_box</span>
                        手动添加胶卷
                    </h3>
                    <div className="space-y-4">
                        <input type="text" placeholder="品牌 (Kodak)" value={newRollData.brand} onChange={(e) => setNewRollData({...newRollData, brand: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm focus:border-primary focus:outline-none transition-colors" />
                        <input type="text" placeholder="型号 (Gold 200)" value={newRollData.name} onChange={(e) => setNewRollData({...newRollData, name: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm focus:border-primary focus:outline-none transition-colors" />
                        <div className="grid grid-cols-2 gap-4">
                            <input type="number" placeholder="ISO" value={newRollData.iso} onChange={(e) => setNewRollData({...newRollData, iso: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                            <input type="text" placeholder="相机" value={newRollData.camera} onChange={(e) => setNewRollData({...newRollData, camera: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                        </div>
                    </div>
                    <button onClick={handleManualAddRoll} className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg transition-colors active:scale-95">创建胶卷</button>
               </div>
          </div>
      )}

      {isDeleteConfirmOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsDeleteConfirmOpen(false)}></div>
              <div className="relative w-full max-w-sm bg-[#111] border border-white/10 rounded-xl p-6 text-center space-y-6 animate-fade-in shadow-2xl">
                  <div className="size-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
                      <span className="material-symbols-outlined text-3xl">warning</span>
                  </div>
                  <div>
                      <h3 className="text-xl font-bold">确定要删除吗？</h3>
                      <p className="text-sm text-muted mt-2">删除后数据将无法找回。</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => setIsDeleteConfirmOpen(false)} className="py-3 rounded-lg bg-white/5 border border-white/10 font-bold uppercase text-xs tracking-widest active:scale-95">取消</button>
                      <button onClick={handleDeleteRoll} className="py-3 rounded-lg bg-red-600 text-white font-bold uppercase text-xs tracking-widest active:scale-95">删除</button>
                  </div>
              </div>
          </div>
      )}

      {isExifModalOpen && activeRoll && <BatchExifEditor roll={activeRoll} onSave={handleSaveExif} onClose={() => setIsExifModalOpen(false)} />}
      {isProfileEditorOpen && <ProfileEditor profile={userProfile} onSave={setUserProfile} onClose={() => setIsProfileEditorOpen(false)} />}
      {isExportSettingsOpen && <ExportSettings onClose={() => setIsExportSettingsOpen(false)} />}
      {selectedPhotoId && activeRoll && <Lightbox photo={activeRoll.photos.find(p => p.id === selectedPhotoId)!} onClose={() => setSelectedPhotoId(null)} onAnalyze={handleAnalyzePhoto} />}

      {currentView !== View.SCANNER && currentView !== View.DEVELOP_TIMER && currentView !== View.LIGHT_METER && (
          <Navigation currentView={currentView} onChangeView={setCurrentView} />
      )}
    </div>
  );
}