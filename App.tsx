
import React, { useState, useEffect } from 'react';
import { View, Roll, RollStatus, FilmPhoto, UserProfile, StockFilm } from './types';
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
      camera: 'Canon AE-1', lens: '50mm f/1.8', date: '2023-10-12', copyright: 'Film Archivist'
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
            setIsPanelOpen(true);
        } catch (e: any) {
            if (e.message === "API_KEY_MISSING") {
                if (confirm("需要配置 API Key 才能使用 AI 分析。是否现在前往“我的”界面配置？")) {
                    onGoToProfile();
                }
            } else {
                alert("分析失败，请稍后重试。");
            }
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] bg-black/95 backdrop-blur-xl flex flex-col md:flex-row animate-fade-in pt-[env(safe-area-inset-top)]">
            <div className="absolute top-0 left-0 right-0 p-4 pt-[calc(env(safe-area-inset-top)+1rem)] flex justify-between items-center z-20 pointer-events-none">
                <button onClick={onClose} className="text-white/80 hover:text-white bg-black/40 p-2 rounded-full backdrop-blur pointer-events-auto active:scale-90 transition-transform">
                    <span className="material-symbols-outlined">close</span>
                </button>
                <div className="flex gap-4 pointer-events-auto">
                     <button 
                        onClick={handleAnalyze}
                        disabled={isAnalyzing}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all active:scale-95 ${photo.analysis ? 'bg-primary/20 border-primary text-primary-hover' : 'bg-white/10 border-white/20 text-white'}`}
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
                <div className="p-6 h-full overflow-y-auto space-y-6">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2"><span className="material-symbols-outlined text-primary">analytics</span>验片报告</h3>
                    {photo.analysis ? (
                        <div className="space-y-6 animate-fade-in">
                             <div className="space-y-1"><label className="text-[10px] uppercase text-muted">综合评分</label><div className="text-2xl font-black text-primary">{photo.analysis.rating}/10</div></div>
                             <div className="space-y-1"><label className="text-[10px] uppercase text-muted">氛围分析</label><p className="text-sm text-white/90 leading-relaxed">{photo.analysis.mood}</p></div>
                             <div className="space-y-1"><label className="text-[10px] uppercase text-muted">构图建议</label><p className="text-sm text-white/90 leading-relaxed">{photo.analysis.composition}</p></div>
                             <div className="flex flex-wrap gap-2 pt-2">{photo.analysis.tags.map(tag => (<span key={tag} className="text-[10px] text-primary bg-primary/10 border border-primary/20 px-2 py-1 rounded font-mono">#{tag}</span>))}</div>
                        </div>
                    ) : <div className="py-20 text-center text-xs text-muted uppercase tracking-widest">点击上方按钮开启 AI 验片</div>}
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
  const [activeRollId, setActiveRollId] = useState<string | null>(null);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [isProfileEditorOpen, setIsProfileEditorOpen] = useState(false);
  const [isExifModalOpen, setIsExifModalOpen] = useState(false);
  const [isAddRollModalOpen, setIsAddRollModalOpen] = useState(false);
  const [newRollData, setNewRollData] = useState({ brand: '', name: '', iso: '400', camera: '' });
  const [manualApiKey, setManualApiKey] = useState(localStorage.getItem('GEMINI_API_KEY') || '');
  const [isKeySaved, setIsKeySaved] = useState(false);

  useEffect(() => {
      const initLoad = async () => {
          try {
              const savedRolls = await getAllRollsFromDB();
              setRolls(savedRolls.length > 0 ? savedRolls : INITIAL_ROLLS);
              const savedProfile = localStorage.getItem('film_archive_profile_v2');
              if (savedProfile) setUserProfile(JSON.parse(savedProfile));
              const savedStock = localStorage.getItem('film_fridge_stock');
              if (savedStock) setStock(JSON.parse(savedStock));
          } catch (e) { console.error(e); } finally { setIsLoading(false); }
      };
      initLoad();
  }, []);

  useEffect(() => { localStorage.setItem('film_archive_profile_v2', JSON.stringify(userProfile)); }, [userProfile]);
  useEffect(() => { localStorage.setItem('film_fridge_stock', JSON.stringify(stock)); }, [stock]);

  useEffect(() => {
    if (currentView === View.SPLASH) {
      const timer = setTimeout(() => { setCurrentView(View.DASHBOARD); }, 2500);
      return () => clearTimeout(timer);
    }
  }, [currentView]);

  const saveManualApiKey = () => {
      localStorage.setItem('GEMINI_API_KEY', manualApiKey.trim());
      setIsKeySaved(true);
      setTimeout(() => setIsKeySaved(false), 2000);
  };

  const handleScanComplete = async (result: IdentificationResult, captureImage: string) => {
    const newRoll: Roll = { id: Date.now().toString(), brand: result.brand || '未知品牌', name: result.name || '识别胶卷', iso: result.iso || 400, camera: userProfile.favoriteCamera || '未知相机', date: new Date().toISOString().split('T')[0], status: RollStatus.ACTIVE, coverImage: captureImage, photos: [], framesTaken: 0, totalFrames: 36 };
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

  const handleAnalyzePhoto = async (photoId: string, url: string) => {
      const result = await analyzePhoto(url);
      const roll = rolls.find(r => r.id === activeRollId);
      if (roll) {
          const updatedRoll = { ...roll, photos: roll.photos.map(p => p.id === photoId ? { ...p, analysis: result } : p) };
          setRolls(prev => prev.map(r => r.id === activeRollId ? updatedRoll : r));
          await saveRollToDB(updatedRoll);
      }
  };

  const activeRoll = rolls.find(r => r.id === activeRollId);

  if (currentView === View.SPLASH || isLoading) {
      return (<div className="fixed inset-0 bg-background-dark flex flex-col items-center justify-center z-[100] animate-fade-in"><div className="relative size-32 mb-8"><div className="absolute inset-0 border-4 border-primary rounded-full animate-spin-slow opacity-20"></div><div className="absolute inset-4 border-2 border-primary rounded-full animate-pulse"></div><div className="absolute inset-0 flex items-center justify-center"><span className="material-symbols-outlined text-primary text-5xl">shutter_speed</span></div></div><h1 className="text-3xl font-display font-black tracking-tighter uppercase text-white mb-2">Film Archive AI</h1></div>);
  }

  return (
    <div className="min-h-screen bg-background-dark text-white font-body pb-[calc(1.5rem+env(safe-area-inset-bottom)+60px)] overflow-x-hidden selection:bg-primary">
      {isUploading && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in">
              <div className="size-20 border-4 border-white/5 border-t-primary rounded-full animate-spin mb-6"></div>
              <h3 className="text-xl font-bold uppercase tracking-widest">处理中 {uploadProgress}%</h3>
          </div>
      )}

      {currentView === View.DASHBOARD && (
        <div className="p-6 pt-[calc(env(safe-area-inset-top)+3rem)] space-y-10 animate-fade-in max-w-2xl mx-auto">
            <header className="flex justify-between items-end">
                <div><span className="text-[10px] text-primary font-bold uppercase tracking-widest">Darkroom</span><h2 className="text-4xl font-display font-black tracking-tight mt-1">控制台</h2></div>
                <button onClick={() => setCurrentView(View.PROFILE)} className="size-12 rounded-full border-2 border-white/5 overflow-hidden active:scale-95 transition-transform"><img src={userProfile.avatar} className="w-full h-full object-cover" /></button>
            </header>
            <div className="grid grid-cols-2 gap-4">
                <div onClick={() => setCurrentView(View.LIBRARY)} className="bg-surface-dark border border-white/5 p-4 rounded-xl cursor-pointer">已拍胶卷<div className="text-3xl font-display font-black mt-1">{rolls.length}</div></div>
                <div onClick={() => setCurrentView(View.FRIDGE)} className="bg-surface-dark border border-white/5 p-4 rounded-xl cursor-pointer">胶片冰箱<div className="text-3xl font-display font-black mt-1">{stock.reduce((a, b) => a + b.count, 0)}</div></div>
            </div>
            <section className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted">快速功能</h3>
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setCurrentView(View.DEVELOP_TIMER)} className="flex items-center gap-3 p-4 bg-primary/10 border border-primary/20 rounded-xl"><span className="material-symbols-outlined text-primary">timer</span>暗房定时</button>
                    <button onClick={() => setCurrentView(View.LIGHT_METER)} className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl"><span className="material-symbols-outlined text-muted">exposure</span>测光表</button>
                    <button onClick={() => setCurrentView(View.NEGATIVE_INVERTER)} className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl"><span className="material-symbols-outlined text-muted">filter_b_and_w</span>底片翻转</button>
                    <button onClick={() => setCurrentView(View.CHEM_CALC)} className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl"><span className="material-symbols-outlined text-muted">calculate</span>药液计算</button>
                </div>
            </section>
        </div>
      )}

      {currentView === View.LIBRARY && (
          <div className="p-6 pt-[calc(env(safe-area-inset-top)+3rem)] animate-fade-in max-w-4xl mx-auto pb-32">
             <header className="flex justify-between items-end mb-8"><div><span className="text-[10px] text-primary font-bold uppercase tracking-widest">Archive</span><h2 className="text-4xl font-display font-black tracking-tight mt-1">胶片库</h2></div><button onClick={() => setIsAddRollModalOpen(true)} className="size-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center"><span className="material-symbols-outlined">add</span></button></header>
             <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {rolls.map(roll => (
                    <div key={roll.id} onClick={() => { setActiveRollId(roll.id); setCurrentView(View.ROLL_DETAIL); }} className="relative aspect-[4/5] rounded-xl overflow-hidden border border-white/10 group cursor-pointer"><img src={roll.coverImage} className="absolute inset-0 w-full h-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-80 group-hover:opacity-100 transition-opacity"></div><div className="absolute bottom-4 left-4 right-4"><div className="text-[8px] font-mono text-primary font-bold uppercase">{roll.brand}</div><div className="text-sm font-display font-black uppercase mt-0.5">{roll.name}</div></div></div>
                ))}
             </div>
          </div>
      )}

      {currentView === View.ROLL_DETAIL && activeRoll && (
          <div className="animate-fade-in pb-32">
              <div className="relative h-[45vh] w-full overflow-hidden">
                  <img src={activeRoll.coverImage} className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/20 to-transparent"></div>
                  <button onClick={() => setCurrentView(View.LIBRARY)} className="absolute top-[calc(env(safe-area-inset-top)+1rem)] left-6 size-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/10"><span className="material-symbols-outlined">arrow_back</span></button>
                  <div className="absolute bottom-8 left-6 right-6"><span className="text-xs text-primary font-bold uppercase">{activeRoll.brand}</span><h2 className="text-5xl font-display font-black uppercase mt-1 leading-none">{activeRoll.name}</h2></div>
              </div>
              <div className="p-6 space-y-8">
                  <div className="flex gap-2"><button onClick={() => setCurrentView(View.CONTACT_SHEET)} className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold uppercase">数字印样</button><button onClick={() => setIsExifModalOpen(true)} className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold uppercase">批量参数</button></div>
                  <div className="grid grid-cols-3 gap-2">
                      <label className="aspect-square rounded border border-white/10 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer bg-white/5"><span className="material-symbols-outlined text-primary">add_a_photo</span><span className="text-[10px] font-bold uppercase">上传</span><input type="file" multiple accept="image/*" className="hidden" onChange={handleAddPhotos} /></label>
                      {activeRoll.photos.map(photo => (<div key={photo.id} onClick={() => setSelectedPhotoId(photo.id)} className="relative aspect-square rounded overflow-hidden border border-white/5 cursor-pointer"><img src={photo.url} className="w-full h-full object-cover" />{photo.analysis && <div className="absolute top-1.5 right-1.5 size-3 bg-primary rounded-full shadow-lg"></div>}</div>))}
                  </div>
              </div>
          </div>
      )}

      {currentView === View.PROFILE && (
          <div className="p-6 pt-[calc(env(safe-area-inset-top)+3rem)] animate-fade-in max-w-2xl mx-auto space-y-10 pb-32">
              <header className="flex justify-between items-start"><h2 className="text-4xl font-display font-black uppercase">我的</h2><button onClick={() => setIsProfileEditorOpen(true)} className="size-10 rounded-full bg-primary flex items-center justify-center"><span className="material-symbols-outlined">edit</span></button></header>
              <div className="flex flex-col items-center text-center space-y-4"><img src={userProfile.avatar} className="size-32 rounded-full object-cover border-4 border-white/10" /><h3 className="text-2xl font-display font-black uppercase">{userProfile.name}</h3><p className="text-sm text-muted">{userProfile.bio}</p></div>
              <section className="bg-surface-dark border border-white/5 p-6 rounded-3xl space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2"><span className="material-symbols-outlined text-sm">vpn_key</span>AI 引擎配置</h3>
                  <div className="space-y-3">
                      <input type="password" value={manualApiKey} onChange={(e) => { setManualApiKey(e.target.value); setIsKeySaved(false); }} placeholder="粘贴您的 Gemini API Key" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono focus:border-primary focus:outline-none transition-colors" />
                      <button onClick={saveManualApiKey} className={`w-full py-3 rounded-xl font-bold text-[10px] uppercase transition-all ${isKeySaved ? 'bg-green-600 text-white' : 'bg-primary text-white active:scale-95'}`}>{isKeySaved ? '已保存成功' : '保存 API Key'}</button>
                  </div>
              </section>
          </div>
      )}

      {currentView === View.FRIDGE && <FilmFridge stock={stock} onUpdateStock={setStock} onClose={() => setCurrentView(View.DASHBOARD)} onOpenKeyModal={() => setCurrentView(View.PROFILE)} />}
      {currentView === View.NEGATIVE_INVERTER && <NegativeInverter onClose={() => setCurrentView(View.DASHBOARD)} />}
      {currentView === View.CHEM_CALC && <ChemistryCalculator onClose={() => setCurrentView(View.DASHBOARD)} />}
      {currentView === View.STATS && <StatsView rolls={rolls} />}
      {currentView === View.SCANNER && <Scanner onScanComplete={handleScanComplete} onClose={() => setCurrentView(View.DASHBOARD)} />}
      {currentView === View.LIGHT_METER && <LightMeter onClose={() => setCurrentView(View.DASHBOARD)} />}
      {currentView === View.DEVELOP_TIMER && <DevelopmentTimer onClose={() => setCurrentView(View.DASHBOARD)} />}
      {currentView === View.CONTACT_SHEET && activeRoll && <ContactSheet roll={activeRoll} onClose={() => setCurrentView(View.ROLL_DETAIL)} />}
      {selectedPhotoId && activeRoll && <Lightbox photo={activeRoll.photos.find(p => p.id === selectedPhotoId)!} onClose={() => setSelectedPhotoId(null)} onAnalyze={handleAnalyzePhoto} onGoToProfile={() => { setSelectedPhotoId(null); setCurrentView(View.PROFILE); }} />}

      {isAddRollModalOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm shadow-2xl">
               <div className="w-full max-w-sm bg-[#111] border border-white/10 rounded-[2.5rem] p-8 space-y-6">
                    <h3 className="text-xl font-black uppercase text-primary">添加胶卷</h3>
                    <div className="space-y-4">
                        <input type="text" placeholder="品牌 (Kodak)" value={newRollData.brand} onChange={(e) => setNewRollData({...newRollData, brand: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-primary outline-none" />
                        <input type="text" placeholder="型号 (Gold 200)" value={newRollData.name} onChange={(e) => setNewRollData({...newRollData, name: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-primary outline-none" />
                    </div>
                    <button onClick={handleManualAddRoll} className="w-full py-4 bg-primary text-white font-bold rounded-2xl uppercase text-xs active:scale-95">创建胶卷</button>
                    <button onClick={() => setIsAddRollModalOpen(false)} className="w-full text-[10px] text-muted uppercase">取消</button>
               </div>
          </div>
      )}

      {currentView !== View.SCANNER && currentView !== View.DEVELOP_TIMER && currentView !== View.LIGHT_METER && currentView !== View.FRIDGE && currentView !== View.NEGATIVE_INVERTER && currentView !== View.CHEM_CALC && (<Navigation currentView={currentView} onChangeView={setCurrentView} />)}
    </div>
  );
}
