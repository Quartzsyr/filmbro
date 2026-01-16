
import React, { useState, useEffect, useMemo } from 'react';
import { View, Roll, RollStatus, FilmPhoto, UserProfile, StockFilm, ExifData, UserSettings, GearItem } from './types';
import { Navigation } from './components/Navigation';
import { Scanner } from './components/Scanner';
import { BatchExifEditor } from './components/BatchExifEditor';
import { ContactSheet } from './components/ContactSheet';
import { DevelopmentTimer } from './components/DevelopmentTimer';
import { ProfileEditor } from './components/ProfileEditor';
import { LightMeter } from './components/LightMeter';
import { StatsView } from './components/StatsView';
import { FilmFridge } from './components/FilmFridge';
import { NegativeInverter } from './components/NegativeInverter';
import { ChemistryCalculator } from './components/ChemistryCalculator';
import { SceneScout } from './components/SceneScout';
import { ReciprocityLab } from './components/ReciprocityLab';
import { IdentificationResult, analyzePhoto, getDailyInsight } from './services/geminiService';
import { resizeImage } from './utils/imageUtils';
import { getAllRollsFromDB, saveRollToDB, getAllStockFromDB, saveStockToDB } from './services/dbService';

const DEFAULT_SETTINGS: UserSettings = {
    tempUnit: 'C',
    oledMode: true,
    autoAnalyze: false,
    defaultDevTemp: 20
};

const INITIAL_PROFILE: UserProfile = {
    name: '银盐记录者',
    role: '高级胶片玩家',
    avatar: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=200',
    bio: '在银盐与像素间寻找平衡。专注于街头瞬间的定格。',
    favoriteCamera: 'Leica M6',
    favoriteFilm: 'Kodak Portra 400',
    settings: DEFAULT_SETTINGS,
    gear: [
        { id: '1', type: 'camera', brand: 'Leica', model: 'M6' },
        { id: '2', type: 'lens', brand: 'Summicron', model: '35mm f/2' }
    ]
};

const FILM_BRANDS = [
  { name: 'Kodak', color: '#ffcc00' },
  { name: 'Fujifilm', color: '#009933' },
  { name: 'Ilford', color: '#ffffff' },
  { name: 'Agfa', color: '#ff0000' },
  { name: 'CineStill', color: '#00ccff' },
  { name: 'Lomography', color: '#cc33ff' }
];

const FILM_TYPES = [
    { id: 'color_neg', label: '彩色负片', icon: 'palette' },
    { id: 'bw', label: '黑白胶片', icon: 'filter_b_and_w' },
    { id: 'slide', label: '彩色反转', icon: 'wb_sunny' },
    { id: 'cine', label: '电影底片', icon: 'movie' }
];

const ManualRollEntry = ({ onSave, onClose, defaultCamera }: { onSave: (roll: Partial<Roll>) => void, onClose: () => void, defaultCamera: string }) => {
    const [brand, setBrand] = useState('Kodak');
    const [name, setName] = useState('');
    const [iso, setIso] = useState(400);
    const [filmType, setFilmType] = useState('color_neg');
    const [camera, setCamera] = useState(defaultCamera);
    const [totalFrames, setTotalFrames] = useState(36);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) {
            alert("请输入胶卷型号");
            return;
        }
        onSave({
            brand,
            name,
            iso,
            filmType,
            camera,
            totalFrames,
            date: new Date().toISOString().split('T')[0],
            status: RollStatus.ACTIVE,
            photos: [],
            framesTaken: 0,
            coverImage: 'https://images.unsplash.com/photo-1543157145-f78c636d023d?auto=format&fit=crop&q=80&w=800'
        });
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-6 animate-fade-in">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={onClose}></div>
            <form onSubmit={handleSubmit} className="relative w-full max-w-lg bg-surface-dark border-t sm:border border-white/10 rounded-t-[3rem] sm:rounded-[3rem] p-8 sm:p-10 space-y-8 shadow-2xl overflow-y-auto max-h-[95vh] no-scrollbar">
                <div className="flex justify-between items-center">
                    <div className="space-y-1">
                        <span className="text-[10px] text-primary font-black uppercase tracking-[0.4em]">Manual Archive</span>
                        <h3 className="text-2xl font-display font-black uppercase italic tracking-tighter">新胶卷录入</h3>
                    </div>
                    <button type="button" onClick={onClose} className="size-10 rounded-full bg-white/5 flex items-center justify-center active:scale-90 transition-all"><span className="material-symbols-outlined">close</span></button>
                </div>

                <div className="space-y-6">
                    {/* 品牌选择 */}
                    <div>
                        <label className="text-[10px] text-muted font-black uppercase tracking-widest mb-3 block">1. 品牌选择</label>
                        <div className="grid grid-cols-3 gap-2">
                            {FILM_BRANDS.map(b => (
                                <button key={b.name} type="button" onClick={() => setBrand(b.name)} className={`py-3 rounded-2xl border text-[10px] font-black uppercase transition-all ${brand === b.name ? 'bg-white text-black border-white scale-95 shadow-lg' : 'bg-white/5 border-white/5 text-muted hover:border-white/20'}`}>
                                    {b.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 种类选择 */}
                    <div>
                        <label className="text-[10px] text-muted font-black uppercase tracking-widest mb-3 block">2. 胶片种类</label>
                        <div className="grid grid-cols-2 gap-2">
                            {FILM_TYPES.map(t => (
                                <button key={t.id} type="button" onClick={() => setFilmType(t.id)} className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${filmType === t.id ? 'bg-primary/20 border-primary text-primary shadow-lg shadow-primary/10 scale-95' : 'bg-white/5 border-white/5 text-muted hover:border-white/10'}`}>
                                    <span className="material-symbols-outlined text-[20px]">{t.icon}</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest">{t.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 详细参数 */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] text-muted font-black uppercase tracking-widest ml-1">型号</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="如: Portra 400" className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:border-primary outline-none transition-all" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] text-muted font-black uppercase tracking-widest ml-1">ISO</label>
                            <input type="number" value={iso} onChange={e => setIso(parseInt(e.target.value))} className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm font-mono focus:border-primary outline-none transition-all" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] text-muted font-black uppercase tracking-widest ml-1">拍摄器材</label>
                            <input type="text" value={camera} onChange={e => setCamera(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:border-primary outline-none transition-all" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] text-muted font-black uppercase tracking-widest ml-1">总曝光张数</label>
                            <select value={totalFrames} onChange={e => setTotalFrames(parseInt(e.target.value))} className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:border-primary outline-none appearance-none transition-all">
                                <option value={36}>36 曝光 (135)</option>
                                <option value={24}>24 曝光 (135)</option>
                                <option value={12}>12 曝光 (120)</option>
                                <option value={10}>10 曝光 (120)</option>
                                <option value={8}>8 曝光 (120)</option>
                            </select>
                        </div>
                    </div>
                </div>

                <button type="submit" className="w-full py-5 bg-primary text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all">开启新卷</button>
            </form>
        </div>
    );
};

const Lightbox = ({ photo, onClose, onAnalyze }: { 
    photo: FilmPhoto, 
    onClose: () => void,
    onAnalyze: (photoId: string, url: string) => Promise<void>
}) => {
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    useEffect(() => { if (photo.analysis) setIsPanelOpen(true); }, [photo]);

    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        try {
            await onAnalyze(photo.id, photo.url);
        } catch (e: any) {
            if (e.message === 'API_KEY_MISSING') {
                alert("⚠️ 请在“我的”页面下方输入您的 Gemini API Key 并保存。");
            } else {
                alert(`❌ AI 分析失败: ${e.message}`);
            }
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[120] bg-black/98 backdrop-blur-3xl flex flex-col md:flex-row animate-fade-in pt-[env(safe-area-inset-top)]">
            <div className="absolute top-0 left-0 right-0 p-6 pt-[calc(env(safe-area-inset-top)+2rem)] flex justify-between items-center z-20 pointer-events-none">
                <button onClick={onClose} className="text-white bg-white/10 p-3 rounded-full backdrop-blur pointer-events-auto active:scale-90 transition-transform shadow-xl">
                    <span className="material-symbols-outlined text-3xl">close</span>
                </button>
                <div className="flex gap-4 pointer-events-auto">
                     <button 
                        onClick={handleAnalyze}
                        disabled={isAnalyzing}
                        className={`flex items-center gap-2 px-6 py-3 rounded-full border transition-all active:scale-95 ${photo.analysis ? 'bg-primary/20 border-primary text-primary shadow-lg shadow-primary/20' : 'bg-white/10 border-white/20 text-white'}`}
                     >
                        <span className={`material-symbols-outlined text-[20px] ${isAnalyzing ? 'animate-spin' : ''}`}>{isAnalyzing ? 'sync' : (photo.analysis ? 'check_circle' : 'auto_awesome')}</span>
                        <span className="text-[11px] font-black uppercase tracking-widest">{isAnalyzing ? '分析中' : (photo.analysis ? '已完成' : 'AI 验片')}</span>
                     </button>
                </div>
            </div>

            <div className="flex-1 flex items-center justify-center p-8">
                <img src={photo.url} className="max-w-full max-h-full object-contain shadow-[0_0_80px_rgba(0,0,0,0.8)] rounded-sm border border-white/5" />
            </div>

            <div className={`fixed inset-x-0 bottom-0 md:static md:w-96 bg-surface-dark border-t md:border-t-0 md:border-l border-white/5 transform transition-transform duration-500 ease-out z-30 flex flex-col pb-[env(safe-area-inset-bottom)] ${isPanelOpen ? 'translate-y-0' : 'translate-y-full md:translate-x-full md:translate-y-0'}`}>
                <div className="p-8 h-full overflow-y-auto space-y-8 no-scrollbar">
                    <h3 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-tighter italic">
                        <span className="material-symbols-outlined text-primary">analytics</span>
                        验片报告
                    </h3>
                    {photo.analysis ? (
                        <div className="space-y-8 animate-fade-in">
                             <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-[0.4em] text-muted">评分</label><div className="text-5xl font-black text-primary italic tabular-nums">{photo.analysis.rating}<span className="text-xl text-muted font-light not-italic">/10</span></div></div>
                             <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-[0.4em] text-muted">影调意境</label><p className="text-sm text-white/80 leading-relaxed font-body italic">“{photo.analysis.mood}”</p></div>
                             <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-[0.4em] text-muted">构图建议</label><p className="text-sm text-white/80 leading-relaxed font-body">{photo.analysis.composition}</p></div>
                             <div className="flex flex-wrap gap-2 pt-4">{photo.analysis.tags.map(tag => (<span key={tag} className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-lg">#{tag}</span>))}</div>
                        </div>
                    ) : (
                        <div className="py-32 text-center text-[10px] text-muted uppercase tracking-[0.5em] font-black animate-pulse">
                            等待开启 AI 深度分析
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
  const [isTestLoading, setIsTestLoading] = useState(false);
  
  const [rolls, setRolls] = useState<Roll[]>([]);
  const [stock, setStock] = useState<StockFilm[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>(INITIAL_PROFILE);
  const [dailyInsight, setDailyInsight] = useState('光影是时间的琥珀。');
  const [apiKeyInput, setApiKeyInput] = useState(localStorage.getItem('LOCAL_GEMINI_KEY') || "");

  const [activeRollId, setActiveRollId] = useState<string | null>(null);
  const activeRoll = useMemo(() => rolls.find(r => r.id === activeRollId), [rolls, activeRollId]);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [isProfileEditorOpen, setIsProfileEditorOpen] = useState(false);
  const [isManualAddOpen, setIsManualAddOpen] = useState(false);
  
  useEffect(() => {
      const initLoad = async () => {
          try {
              const [savedRolls, savedStock] = await Promise.all([getAllRollsFromDB(), getAllStockFromDB()]);
              setRolls(savedRolls);
              setStock(savedStock);
              const savedProfile = localStorage.getItem('film_archive_profile_v3');
              if (savedProfile) setUserProfile(JSON.parse(savedProfile));
              
              if (apiKeyInput) {
                const insight = await getDailyInsight();
                setDailyInsight(insight);
              }
          } catch (e) { console.error(e); } finally { setIsLoading(false); }
      };
      initLoad();
  }, []);

  useEffect(() => { localStorage.setItem('film_archive_profile_v3', JSON.stringify(userProfile)); }, [userProfile]);

  useEffect(() => {
    if (currentView === View.SPLASH) {
      const timer = setTimeout(() => { setCurrentView(View.DASHBOARD); }, 2000);
      return () => clearTimeout(timer);
    }
  }, [currentView]);

  const handleUpdateSettings = (newSettings: Partial<UserSettings>) => {
      setUserProfile(prev => ({
          ...prev,
          settings: { ...prev.settings!, ...newSettings }
      }));
  };

  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim()) {
        alert("请输入有效的 API Key");
        return;
    }
    setIsTestLoading(true);
    try {
        localStorage.setItem('LOCAL_GEMINI_KEY', apiKeyInput);
        (window as any).process.env.API_KEY = apiKeyInput;
        const insight = await getDailyInsight();
        setDailyInsight(insight);
        alert("✅ API 连接测试成功！Key 已保存。");
    } catch (e: any) {
        alert(`❌ 连接测试失败: ${e.message}`);
    } finally {
        setIsTestLoading(false);
    }
  };

  const handleManualAddSave = async (data: Partial<Roll>) => {
      const newRoll: Roll = {
          ...data,
          id: Math.random().toString(36).substr(2, 9),
      } as Roll;

      setRolls(prev => [newRoll, ...prev]);
      await saveRollToDB(newRoll);
      setIsManualAddOpen(false);
      setActiveRollId(newRoll.id);
      setCurrentView(View.ROLL_DETAIL);
  };

  const handleScanComplete = async (result: IdentificationResult, image: string) => {
    const newRoll: Roll = {
      id: Math.random().toString(36).substr(2, 9),
      brand: result.brand,
      name: result.name,
      iso: result.iso,
      filmType: result.type || 'color_neg',
      camera: userProfile.favoriteCamera || 'Leica M6',
      date: new Date().toISOString().split('T')[0],
      status: RollStatus.ACTIVE,
      coverImage: image,
      photos: [],
      framesTaken: 0,
      totalFrames: 36
    };

    setRolls(prev => [newRoll, ...prev]);
    await saveRollToDB(newRoll);
    setActiveRollId(newRoll.id);
    setCurrentView(View.ROLL_DETAIL);
  };

  const handleAddPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !activeRoll) return;
    const files = Array.from(e.target.files) as File[];
    
    const newPhotos: FilmPhoto[] = [];
    for (let i = 0; i < files.length; i++) {
      try {
        const resized = await resizeImage(files[i]);
        newPhotos.push({
          id: Math.random().toString(36).substr(2, 9),
          url: resized
        });
      } catch (err) { console.error("Failed to add photo:", err); }
    }

    const updatedRoll: Roll = {
      ...activeRoll,
      photos: [...activeRoll.photos, ...newPhotos],
      framesTaken: activeRoll.photos.length + newPhotos.length
    };

    setRolls(prev => prev.map(r => r.id === activeRoll.id ? updatedRoll : r));
    await saveRollToDB(updatedRoll);
  };

  const handleNavigationChange = (view: View) => {
      // 如果点击的是扫描按钮（主 FAB），现在改为直接打开手动添加面板
      if (view === View.SCANNER) {
          setIsManualAddOpen(true);
      } else {
          setCurrentView(view);
      }
  };

  if (currentView === View.SPLASH || isLoading) {
      return (
        <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-[250]">
            <div className="relative size-32 mb-8 flex items-center justify-center">
                <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                <div className="absolute inset-0 border-t-4 border-primary rounded-full animate-spin"></div>
                <span className="material-symbols-outlined text-primary text-5xl">shutter_speed</span>
            </div>
            <h1 className="text-3xl font-display font-black tracking-tighter uppercase text-white">Film Archive AI</h1>
        </div>
      );
  }

  return (
    <div className={`min-h-screen ${userProfile.settings?.oledMode ? 'bg-black' : 'bg-background-dark'} text-white font-body pb-[calc(2rem+env(safe-area-inset-bottom)+70px)] transition-all duration-500`}>
      
      {currentView === View.DASHBOARD && (
        <div className="p-8 pt-[calc(env(safe-area-inset-top)+3.5rem)] space-y-12 animate-fade-in max-w-2xl mx-auto">
            <header className="flex justify-between items-start">
                <div className="space-y-1">
                    <span className="text-[11px] text-primary font-black uppercase tracking-[0.5em]">数字暗房系统</span>
                    <h2 className="text-4xl font-display font-black tracking-tighter leading-none italic">{userProfile.name}</h2>
                </div>
                <button onClick={() => setCurrentView(View.PROFILE)} className="size-14 rounded-2xl border border-white/5 p-1 bg-surface-dark overflow-hidden active:scale-95 transition-all shadow-xl">
                    <img src={userProfile.avatar} className="size-full object-cover rounded-xl" />
                </button>
            </header>

            <section className="bg-surface-dark border border-white/5 p-8 rounded-[2.5rem] relative overflow-hidden group shadow-2xl">
                <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-4">每日箴言</h3>
                <p className="text-xl font-display font-black leading-tight italic text-white/95 leading-relaxed">
                    “{dailyInsight}”
                </p>
            </section>

            <div className="grid grid-cols-2 gap-6">
                <div onClick={() => setCurrentView(View.LIBRARY)} className="bg-surface-dark border border-white/10 p-8 rounded-[2rem] text-center active:scale-95 transition-all cursor-pointer shadow-xl">
                    <span className="material-symbols-outlined text-primary text-4xl mb-3">grid_view</span>
                    <div className="text-[10px] text-muted font-black uppercase tracking-widest">已拍胶卷</div>
                    <div className="text-3xl font-display font-black mt-1 tabular-nums">{rolls.length}</div>
                </div>
                <div onClick={() => setCurrentView(View.FRIDGE)} className="bg-surface-dark border border-white/10 p-8 rounded-[2rem] text-center active:scale-95 transition-all cursor-pointer shadow-xl">
                    <span className="material-symbols-outlined text-primary text-4xl mb-3">kitchen</span>
                    <div className="text-[10px] text-muted font-black uppercase tracking-widest">片库库存</div>
                    <div className="text-3xl font-display font-black mt-1 tabular-nums">{stock.reduce((a, b) => a + b.count, 0)}</div>
                </div>
            </div>

            <section className="space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-muted px-2">快捷功能工具箱</h3>
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setCurrentView(View.SCENE_SCOUT)} className="flex items-center gap-4 p-6 bg-primary/10 border border-primary/20 rounded-[1.5rem] active:scale-95 transition-all">
                        <span className="material-symbols-outlined text-primary">center_focus_strong</span>
                        <span className="font-black uppercase text-xs tracking-widest">场景探员</span>
                    </button>
                    <button onClick={() => setCurrentView(View.NEGATIVE_INVERTER)} className="flex items-center gap-4 p-6 bg-white/5 border border-white/10 rounded-[1.5rem] active:scale-95 transition-all">
                        <span className="material-symbols-outlined text-muted">filter_b_and_w</span>
                        <span className="font-black uppercase text-xs tracking-widest">负片预览</span>
                    </button>
                    <button onClick={() => setCurrentView(View.RECIPROCITY_LAB)} className="flex items-center gap-4 p-6 bg-white/5 border border-white/10 rounded-[1.5rem] active:scale-95 transition-all">
                        <span className="material-symbols-outlined text-muted">hourglass_empty</span>
                        <span className="font-black uppercase text-xs tracking-widest">倒易率计算</span>
                    </button>
                    <button onClick={() => setCurrentView(View.DEVELOP_TIMER)} className="flex items-center gap-4 p-6 bg-white/5 border border-white/10 rounded-[1.5rem] active:scale-95 transition-all">
                        <span className="material-symbols-outlined text-muted">timer</span>
                        <span className="font-black uppercase text-xs tracking-widest">暗房计时</span>
                    </button>
                    <button onClick={() => setCurrentView(View.LIGHT_METER)} className="flex items-center gap-4 p-6 bg-white/5 border border-white/10 rounded-[1.5rem] active:scale-95 transition-all">
                        <span className="material-symbols-outlined text-muted">exposure</span>
                        <span className="font-black uppercase text-xs tracking-widest">数字测光</span>
                    </button>
                    <button onClick={() => setCurrentView(View.CHEM_CALC)} className="flex items-center gap-4 p-6 bg-white/5 border border-white/10 rounded-[1.5rem] active:scale-95 transition-all">
                        <span className="material-symbols-outlined text-muted">science</span>
                        <span className="font-black uppercase text-xs tracking-widest">药液配比</span>
                    </button>
                    <button onClick={() => setCurrentView(View.SCANNER)} className="flex items-center gap-4 p-6 bg-white/5 border border-white/10 rounded-[1.5rem] active:scale-95 transition-all">
                        <span className="material-symbols-outlined text-muted">document_scanner</span>
                        <span className="font-black uppercase text-xs tracking-widest">AI 识别</span>
                    </button>
                </div>
            </section>
        </div>
      )}

      {currentView === View.PROFILE && (
          <div className="p-8 pt-[calc(env(safe-area-inset-top)+3.5rem)] animate-fade-in max-w-2xl mx-auto space-y-12 pb-32">
              <header className="flex justify-between items-center">
                  <h2 className="text-4xl font-display font-black uppercase italic tracking-tighter">我的档案</h2>
                  <button onClick={() => setIsProfileEditorOpen(true)} className="size-14 rounded-2xl bg-primary flex items-center justify-center shadow-2xl active:scale-90 transition-transform">
                      <span className="material-symbols-outlined">edit</span>
                  </button>
              </header>

              <section className="bg-surface-dark border border-white/5 p-10 rounded-[3rem] shadow-2xl space-y-8">
                  <div className="flex flex-col items-center text-center space-y-6">
                      <div className="relative">
                          <img src={userProfile.avatar} className="size-32 rounded-[2.5rem] object-cover border-4 border-primary/20 shadow-2xl" />
                      </div>
                      <div>
                          <h3 className="text-2xl font-display font-black uppercase tracking-tighter">{userProfile.name}</h3>
                          <p className="text-[10px] text-primary uppercase tracking-[0.5em] mt-2 font-black italic">{userProfile.role}</p>
                          <p className="text-sm text-muted mt-4 font-body leading-relaxed px-4">{userProfile.bio}</p>
                      </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-8 border-t border-white/5">
                      <div className="text-center">
                          <div className="text-xl font-black font-mono tabular-nums">{rolls.length}</div>
                          <div className="text-[8px] text-muted font-black uppercase tracking-widest mt-1">归档卷数</div>
                      </div>
                      <div className="text-center">
                          <div className="text-xl font-black font-mono tabular-nums">{rolls.reduce((a,b)=>a+b.photos.length, 0)}</div>
                          <div className="text-[8px] text-muted font-black uppercase tracking-widest mt-1">定格帧数</div>
                      </div>
                      <div className="text-center">
                          <div className="text-xl font-black font-mono tabular-nums">{userProfile.gear?.length || 0}</div>
                          <div className="text-[8px] text-muted font-black uppercase tracking-widest mt-1">收藏设备</div>
                      </div>
                  </div>
              </section>

              <section className="space-y-6">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted px-4">本地 AI 密钥设置 (LOCAL KEY)</h3>
                  <div className="bg-surface-dark border border-white/5 rounded-[2.5rem] p-8 space-y-4 shadow-xl">
                      <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl mb-4">
                        <p className="text-[10px] text-primary leading-relaxed font-bold">
                            由于部署环境限制，请手动在下方粘贴您的 Gemini API Key。密钥将仅存储在您的本地浏览器中。
                        </p>
                      </div>
                      <div>
                        <label className="text-[10px] text-muted font-black uppercase tracking-widest mb-2 block ml-1">Gemini API Key</label>
                        <div className="flex flex-col gap-3">
                          <input 
                            type="password" 
                            value={apiKeyInput} 
                            onChange={(e) => setApiKeyInput(e.target.value)} 
                            placeholder="在此输入您的 API 密钥..." 
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-sm font-mono focus:border-primary focus:outline-none transition-all"
                          />
                          <button 
                            onClick={handleSaveApiKey}
                            disabled={isTestLoading}
                            className="w-full py-4 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                          >
                            {isTestLoading ? <span className="material-symbols-outlined animate-spin text-sm">sync</span> : <span className="material-symbols-outlined text-sm">verified_user</span>}
                            {isTestLoading ? '测试连接中...' : '保存并测试连接'}
                          </button>
                        </div>
                      </div>
                  </div>
              </section>
          </div>
      )}

      {currentView === View.LIBRARY && (
          <div className="relative p-8 pt-[calc(env(safe-area-inset-top)+3.5rem)] animate-fade-in max-w-4xl mx-auto min-h-[100dvh]">
             <header className="flex justify-between items-end mb-12">
                <div>
                    <span className="text-[11px] text-primary font-black uppercase tracking-[0.5em]">Digital Archive</span>
                    <h2 className="text-5xl font-display font-black tracking-tighter mt-2 italic uppercase leading-none">归档图库</h2>
                </div>
                <div className="text-right">
                    <div className="text-[10px] font-mono text-muted uppercase tracking-widest font-black italic">Archivist v4.0</div>
                </div>
             </header>

             <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 pb-32">
                {rolls.map((roll, index) => (
                    <div 
                        key={roll.id} 
                        onClick={() => { setActiveRollId(roll.id); setCurrentView(View.ROLL_DETAIL); }} 
                        className="relative aspect-[3/4] rounded-[2.5rem] overflow-hidden border border-white/5 group cursor-pointer shadow-2xl transition-all hover:-translate-y-3 duration-700 animate-fade-in"
                        style={{ animationDelay: `${index * 50}ms` }}
                    >
                        <div className="absolute top-4 left-4 z-20 px-3 py-1 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full">
                            <span className="text-[8px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                                <div className="size-1.5 bg-primary rounded-full animate-pulse"></div>
                                {roll.status}
                            </span>
                        </div>

                        <div className="absolute top-4 right-4 z-20 px-3 py-1 bg-white/10 backdrop-blur-xl border border-white/5 rounded-full">
                            <span className="text-[9px] font-mono text-white/80 font-black tracking-tighter">
                                {roll.framesTaken}/{roll.totalFrames}
                            </span>
                        </div>

                        <img src={roll.coverImage} className="absolute inset-0 size-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent opacity-90"></div>
                        
                        <div className="absolute bottom-6 left-6 right-6 space-y-3">
                            <div>
                                <div className="text-[9px] font-mono text-primary font-black uppercase tracking-[0.3em]">{roll.brand}</div>
                                <div className="text-xl font-display font-black uppercase mt-1 leading-none tracking-tighter italic">{roll.name}</div>
                                <div className="text-[8px] text-white/40 uppercase mt-1 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[10px]">calendar_today</span>
                                    {roll.date}
                                </div>
                            </div>
                            <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-primary transition-all duration-1000 shadow-[0_0_10px_rgba(166,23,39,1)]" 
                                    style={{ width: `${(roll.framesTaken / roll.totalFrames) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                ))}

                {rolls.length === 0 && (
                    <div className="col-span-full py-40 flex flex-col items-center justify-center space-y-6 opacity-30">
                        <span className="material-symbols-outlined text-8xl">camera_roll</span>
                        <p className="text-xs font-black uppercase tracking-[0.5em]">暂无归档胶卷</p>
                    </div>
                )}
             </div>

             <button 
                onClick={() => setIsManualAddOpen(true)}
                className="fixed bottom-32 right-8 z-[60] size-16 rounded-full bg-primary text-white shadow-[0_10px_40px_rgba(166,23,39,0.5)] flex items-center justify-center border-4 border-black/40 backdrop-blur-md active:scale-90 transition-transform group"
             >
                <span className="material-symbols-outlined text-4xl group-hover:rotate-90 transition-transform duration-500">add</span>
                <div className="absolute -inset-2 border-2 border-primary/20 rounded-full animate-ping opacity-20 pointer-events-none"></div>
             </button>
          </div>
      )}

      {currentView === View.ROLL_DETAIL && activeRoll && (
          <div className="animate-fade-in pb-32">
              <div className="relative h-[50vh] w-full overflow-hidden">
                  <img src={activeRoll.coverImage} className="absolute inset-0 size-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/20 to-transparent"></div>
                  <button onClick={() => setCurrentView(View.LIBRARY)} className="absolute top-[calc(env(safe-area-inset-top)+2rem)] left-8 z-30 size-12 rounded-full bg-black/40 backdrop-blur-2xl flex items-center justify-center border border-white/10 active:scale-90 shadow-xl"><span className="material-symbols-outlined text-2xl">arrow_back</span></button>
                  <div className="absolute bottom-12 left-8 right-8">
                    <span className="text-[12px] text-primary font-black uppercase tracking-[0.5em]">{activeRoll.brand}</span>
                    <h2 className="text-5xl font-display font-black uppercase mt-2 leading-none tracking-tighter italic">{activeRoll.name}</h2>
                  </div>
              </div>
              <div className="p-8">
                  <div className="grid grid-cols-3 gap-3">
                      <label className="aspect-square rounded-2xl border-2 border-white/5 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer bg-white/5 hover:border-primary/40 transition-colors">
                        <span className="material-symbols-outlined text-primary text-3xl">add_a_photo</span>
                        <input type="file" multiple accept="image/*" className="hidden" onChange={handleAddPhotos} />
                      </label>
                      {activeRoll.photos.map(photo => (
                        <div key={photo.id} onClick={() => setSelectedPhotoId(photo.id)} className="relative aspect-square rounded-2xl overflow-hidden border border-white/5 group shadow-lg">
                            <img src={photo.url} className="size-full object-cover transition-transform duration-700 group-hover:scale-110" />
                            {photo.analysis && <div className="absolute top-2 right-2 size-4 bg-primary rounded-full shadow-lg border-2 border-black"></div>}
                        </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {currentView === View.SCENE_SCOUT && <SceneScout stock={stock} onClose={() => setCurrentView(View.DASHBOARD)} />}
      {currentView === View.NEGATIVE_INVERTER && <NegativeInverter onClose={() => setCurrentView(View.DASHBOARD)} />}
      {currentView === View.RECIPROCITY_LAB && <ReciprocityLab onClose={() => setCurrentView(View.DASHBOARD)} />}
      {currentView === View.FRIDGE && <FilmFridge stock={stock} onUpdateStock={saveStockToDB} onClose={() => setCurrentView(View.DASHBOARD)} />}
      {currentView === View.LIGHT_METER && <LightMeter onClose={() => setCurrentView(View.DASHBOARD)} />}
      {currentView === View.DEVELOP_TIMER && <DevelopmentTimer onClose={() => setCurrentView(View.DASHBOARD)} />}
      {currentView === View.CHEM_CALC && <ChemistryCalculator onClose={() => setCurrentView(View.DASHBOARD)} />}
      {currentView === View.STATS && <StatsView rolls={rolls} stock={stock} />}
      {currentView === View.SCANNER && <Scanner onScanComplete={handleScanComplete} onClose={() => setCurrentView(View.DASHBOARD)} />}

      {isManualAddOpen && (
          <ManualRollEntry 
            onSave={handleManualAddSave} 
            onClose={() => setIsManualAddOpen(false)} 
            defaultCamera={userProfile.favoriteCamera || 'Leica M6'} 
          />
      )}

      {selectedPhotoId && activeRoll && (
          <Lightbox 
            photo={activeRoll.photos.find(p => p.id === selectedPhotoId)!} 
            onClose={() => setSelectedPhotoId(null)} 
            onAnalyze={async (pid, url) => {
                const res = await analyzePhoto(url);
                const updatedRoll = { ...activeRoll, photos: activeRoll.photos.map(p => p.id === pid ? { ...p, analysis: res } : p) };
                setRolls(prev => prev.map(r => r.id === activeRoll.id ? updatedRoll : r));
                saveRollToDB(updatedRoll);
            }} 
          />
      )}

      {isProfileEditorOpen && (
          <ProfileEditor 
            profile={userProfile} 
            onSave={(newP) => { setUserProfile(newP); setIsProfileEditorOpen(false); }} 
            onClose={() => setIsProfileEditorOpen(false)} 
          />
      )}

      <Navigation currentView={currentView} onChangeView={handleNavigationChange} />
    </div>
  );
}
