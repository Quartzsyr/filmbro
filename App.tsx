
import React, { useState, useEffect } from 'react';
import { View, Roll, RollStatus, FilmPhoto, UserProfile, StockFilm, ExifData, UserSettings } from './types';
import { Navigation } from './components/Navigation';
import { Scanner } from './components/Scanner';
import { BatchExifEditor } from './components/BatchExifEditor';
import { ContactSheet } from './components/ContactSheet';
import { DevelopmentTimer } from './components/DevelopmentTimer';
import { ProfileEditor } from './components/ProfileEditor';
import { ExportSettings } from './components/ExportSettings';
import { LightMeter } from './components/LightMeter';
import { StatsView } from './components/StatsView';
import { FilmFridge } from './components/FilmFridge';
import { NegativeInverter } from './components/NegativeInverter';
import { ChemistryCalculator } from './components/ChemistryCalculator';
import { IdentificationResult, analyzePhoto, getApiKey, getDailyInsight } from './services/geminiService';
import { resizeImage } from './utils/imageUtils';
import { getAllRollsFromDB, saveRollToDB, deleteRollFromDB, getAllStockFromDB, saveStockToDB } from './services/dbService';

const DEFAULT_SETTINGS: UserSettings = {
    tempUnit: 'C',
    oledMode: false,
    autoAnalyze: false
};

const INITIAL_PROFILE: UserProfile = {
    name: '胶片收藏家',
    role: '自 2021 年开始记录',
    avatar: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=200',
    bio: '捕捉银盐间的瞬间。专注于街头摄影和建筑抽象。',
    favoriteCamera: 'Leica M6',
    favoriteFilm: 'Kodak Tri-X 400',
    website: 'darkroom.ai',
    settings: DEFAULT_SETTINGS
};

const Lightbox = ({ photo, onClose, onAnalyze, onGoToProfile }: { 
    photo: FilmPhoto, 
    onClose: () => void,
    onAnalyze: (photoId: string, url: string) => Promise<void>,
    onGoToProfile: () => void
}) => {
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    useEffect(() => { if (photo.analysis) setIsPanelOpen(true); }, [photo]);

    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        try {
            await onAnalyze(photo.id, photo.url);
        } catch (e: any) {
            if (e.message === "API_KEY_MISSING") {
                if (confirm("需要配置 API Key 才能使用 AI 验片。是否现在前往“我的”界面配置？")) {
                    onGoToProfile();
                }
            } else {
                alert("AI 分析失败，请检查网络或 API Key 状态。");
            }
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-xl flex flex-col md:flex-row animate-fade-in pt-[env(safe-area-inset-top)]">
            <div className="absolute top-0 left-0 right-0 p-4 pt-[calc(env(safe-area-inset-top)+1rem)] flex justify-between items-center z-20 pointer-events-none">
                <button onClick={onClose} className="text-white/80 hover:text-white bg-black/40 p-2 rounded-full backdrop-blur pointer-events-auto active:scale-90 transition-transform">
                    <span className="material-symbols-outlined">close</span>
                </button>
                <div className="flex gap-4 pointer-events-auto">
                     <button 
                        onClick={handleAnalyze}
                        disabled={isAnalyzing}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all active:scale-95 ${photo.analysis ? 'bg-primary/20 border-primary text-primary-hover' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}`}
                     >
                        <span className={`material-symbols-outlined text-[18px] ${isAnalyzing ? 'animate-spin' : ''}`}>{isAnalyzing ? 'sync' : (photo.analysis ? 'check_circle' : 'auto_awesome')}</span>
                        <span className="text-xs font-bold uppercase tracking-wider">{isAnalyzing ? 'AI 分析中...' : (photo.analysis ? 'AI 分析完成' : 'AI 验片')}</span>
                     </button>
                </div>
            </div>

            <div className="flex-1 flex items-center justify-center p-4">
                <img src={photo.url} className="max-w-full max-h-full object-contain shadow-2xl rounded-sm" />
            </div>

            <div className={`fixed inset-x-0 bottom-0 md:static md:w-96 bg-[#111] border-t md:border-t-0 md:border-l border-white/10 transform transition-transform duration-300 ease-out z-30 flex flex-col pb-[env(safe-area-inset-bottom)] ${isPanelOpen ? 'translate-y-0' : 'translate-y-full md:translate-x-full md:translate-y-0'}`}>
                <div className="p-6 h-full overflow-y-auto space-y-6 no-scrollbar">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">analytics</span>
                        验片报告
                    </h3>
                    {photo.analysis ? (
                        <div className="space-y-6 animate-fade-in">
                             <div className="space-y-1"><label className="text-[10px] uppercase text-muted">评分</label><div className="text-2xl font-black text-primary">{photo.analysis.rating}/10</div></div>
                             <div className="space-y-1"><label className="text-[10px] uppercase text-muted">影调</label><p className="text-sm text-white/90 leading-relaxed font-light">{photo.analysis.mood}</p></div>
                             <div className="space-y-1"><label className="text-[10px] uppercase text-muted">构图</label><p className="text-sm text-white/90 leading-relaxed font-light">{photo.analysis.composition}</p></div>
                             <div className="flex flex-wrap gap-2 pt-2">{photo.analysis.tags.map(tag => (<span key={tag} className="text-[10px] text-primary bg-primary/10 border border-primary/20 px-2 py-1 rounded font-mono">#{tag}</span>))}</div>
                        </div>
                    ) : (
                        <div className="py-20 text-center text-xs text-muted uppercase tracking-widest">点击上方按钮开启 AI 分析</div>
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
  const [stock, setStock] = useState<StockFilm[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>(INITIAL_PROFILE);
  const [dailyInsight, setDailyInsight] = useState('光影是时间的琥珀。');

  const [activeRollId, setActiveRollId] = useState<string | null>(null);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [isProfileEditorOpen, setIsProfileEditorOpen] = useState(false);
  const [isExifEditorOpen, setIsExifEditorOpen] = useState(false);
  const [isAddRollModalOpen, setIsAddRollModalOpen] = useState(false);
  const [newRollData, setNewRollData] = useState({ brand: '', name: '', iso: '400', camera: '' });
  const [manualApiKey, setManualApiKey] = useState(localStorage.getItem('GEMINI_API_KEY') || '');
  const [isKeySaved, setIsKeySaved] = useState(false);

  useEffect(() => {
      const initLoad = async () => {
          try {
              const savedRolls = await getAllRollsFromDB();
              setRolls(savedRolls.length > 0 ? savedRolls : []);
              const savedProfile = localStorage.getItem('film_archive_profile_v2');
              if (savedProfile) setUserProfile(JSON.parse(savedProfile));
              const savedStock = await getAllStockFromDB();
              setStock(savedStock);
              
              const insight = await getDailyInsight();
              setDailyInsight(insight);
          } catch (e) { console.error(e); } finally { setIsLoading(false); }
      };
      initLoad();
  }, []);

  useEffect(() => { localStorage.setItem('film_archive_profile_v2', JSON.stringify(userProfile)); }, [userProfile]);

  useEffect(() => {
    if (currentView === View.SPLASH) {
      const timer = setTimeout(() => { setCurrentView(View.DASHBOARD); }, 2500);
      return () => clearTimeout(timer);
    }
  }, [currentView]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 5) return "凌晨，暗房还在亮着吗？";
    if (hour < 9) return "早安，晨光摄影人";
    if (hour < 12) return "上午好，光线正迷人";
    if (hour < 18) return "下午好，记录瞬间";
    if (hour < 22) return "晚安，潜入银盐之梦";
    return "深夜，灵魂在胶片中游走";
  };

  const handleUpdateSettings = (newSettings: Partial<UserSettings>) => {
      setUserProfile(prev => ({
          ...prev,
          settings: { ...prev.settings!, ...newSettings }
      }));
  };

  const handleClearAllData = async () => {
      if (confirm("警告：此操作将永久删除本地存储的所有胶卷、照片和库存数据。确定继续吗？")) {
          indexedDB.deleteDatabase('FilmArchiveDB');
          localStorage.removeItem('film_archive_profile_v2');
          window.location.reload();
      }
  };

  const handleExportData = () => {
      const data = { rolls, stock, userProfile };
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `film_archive_backup_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
  };

  const saveManualApiKey = () => {
      localStorage.setItem('GEMINI_API_KEY', manualApiKey.trim());
      setIsKeySaved(true);
      setTimeout(() => setIsKeySaved(false), 2000);
  };

  const handleScanComplete = async (result: IdentificationResult, captureImage: string) => {
    const newRoll: Roll = { id: Date.now().toString(), brand: result.brand || '未知', name: result.name || '识别中', iso: result.iso || 400, camera: userProfile.favoriteCamera || '未知相机', date: new Date().toISOString().split('T')[0], status: RollStatus.ACTIVE, coverImage: captureImage, photos: [], framesTaken: 0, totalFrames: 36 };
    setRolls([newRoll, ...rolls]);
    await saveRollToDB(newRoll);
    setActiveRollId(newRoll.id);
    setCurrentView(View.ROLL_DETAIL);
  };

  const handleManualAddRoll = async () => {
      if(!newRollData.brand || !newRollData.name) return;
      const newRoll: Roll = { id: Date.now().toString(), brand: newRollData.brand, name: newRollData.name, iso: parseInt(newRollData.iso) || 400, camera: newRollData.camera || userProfile.favoriteCamera || '未知相机', date: new Date().toISOString().split('T')[0], status: RollStatus.ACTIVE, coverImage: 'https://images.unsplash.com/photo-1590483736622-39da8af75bba?auto=format&fit=crop&q=80&w=400', photos: [], framesTaken: 0, totalFrames: 36 };
      setRolls([newRoll, ...rolls]);
      await saveRollToDB(newRoll);
      setIsAddRollModalOpen(false);
      setNewRollData({ brand: '', name: '', iso: '400', camera: '' });
  };

  const handleAddPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || !activeRollId) return;
      const files = Array.from(e.target.files) as File[];
      setIsUploading(true);
      const newPhotos: FilmPhoto[] = [];
      for (let i = 0; i < files.length; i++) {
          try {
              const base64 = await resizeImage(files[i], 1600, 0.7); 
              newPhotos.push({ id: Math.random().toString(36).substr(2, 9), url: base64 });
              setUploadProgress(Math.round(((i + 1) / files.length) * 100));
          } catch (err) { console.error(err); }
      }
      const roll = rolls.find(r => r.id === activeRollId);
      if (roll) {
          const updatedRoll = { ...roll, photos: [...roll.photos, ...newPhotos], framesTaken: roll.photos.length + newPhotos.length };
          setRolls(prev => prev.map(r => r.id === activeRollId ? updatedRoll : r));
          await saveRollToDB(updatedRoll);
      }
      setIsUploading(false);
  };

  const handleUpdateStock = async (newStock: StockFilm[]) => {
      setStock(newStock);
      await saveStockToDB(newStock);
  };

  const activeRoll = rolls.find(r => r.id === activeRollId);

  if (currentView === View.SPLASH || isLoading) {
      return (<div className="fixed inset-0 bg-background-dark flex flex-col items-center justify-center z-[150] animate-fade-in"><div className="relative size-32 mb-8"><div className="absolute inset-0 border-4 border-primary rounded-full animate-spin-slow opacity-20"></div><div className="absolute inset-4 border-2 border-primary rounded-full animate-pulse"></div><div className="absolute inset-0 flex items-center justify-center"><span className="material-symbols-outlined text-primary text-5xl">shutter_speed</span></div></div><h1 className="text-3xl font-display font-black tracking-tighter uppercase text-white mb-2">Film Archive AI</h1></div>);
  }

  return (
    <div className={`min-h-screen ${userProfile.settings?.oledMode ? 'bg-black' : 'bg-background-dark'} text-white font-body pb-[calc(1.5rem+env(safe-area-inset-bottom)+60px)] overflow-x-hidden selection:bg-primary`}>
      {isUploading && (
          <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in">
              <div className="size-20 border-4 border-white/5 border-t-primary rounded-full animate-spin mb-6"></div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-white">正在处理照片</h3>
              <p className="text-sm text-muted mt-2">{uploadProgress}%</p>
          </div>
      )}

      {currentView === View.DASHBOARD && (
        <div className="p-6 pt-[calc(env(safe-area-inset-top)+3rem)] space-y-10 animate-fade-in max-w-2xl mx-auto">
            <header className="flex justify-between items-start">
                <div>
                    <span className="text-[11px] text-primary font-black uppercase tracking-[0.3em]">{getGreeting()}</span>
                    <h2 className="text-3xl font-display font-black tracking-tight mt-1">{userProfile.name}</h2>
                </div>
                <button onClick={() => setCurrentView(View.PROFILE)} className="size-14 rounded-2xl border border-white/10 p-0.5 overflow-hidden active:scale-95 transition-transform"><img src={userProfile.avatar} className="w-full h-full object-cover rounded-xl" /></button>
            </header>

            <section className="bg-surface-dark border border-white/5 p-6 rounded-3xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-transform group-hover:scale-125 duration-1000">
                    <span className="material-symbols-outlined text-7xl">format_quote</span>
                </div>
                <h3 className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">Daily Insight</h3>
                <p className="text-lg font-display font-bold leading-snug italic text-white/90">
                    “{dailyInsight}”
                </p>
            </section>

            <div className="grid grid-cols-2 gap-4">
                <div onClick={() => setCurrentView(View.LIBRARY)} className="bg-surface-dark border border-white/5 p-6 rounded-3xl cursor-pointer hover:bg-white/10 active:scale-95 transition-all">
                    <span className="material-symbols-outlined text-primary mb-3">grid_view</span>
                    <div className="text-[10px] text-muted font-bold uppercase tracking-widest">已拍胶卷</div>
                    <div className="text-3xl font-display font-black mt-1">{rolls.length}</div>
                </div>
                <div onClick={() => setCurrentView(View.FRIDGE)} className="bg-surface-dark border border-white/5 p-6 rounded-3xl cursor-pointer hover:bg-white/10 active:scale-95 transition-all">
                    <span className="material-symbols-outlined text-primary mb-3">kitchen</span>
                    <div className="text-[10px] text-muted font-bold uppercase tracking-widest">胶片冰箱</div>
                    <div className="text-3xl font-display font-black mt-1">{stock.reduce((a, b) => a + b.count, 0)}</div>
                </div>
            </div>

            <section className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted">暗房工具集</h3>
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setCurrentView(View.DEVELOP_TIMER)} className="flex items-center gap-4 p-5 bg-primary/10 border border-primary/20 rounded-2xl active:scale-95 transition-all"><span className="material-symbols-outlined text-primary">timer</span>暗房计时</button>
                    <button onClick={() => setCurrentView(View.LIGHT_METER)} className="flex items-center gap-4 p-5 bg-white/5 border border-white/10 rounded-2xl active:scale-95 transition-all"><span className="material-symbols-outlined text-muted">exposure</span>测光表</button>
                    <button onClick={() => setCurrentView(View.NEGATIVE_INVERTER)} className="flex items-center gap-4 p-5 bg-white/5 border border-white/10 rounded-2xl active:scale-95 transition-all"><span className="material-symbols-outlined text-muted">filter_b_and_w</span>底片翻转</button>
                    <button onClick={() => setCurrentView(View.CHEM_CALC)} className="flex items-center gap-4 p-5 bg-white/5 border border-white/10 rounded-2xl active:scale-95 transition-all"><span className="material-symbols-outlined text-muted">calculate</span>药液计算</button>
                </div>
            </section>
        </div>
      )}

      {currentView === View.PROFILE && (
          <div className="p-6 pt-[calc(env(safe-area-inset-top)+3rem)] animate-fade-in max-w-2xl mx-auto space-y-10 pb-32 no-scrollbar">
              <header className="flex justify-between items-start"><h2 className="text-4xl font-display font-black uppercase">Settings</h2><button onClick={() => setIsProfileEditorOpen(true)} className="size-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 active:scale-90 transition-transform"><span className="material-symbols-outlined">edit</span></button></header>
              
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="relative">
                    <img src={userProfile.avatar} className="size-32 rounded-[2.5rem] object-cover border-4 border-white/5 shadow-2xl" />
                    <div className="absolute -bottom-2 -right-2 size-10 bg-surface-dark border border-white/10 rounded-xl flex items-center justify-center"><span className="material-symbols-outlined text-sm text-primary">verified</span></div>
                </div>
                <div>
                    <h3 className="text-2xl font-display font-black uppercase">{userProfile.name}</h3>
                    <p className="text-xs text-muted uppercase tracking-widest mt-1">{userProfile.role}</p>
                </div>
              </div>

              <section className="bg-surface-dark border border-white/5 p-6 rounded-3xl space-y-6">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><span className="material-symbols-outlined text-sm">vpn_key</span>AI 引擎配置</h3>
                  <div className="space-y-4">
                      <input type="password" value={manualApiKey} onChange={(e) => { setManualApiKey(e.target.value); setIsKeySaved(false); }} placeholder="Paste Gemini API Key" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-sm font-mono focus:border-primary focus:outline-none transition-colors" />
                      <button onClick={saveManualApiKey} className={`w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${isKeySaved ? 'bg-green-600' : 'bg-primary active:scale-95'}`}>{isKeySaved ? 'API KEY SAVED' : 'Apply API Key'}</button>
                  </div>
              </section>

              <section className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-muted px-2">系统设置</h3>
                  <div className="bg-surface-dark border border-white/5 rounded-3xl overflow-hidden divide-y divide-white/5">
                      <div className="flex items-center justify-between p-5">
                          <div><div className="text-sm font-bold">OLED 纯黑模式</div><div className="text-[10px] text-muted uppercase">适合 OLED 屏，极致深邃</div></div>
                          <button onClick={() => handleUpdateSettings({ oledMode: !userProfile.settings?.oledMode })} className={`w-12 h-6 rounded-full relative transition-colors ${userProfile.settings?.oledMode ? 'bg-primary' : 'bg-white/10'}`}><div className={`absolute top-1 left-1 size-4 bg-white rounded-full transition-transform ${userProfile.settings?.oledMode ? 'translate-x-6' : 'translate-x-0'}`}></div></button>
                      </div>
                      <div className="flex items-center justify-between p-5">
                          <div><div className="text-sm font-bold">温度单位</div><div className="text-[10px] text-muted uppercase">影响暗房工具显示</div></div>
                          <button onClick={() => handleUpdateSettings({ tempUnit: userProfile.settings?.tempUnit === 'C' ? 'F' : 'C' })} className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-black uppercase tracking-widest">{userProfile.settings?.tempUnit === 'C' ? 'Celsius' : 'Fahrenheit'}</button>
                      </div>
                      <div className="flex items-center justify-between p-5">
                          <div><div className="text-sm font-bold">本地数据导出</div><div className="text-[10px] text-muted uppercase">备份为 JSON 文件</div></div>
                          <button onClick={handleExportData} className="size-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center active:scale-90 transition-transform"><span className="material-symbols-outlined text-sm">download</span></button>
                      </div>
                  </div>
              </section>

              <section className="pt-4 px-2 flex flex-col items-center">
                  <button onClick={handleClearAllData} className="text-[10px] font-black text-red-500/60 uppercase tracking-widest hover:text-red-500 transition-colors">彻底清空本地数据</button>
                  <div className="text-[9px] text-muted/30 uppercase tracking-[0.4em] mt-8">Film Archive AI v2.5.0 • Gemini 3 Flash</div>
              </section>
          </div>
      )}

      {currentView === View.LIBRARY && (
          <div className="p-6 pt-[calc(env(safe-area-inset-top)+3rem)] animate-fade-in max-w-4xl mx-auto pb-32">
             <header className="flex justify-between items-end mb-8"><div><span className="text-[10px] text-primary font-bold uppercase tracking-widest">Archive</span><h2 className="text-4xl font-display font-black tracking-tight mt-1">图库</h2></div><button onClick={() => setIsAddRollModalOpen(true)} className="size-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center"><span className="material-symbols-outlined">add</span></button></header>
             <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {rolls.map(roll => (
                    <div key={roll.id} onClick={() => { setActiveRollId(roll.id); setCurrentView(View.ROLL_DETAIL); }} className="relative aspect-[4/5] rounded-xl overflow-hidden border border-white/10 group cursor-pointer"><img src={roll.coverImage} className="absolute inset-0 w-full h-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-80 group-hover:opacity-100 transition-opacity"></div><div className="absolute bottom-4 left-4 right-4"><div className="text-[8px] font-mono text-primary font-bold uppercase">{roll.brand}</div><div className="text-sm font-display font-black uppercase mt-0.5">{roll.name}</div></div></div>
                ))}
                {rolls.length === 0 && <div className="col-span-full py-20 text-center text-muted uppercase text-xs tracking-widest border-2 border-dashed border-white/5 rounded-3xl">暂无胶卷，开始拍摄吧</div>}
             </div>
          </div>
      )}

      {currentView === View.ROLL_DETAIL && activeRoll && (
          <div className="animate-fade-in pb-32">
              <div className="relative h-[45vh] w-full overflow-hidden">
                  <img src={activeRoll.coverImage} className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/20 to-transparent"></div>
                  <button onClick={() => setCurrentView(View.LIBRARY)} className="absolute top-[calc(env(safe-area-inset-top)+1rem)] left-6 z-30 size-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/10"><span className="material-symbols-outlined">arrow_back</span></button>
                  <div className="absolute bottom-8 left-6 right-6"><span className="text-xs text-primary font-bold uppercase">{activeRoll.brand}</span><h2 className="text-5xl font-display font-black uppercase mt-1 leading-none">{activeRoll.name}</h2></div>
              </div>
              <div className="p-6 space-y-8">
                  <div className="flex gap-2">
                    <button onClick={() => setCurrentView(View.CONTACT_SHEET)} className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold uppercase">数字印样</button>
                    <button onClick={() => setIsExifEditorOpen(true)} className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold uppercase">编辑元数据</button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                      <label className="aspect-square rounded border border-white/10 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer bg-white/5"><span className="material-symbols-outlined text-primary">add_a_photo</span><span className="text-[10px] font-bold uppercase">上传</span><input type="file" multiple accept="image/*" className="hidden" onChange={handleAddPhotos} /></label>
                      {activeRoll.photos.map(photo => (<div key={photo.id} onClick={() => setSelectedPhotoId(photo.id)} className="relative aspect-square rounded overflow-hidden border border-white/5 cursor-pointer"><img src={photo.url} className="w-full h-full object-cover" />{photo.analysis && <div className="absolute top-1.5 right-1.5 size-3 bg-primary rounded-full shadow-lg"></div>}</div>))}
                  </div>
              </div>
          </div>
      )}

      {currentView === View.FRIDGE && <FilmFridge stock={stock} onUpdateStock={handleUpdateStock} onClose={() => setCurrentView(View.DASHBOARD)} onOpenKeyModal={() => setCurrentView(View.PROFILE)} />}
      {currentView === View.NEGATIVE_INVERTER && <NegativeInverter onClose={() => setCurrentView(View.DASHBOARD)} />}
      {currentView === View.CHEM_CALC && <ChemistryCalculator onClose={() => setCurrentView(View.DASHBOARD)} />}
      {currentView === View.STATS && <StatsView rolls={rolls} />}
      {currentView === View.SCANNER && <Scanner onScanComplete={handleScanComplete} onClose={() => setCurrentView(View.DASHBOARD)} />}
      {currentView === View.LIGHT_METER && <LightMeter onClose={() => setCurrentView(View.DASHBOARD)} />}
      {currentView === View.DEVELOP_TIMER && <DevelopmentTimer onClose={() => setCurrentView(View.DASHBOARD)} />}
      {currentView === View.CONTACT_SHEET && activeRoll && <ContactSheet roll={activeRoll} onClose={() => setCurrentView(View.ROLL_DETAIL)} />}
      
      {isExifEditorOpen && activeRoll && (
          <BatchExifEditor roll={activeRoll} onSave={(data) => {
              const updatedRoll = { ...activeRoll, defaultExif: data, camera: data.camera, date: data.date || activeRoll.date };
              setRolls(prev => prev.map(r => r.id === activeRoll.id ? updatedRoll : r));
              saveRollToDB(updatedRoll);
              setIsExifEditorOpen(false);
          }} onClose={() => setIsExifEditorOpen(false)} />
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
            onGoToProfile={() => { setSelectedPhotoId(null); setCurrentView(View.PROFILE); }} 
          />
      )}

      {isProfileEditorOpen && (
          <ProfileEditor 
            profile={userProfile} 
            onSave={(newP) => { setUserProfile(newP); setIsProfileEditorOpen(false); }} 
            onClose={() => setIsProfileEditorOpen(false)} 
          />
      )}

      {isAddRollModalOpen && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm shadow-2xl">
               <div className="w-full max-w-sm bg-[#111] border border-white/10 rounded-[2.5rem] p-8 space-y-6">
                    <h3 className="text-xl font-black uppercase text-primary">录入胶卷</h3>
                    <div className="space-y-4">
                        <input type="text" placeholder="品牌 (e.g. Fuji)" value={newRollData.brand} onChange={(e) => setNewRollData({...newRollData, brand: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-primary outline-none" />
                        <input type="text" placeholder="型号 (e.g. C200)" value={newRollData.name} onChange={(e) => setNewRollData({...newRollData, name: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-primary outline-none" />
                    </div>
                    <button onClick={handleManualAddRoll} className="w-full py-4 bg-primary text-white font-bold rounded-2xl uppercase text-xs active:scale-95">确认</button>
                    <button onClick={() => setIsAddRollModalOpen(false)} className="w-full text-[10px] text-muted uppercase">取消</button>
               </div>
          </div>
      )}

      {currentView !== View.SCANNER && currentView !== View.DEVELOP_TIMER && currentView !== View.LIGHT_METER && currentView !== View.FRIDGE && currentView !== View.NEGATIVE_INVERTER && currentView !== View.CHEM_CALC && (<Navigation currentView={currentView} onChangeView={setCurrentView} />)}
    </div>
  );
}
