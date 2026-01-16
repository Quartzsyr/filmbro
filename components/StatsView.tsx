
import React, { useState, useEffect } from 'react';
import { Roll, RollStatus, StockFilm } from '../types';
import { analyzeStats } from '../services/geminiService';

interface StatsViewProps {
  rolls: Roll[];
  stock: StockFilm[];
}

export const StatsView: React.FC<StatsViewProps> = ({ rolls, stock }) => {
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // 基础数据计算
  const totalPhotos = rolls.reduce((sum, r) => sum + r.framesTaken, 0);
  const totalRolls = rolls.length;
  
  // 品牌分布
  const brandStats = rolls.reduce((acc, r) => {
    acc[r.brand] = (acc[r.brand] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // 相机偏好
  const cameraStats = rolls.reduce((acc, r) => {
    acc[r.camera] = (acc[r.camera] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // ISO 分布
  const isoStats = rolls.reduce((acc, r) => {
    const range = r.iso <= 100 ? 'Low (≤100)' : r.iso <= 400 ? 'Mid (200-400)' : 'High (800+)';
    acc[range] = (acc[range] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleGenerateReport = async () => {
    if (totalRolls === 0) return;
    setIsAnalyzing(true);
    try {
      const summary = `总共拍摄了${totalRolls}卷胶卷，共${totalPhotos}张照片。最常用的相机是${Object.keys(cameraStats)[0] || '未知'}，最偏好的胶片品牌是${Object.keys(brandStats)[0] || '未知'}。ISO偏好为：${JSON.stringify(isoStats)}。`;
      const report = await analyzeStats(summary);
      setAiReport(report);
    } catch (e: any) {
      console.error("AI Analysis failed", e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSortedEntries = (stats: Record<string, number>) => 
    Object.entries(stats).sort((a, b) => b[1] - a[1]);

  return (
    <div className="p-6 pt-[calc(env(safe-area-inset-top)+3rem)] space-y-10 animate-fade-in max-w-2xl mx-auto pb-32 no-scrollbar">
      <header className="flex justify-between items-end">
        <div>
          <span className="text-[10px] font-mono text-primary font-black tracking-[0.4em] uppercase">Laboratory Analytics</span>
          <h2 className="text-4xl font-display font-black tracking-tight mt-1">数据洞察</h2>
        </div>
        <div className="text-right">
           <div className="text-[10px] text-muted font-bold uppercase tracking-widest">系统版本</div>
           <div className="text-xs font-mono font-bold text-white/40">V2.5.0-ALPHA</div>
        </div>
      </header>

      {/* AI Report Card */}
      <section className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/50 to-orange-500/50 rounded-3xl blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
          <div className="relative bg-[#111] border border-white/5 rounded-3xl p-6 overflow-hidden">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div className="size-8 bg-primary/20 rounded-lg flex items-center justify-center">
                        <span className={`material-symbols-outlined text-primary text-sm ${isAnalyzing ? 'animate-spin' : ''}`}>auto_awesome</span>
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-widest">AI 摄影导师报告</h3>
                </div>
                {!aiReport && (
                    <button 
                        onClick={handleGenerateReport}
                        disabled={isAnalyzing}
                        className="text-[10px] font-black text-primary uppercase tracking-widest px-3 py-1.5 border border-primary/30 rounded-full hover:bg-primary/10 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isAnalyzing ? '生成中...' : '生成分析'}
                    </button>
                )}
              </div>

              {aiReport ? (
                  <div className="space-y-4 animate-fade-in">
                      <p className="text-sm leading-relaxed text-white/80 font-body whitespace-pre-wrap italic">
                          {aiReport}
                      </p>
                      <button onClick={() => setAiReport(null)} className="text-[10px] font-bold text-muted uppercase tracking-widest hover:text-white">重新生成</button>
                  </div>
              ) : (
                  <div className="py-8 text-center border-2 border-dashed border-white/5 rounded-2xl">
                      <p className="text-[10px] text-muted uppercase tracking-widest">点击按钮开始 AI 风格诊断</p>
                  </div>
              )}
          </div>
      </section>

      {/* Grid Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface-dark border border-white/5 p-6 rounded-3xl group hover:border-primary/20 transition-colors">
          <div className="text-muted text-[10px] uppercase font-bold tracking-widest">曝光总数</div>
          <div className="text-5xl font-display font-black mt-2 text-white tabular-nums">{totalPhotos}</div>
          <div className="text-[10px] text-primary mt-2 font-mono flex items-center gap-1">
             <span className="material-symbols-outlined text-[12px]">camera_roll</span>
             TOTAL FRAMES
          </div>
        </div>
        <div className="bg-surface-dark border border-white/5 p-6 rounded-3xl group hover:border-primary/20 transition-colors">
          <div className="text-muted text-[10px] uppercase font-bold tracking-widest">拍摄频率</div>
          <div className="text-5xl font-display font-black mt-2 text-white tabular-nums">
            {totalRolls > 0 ? (totalPhotos / Math.max(1, totalRolls)).toFixed(1) : 0}
          </div>
          <div className="text-[10px] text-primary mt-2 font-mono flex items-center gap-1">
             <span className="material-symbols-outlined text-[12px]">speed</span>
             AVG / ROLL
          </div>
        </div>
      </div>

      {/* Distribution Charts */}
      <section className="space-y-8">
          {/* Brand Distribution */}
          <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">branding_watermark</span>
                  胶片品牌偏好
              </h3>
              <div className="bg-surface-dark border border-white/5 p-6 rounded-3xl space-y-4">
                {getSortedEntries(brandStats).slice(0, 4).map(([brand, count]) => (
                    <div key={brand} className="space-y-2">
                        <div className="flex justify-between text-[11px] font-black uppercase">
                            <span className="text-white/70">{brand}</span>
                            <span className="text-primary font-mono">{count} 卷</span>
                        </div>
                        <div className="h-1.5 w-full bg-black rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-primary to-orange-500 rounded-full transition-all duration-1000" 
                                style={{ width: `${(count / totalRolls) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                ))}
                {totalRolls === 0 && <p className="text-center py-4 text-[10px] text-muted uppercase">暂无数据</p>}
              </div>
          </div>

          {/* Camera Preference */}
          <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">photo_camera</span>
                  主力机型频率
              </h3>
              <div className="grid grid-cols-1 gap-3">
                 {getSortedEntries(cameraStats).slice(0, 3).map(([camera, count], idx) => (
                     <div key={camera} className="flex items-center justify-between p-4 bg-surface-dark border border-white/5 rounded-2xl group hover:bg-white/5 transition-all">
                        <div className="flex items-center gap-4">
                            <div className="size-10 rounded-xl bg-black flex items-center justify-center text-primary font-black text-xs border border-white/5">
                                0{idx + 1}
                            </div>
                            <div className="text-xs font-bold uppercase tracking-wider text-white/90">{camera}</div>
                        </div>
                        <div className="text-[10px] font-mono text-muted uppercase">{count} 次任务</div>
                     </div>
                 ))}
              </div>
          </div>

          {/* ISO Profile */}
          <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">tonality</span>
                  光影敏感度 (ISO)
              </h3>
              <div className="bg-surface-dark border border-white/5 p-6 rounded-3xl flex items-end justify-around h-32">
                {['Low (≤100)', 'Mid (200-400)', 'High (800+)'].map(range => {
                    const count = isoStats[range] || 0;
                    const height = totalRolls > 0 ? (count / totalRolls) * 100 : 0;
                    return (
                        <div key={range} className="flex flex-col items-center gap-3 h-full justify-end group">
                            <div className="relative w-12 flex flex-col justify-end h-full">
                                <div 
                                    className="w-full bg-primary/20 border-t-2 border-primary rounded-t-sm transition-all duration-1000 group-hover:bg-primary/40" 
                                    style={{ height: `${Math.max(4, height)}%` }}
                                ></div>
                                {count > 0 && <div className="absolute -top-5 left-0 right-0 text-center text-[10px] font-mono font-bold text-primary">{count}</div>}
                            </div>
                            <div className="text-[9px] font-bold uppercase text-muted tracking-tighter w-16 text-center">{range}</div>
                        </div>
                    );
                })}
              </div>
          </div>

          {/* Storage Alert */}
          {stock.some(f => {
              const d = new Date(f.expiryDate);
              const now = new Date();
              return (d.getTime() - now.getTime()) < 1000 * 60 * 60 * 24 * 60; // 2 months
          }) && (
              <div className="p-5 bg-red-600/5 border border-red-500/20 rounded-3xl flex items-center gap-4 animate-pulse">
                <span className="material-symbols-outlined text-red-500">warning</span>
                <div>
                    <h4 className="text-xs font-bold text-red-500 uppercase">库存预警</h4>
                    <p className="text-[10px] text-red-500/70 mt-1 uppercase tracking-wider">你的胶片冰箱中有胶卷即将在两个月内到期，请优先使用。</p>
                </div>
              </div>
          )}
      </section>

      <footer className="pt-10 flex flex-col items-center">
          <div className="size-px w-20 bg-white/10 mb-6"></div>
          <p className="text-[9px] text-muted uppercase tracking-[0.4em] font-black">Powered by Digital Emulsion System</p>
      </footer>
    </div>
  );
};
