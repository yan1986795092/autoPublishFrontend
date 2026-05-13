import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { aiEditApi } from '../../services/api';
import { cn } from '../../utils/helpers';
import { Search, Loader2, Plus, Hash, Sparkles, TrendingUp } from 'lucide-react';

interface Props {
  onSelectKeyword?: (keyword: string) => void;
  className?: string;
}

export function KeywordResearch({ onSelectKeyword, className }: Props) {
  const [seed, setSeed] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleExpand = async () => {
    if (!seed.trim()) return;
    setLoading(true);
    try {
      const res = await aiEditApi.expandKeywords(seed);
      if (res.data.success && res.data.data) {
        setKeywords(res.data.data.keywords);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn('rounded-xl bg-app-surface border border-white/[0.04] overflow-hidden', className)}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3.5 py-2.5 hover:bg-white/[0.02] transition-colors"
      >
        <Search className="w-3.5 h-3.5 text-primary-400" />
        <span className="text-[11px] font-semibold text-app-text">长尾关键词研究</span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-3.5 pb-3.5 space-y-2.5"
          >
            {/* Seed input */}
            <div className="flex gap-1.5">
              <input
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                placeholder="输入核心关键词，如：护肤"
                className="flex-1 rounded-lg border border-app-border bg-app-surface text-[10px] text-app-text placeholder:text-app-text-tertiary px-2.5 py-1.5 focus:outline-none focus:border-primary-500/50"
                onKeyDown={(e) => e.key === 'Enter' && handleExpand()}
              />
              <button
                onClick={handleExpand}
                disabled={loading || !seed.trim()}
                className="px-2.5 py-1.5 rounded-lg bg-primary-600/20 border border-primary-500/30 text-primary-400 text-[10px] font-medium hover:bg-primary-600/30 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                {loading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
                扩展
              </button>
            </div>

            {/* Results */}
            {keywords.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-[9px] text-app-text-tertiary">
                  <TrendingUp className="w-2.5 h-2.5" />
                  推荐长尾关键词（按热度排序）
                </div>
                <div className="flex flex-wrap gap-1">
                  {keywords.map((kw, i) => (
                    <motion.button
                      key={`${kw}-${i}`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => onSelectKeyword?.(kw)}
                      className="group flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-primary-600/15 hover:border-primary-500/30 transition-all"
                    >
                      <Hash className="w-2.5 h-2.5 text-app-text-tertiary group-hover:text-primary-400" />
                      <span className="text-[10px] text-app-text-secondary group-hover:text-primary-400">{kw}</span>
                      <Plus className="w-2.5 h-2.5 text-app-text-tertiary opacity-0 group-hover:opacity-100 group-hover:text-primary-400 transition-opacity" />
                    </motion.button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
