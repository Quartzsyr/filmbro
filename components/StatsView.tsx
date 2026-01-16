

import React from 'react';
import { Roll, RollStatus } from '../types';

interface StatsViewProps {
  rolls: Roll[];
}

export const StatsView: React.FC<StatsViewProps> = ({ rolls }) => {
  const totalPhotos = rolls.reduce((sum, r) => sum + r.framesTaken, 0);
  // Fix: changed .count to .length for the array
  const developedCount = rolls.filter(r => r.status === RollStatus.DEVELOPED).length;
  
  const filmTypes = rolls.reduce((acc, r) => {
    acc[r.brand] = (acc[r.brand] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-6 pt-12 space-y-8 animate-fade-in max-w-2xl mx-auto pb-32">
      <header>
        <span className="text-[10px] font-mono text-primary font-bold tracking-widest uppercase">Analytics</span>
        <h2 className="text-4xl font-display font-black tracking-tight mt-1">摄影统计</h2>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface-dark border border-white/5 p-5 rounded-2xl">
          <div className="text-muted text-[10px] uppercase font-bold tracking-widest">总计照片</div>
          <div className="text-4xl font-display font-black mt-2">{totalPhotos}</div>
          <div className="text-[10px] text-primary mt-1 font-mono">Capture count</div>
        </div>
        <div className="bg-surface-dark border border-white/5 p-5 rounded-2xl">
          <div className="text-muted text-[10px] uppercase font-bold tracking-widest">平均 ISO</div>
          <div className="text-4xl font-display font-black mt-2">
            {rolls.length ? Math.round(rolls.reduce((s, r) => s + r.iso, 0) / rolls.length) : 0}
          </div>
          <div className="text-[10px] text-primary mt-1 font-mono">Sensitivity index</div>
        </div>
      </div>

      <section className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted">胶卷品牌分布</h3>
        <div className="space-y-3">
          {Object.entries(filmTypes).map(([brand, count]) => (
            <div key={brand} className="space-y-1">
              <div className="flex justify-between text-xs font-mono uppercase">
                <span>{brand}</span>
                <span className="text-primary">{count} 卷</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary" 
                  // Fixed: casting count to number to resolve type error in arithmetic operation
                  style={{ width: `${((count as number) / rolls.length) * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-primary/5 border border-primary/20 p-6 rounded-2xl flex items-center gap-6">
        <div className="size-16 rounded-full border-4 border-primary/30 flex items-center justify-center shrink-0">
           <span className="material-symbols-outlined text-primary text-3xl">workspace_premium</span>
        </div>
        <div>
          <h4 className="text-lg font-bold">摄影达人</h4>
          <p className="text-xs text-muted leading-relaxed">基于你的拍摄频率，你本月的创作活跃度超过了 85% 的胶片爱好者。</p>
        </div>
      </section>
    </div>
  );
};