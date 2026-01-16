
import React, { useState, useEffect } from 'react';
import { StockFilm } from '../types';
import { recommendFilm } from '../services/geminiService';

interface FilmFridgeProps {
  stock: StockFilm[];
  onUpdateStock: (stock: StockFilm[]) => void;
  onClose: () => void;
  onOpenKeyModal: () => void;
}

export const FilmFridge: React.FC<FilmFridgeProps> = ({ stock, onUpdateStock, onClose, onOpenKeyModal }) => {
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [isRecommending, setIsRecommending] = useState(false);
  const [weather, setWeather] = useState('获取天气中...');
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [newFilm, setNewFilm] = useState<Partial<StockFilm>>({
      brand: '', name: '', iso: 400, format: '135', count: 1, expiryDate: ''
  });

  useEffect(() => {
    // 模拟获取地理位置和天气
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(() => {
          const conditions = ['晴朗', '多云', '阴天', '有雨'];
          setWeather(conditions[Math.floor(Math.random() * conditions.length)]);
      }, () => setWeather('多云'));
    }
  }, []);

  const handleGetRecommendation = async () => {
    if (stock.length === 0) {
        alert("冰箱空空如也，先添加一些胶卷吧！");
        return;
    }
    setIsRecommending(true);
    try {
      const advice = await recommendFilm(weather, stock);
      setRecommendation(advice);
    } catch (e: any) {
      if (e.message === "API_KEY_MISSING") onOpenKeyModal();
    } finally {
      setIsRecommending(false);
    }
  };

  const handleAddFilm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFilm.brand || !newFilm.name || !newFilm.expiryDate) return;
    
    const film: StockFilm = {
      id: Math.random().toString(36).substr(2, 9),
      brand: newFilm.brand,
      name: newFilm.name,
      iso: newFilm.iso || 400,
      expiryDate: newFilm.expiryDate,
      count: newFilm.count || 1,
      format: newFilm.format as any
    };
    
    onUpdateStock([...stock, film]);
    setShowAddForm(false);
    setNewFilm({ brand: '', name: '', iso: 400, format: '135', count: 1, expiryDate: '' });
  };

  const deleteFilm = (id: string) => {
    onUpdateStock(stock.filter(f => f.id !== id));
  };

  const isExpired = (date: string) => new Date(date) < new Date();
  const isExpiringSoon = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = d.getTime() - now.getTime();
    return diff > 0 && diff < 1000 * 60 * 60 * 24 * 90; // 3 months
  };

  return (
    <div className="fixed inset-0 z-[80] bg-background-dark flex flex-col animate-fade-in font-display overflow-hidden">
      {/* 顶部栏 */}
      <header className="p-6 pt-[calc(env(safe-area-inset-top)+1rem)] border-b border-white/5 flex justify-between items-center bg-surface-highlight/50 backdrop-blur-md">
        <button onClick={onClose} className="size-10 rounded-full bg-white/5 flex items-center justify-center active:scale-90 transition-transform">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-primary font-bold uppercase tracking-[0.3em]">Cold Storage</span>
          <h2 className="text-xl font-black uppercase flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">kitchen</span>
            胶片冰箱
          </h2>
        </div>
        <button onClick={() => setShowAddForm(true)} className="size-10 rounded-full bg-primary flex items-center justify-center active:scale-90 transition-transform shadow-lg shadow-primary/20">
          <span className="material-symbols-outlined">add</span>
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar pb-32">
        {/* 天气推荐区域 */}
        <section className="bg-surface-dark border border-white/5 p-6 rounded-3xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
                <span className="material-symbols-outlined text-8xl text-primary">wb_sunny</span>
            </div>
            
            <div className="relative z-10 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-[10px] font-bold text-muted uppercase tracking-widest">今日天气</div>
                        <div className="text-2xl font-black text-white flex items-center gap-2">
                            {weather === '晴朗' ? '☀️' : weather === '多云' ? '⛅' : '☁️'} {weather}
                        </div>
                    </div>
                    <button 
                        onClick={handleGetRecommendation}
                        disabled={isRecommending}
                        className="px-5 py-2.5 bg-primary/10 border border-primary/30 rounded-full text-xs font-black text-primary uppercase tracking-widest hover:bg-primary/20 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {isRecommending ? <span className="material-symbols-outlined animate-spin text-sm">sync</span> : <span className="material-symbols-outlined text-sm">auto_awesome</span>}
                        {isRecommending ? '分析中...' : '搭配建议'}
                    </button>
                </div>

                {recommendation && (
                    <div className="p-4 bg-primary/5 border-l-2 border-primary rounded-r-xl animate-fade-in">
                        <p className="text-sm text-white/90 leading-relaxed font-body italic">
                            “{recommendation}”
                        </p>
                    </div>
                )}
            </div>
        </section>

        {/* 库存列表 */}
        <section className="space-y-4">
            <h3 className="text-xs font-bold text-muted uppercase tracking-widest px-1">当前库存 ({stock.reduce((a,b)=>a+b.count,0)})</h3>
            <div className="grid gap-3">
                {stock.length === 0 && (
                    <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-3xl text-muted text-xs uppercase tracking-widest">
                        空空如也，点击右上角添加
                    </div>
                )}
                {stock.map(film => (
                    <div key={film.id} className="bg-surface-dark border border-white/5 p-4 rounded-2xl flex items-center gap-4 group relative overflow-hidden transition-all hover:border-white/20">
                        {isExpired(film.expiryDate) && (
                            <div className="absolute inset-0 bg-red-600/5 pointer-events-none animate-pulse"></div>
                        )}
                        
                        <div className={`size-14 rounded-xl flex flex-col items-center justify-center font-mono shrink-0 shadow-inner ${
                            isExpired(film.expiryDate) ? 'bg-red-900/40 text-red-500' : 'bg-primary/10 text-primary'
                        }`}>
                            <span className="text-[10px] font-bold opacity-60">ISO</span>
                            <span className="text-xl font-black">{film.iso}</span>
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-bold text-muted uppercase tracking-tighter truncate">{film.brand}</div>
                            <div className="text-lg font-black uppercase truncate text-white">{film.name}</div>
                            <div className={`text-[9px] font-bold uppercase mt-1 flex items-center gap-1.5 ${
                                isExpired(film.expiryDate) ? 'text-red-500' : 
                                isExpiringSoon(film.expiryDate) ? 'text-yellow-500' : 'text-green-500/60'
                            }`}>
                                <span className="material-symbols-outlined text-sm">
                                    {isExpired(film.expiryDate) ? 'event_busy' : 'event'}
                                </span>
                                {film.expiryDate} 
                                {isExpired(film.expiryDate) ? ' (已过期)' : isExpiringSoon(film.expiryDate) ? ' (即将过期)' : ''}
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                            <div className="text-2xl font-black font-mono text-white/40">×{film.count}</div>
                            <button onClick={() => deleteFilm(film.id)} className="size-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </section>
      </main>

      {/* 添加表单弹窗 */}
      {showAddForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-fade-in">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowAddForm(false)}></div>
              <form onSubmit={handleAddFilm} className="relative w-full max-w-sm bg-surface-dark border border-white/10 p-8 rounded-[2.5rem] space-y-6 shadow-2xl">
                  <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">add_box</span>
                      录入库存
                  </h3>
                  
                  <div className="space-y-4">
                      <div>
                          <label className="text-[9px] uppercase tracking-widest text-muted ml-1 mb-1 block">品牌与型号</label>
                          <div className="grid grid-cols-2 gap-2">
                            <input type="text" placeholder="Kodak" required value={newFilm.brand} onChange={e=>setNewFilm({...newFilm, brand: e.target.value})} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-primary focus:outline-none transition-colors" />
                            <input type="text" placeholder="Gold 200" required value={newFilm.name} onChange={e=>setNewFilm({...newFilm, name: e.target.value})} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-primary focus:outline-none transition-colors" />
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[9px] uppercase tracking-widest text-muted ml-1 mb-1 block">ISO</label>
                            <input type="number" required value={newFilm.iso} onChange={e=>setNewFilm({...newFilm, iso: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono focus:border-primary focus:outline-none" />
                          </div>
                          <div>
                            <label className="text-[9px] uppercase tracking-widest text-muted ml-1 mb-1 block">画幅</label>
                            <select value={newFilm.format} onChange={e=>setNewFilm({...newFilm, format: e.target.value as any})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-primary focus:outline-none">
                                <option value="135">135 (35mm)</option>
                                <option value="120">120 (Medium)</option>
                                <option value="Large">Large Format</option>
                            </select>
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[9px] uppercase tracking-widest text-muted ml-1 mb-1 block">数量</label>
                            <input type="number" required value={newFilm.count} onChange={e=>setNewFilm({...newFilm, count: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono focus:border-primary focus:outline-none" />
                          </div>
                          <div>
                            <label className="text-[9px] uppercase tracking-widest text-muted ml-1 mb-1 block">有效期</label>
                            <input type="date" required value={newFilm.expiryDate} onChange={e=>setNewFilm({...newFilm, expiryDate: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-mono focus:border-primary focus:outline-none" />
                          </div>
                      </div>
                  </div>

                  <div className="flex gap-3">
                      <button type="button" onClick={() => setShowAddForm(false)} className="flex-1 py-4 bg-white/5 rounded-2xl text-xs font-bold uppercase tracking-widest active:scale-95 transition-all">取消</button>
                      <button type="submit" className="flex-1 py-4 bg-primary text-white rounded-2xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-primary/20">保存</button>
                  </div>
              </form>
          </div>
      )}
    </div>
  );
};
