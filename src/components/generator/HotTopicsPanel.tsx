import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { platformsApi } from '../../services/api';
import type { HotTopic } from '../../types';
import { cn } from '../../utils/helpers';
import { Flame, TrendingUp, TrendingDown, Minus, Loader2, Sparkles } from 'lucide-react';

const PLATFORMS = [
  { code: 'xiaohongshu', name: '小红书', emoji: '🎨', gradient: 'from-pink-500 to-rose-500' },
  { code: 'wechat', name: '公众号', emoji: '📱', gradient: 'from-green-500 to-emerald-500' },
];

interface Props {
  onSelectTopic: (topic: string) => void;
}

export function HotTopicsPanel({ onSelectTopic }: Props) {
  const [activePlatform, setActivePlatform] = useState('xiaohongshu');
  const [topics, setTopics] = useState<Record<string, HotTopic[]>>({});
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await platformsApi.hotTopics();
        const data = res.data.data;
        if (data) {
          setTopics(data.platforms);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const currentTopics = topics[activePlatform] || [];

  const TrendIcon = ({ trend }: { trend: string }) => {
    if (trend === 'up') return <TrendingUp className="w-2.5 h-2.5 text-green-400" />;
    if (trend === 'down') return <TrendingDown className="w-2.5 h-2.5 text-red-400" />;
    return <Minus className="w-2.5 h-2.5 text-app-text-tertiary" />;
  };

  return (
    <div className="rounded-xl bg-app-surface border border-white/[0.04] overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-2 px-3.5 py-2.5 hover:bg-white/[0.02] transition-colors"
      >
        <Flame className="w-3.5 h-3.5 text-orange-400" />
        <span className="text-[11px] font-semibold text-app-text">热门话题</span>
        {loading && <Loader2 className="w-3 h-3 animate-spin text-app-text-tertiary ml-auto" />}
      </button>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {/* Platform tabs */}
            <div className="flex gap-1 px-3 pb-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p.code}
                  onClick={() => setActivePlatform(p.code)}
                  className={cn(
                    'flex-1 text-[10px] py-1.5 rounded-lg font-medium transition-all',
                    activePlatform === p.code
                      ? `bg-gradient-to-br ${p.gradient} text-white`
                      : 'text-app-text-tertiary hover:text-app-text-secondary bg-white/[0.03]'
                  )}
                >
                  {p.emoji} {p.name}
                </button>
              ))}
            </div>

            {/* Topic list */}
            <div className="px-3 pb-3 space-y-1 max-h-[320px] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-4 h-4 animate-spin text-app-text-tertiary" />
                </div>
              ) : (
                currentTopics.map((topic, i) => (
                  <motion.button
                    key={`${topic.title}-${i}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => onSelectTopic(topic.title)}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/[0.04] transition-colors text-left group"
                  >
                    <span className={cn(
                      'text-[9px] font-mono w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5',
                      i === 0 ? 'bg-orange-500/20 text-orange-400' :
                      i === 1 ? 'bg-amber-500/15 text-amber-400' :
                      i === 2 ? 'bg-yellow-500/10 text-yellow-400' :
                      'bg-white/[0.04] text-app-text-tertiary'
                    )}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-app-text truncate">{topic.title}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] px-1 py-0.5 rounded bg-white/[0.04] text-app-text-tertiary">
                          {topic.category}
                        </span>
                        <span className="text-[9px] text-app-text-tertiary">{topic.heat_formatted}</span>
                        <TrendIcon trend={topic.trend} />
                      </div>
                    </div>
                    <Sparkles className="w-3 h-3 text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </motion.button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
