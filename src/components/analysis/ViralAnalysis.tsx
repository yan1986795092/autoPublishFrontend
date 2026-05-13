import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { aiEditApi } from '../../services/api';
import { cn } from '../../utils/helpers';
import { Flame, TrendingUp, Loader2, Sparkles, Zap, Target, MessageCircle, Share2, CheckCircle, AlertTriangle, Lightbulb, BarChart3 } from 'lucide-react';

interface ViralScore {
  overall: number;
  topic_heat: number;
  headline_appeal: number;
  content_quality: number;
  engagement_potential: number;
  share_potential: number;
  strengths: string[];
  weaknesses: string[];
  tips: string[];
}

function ScoreBar({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  const color = value >= 80 ? 'from-emerald-500 to-green-500' : value >= 60 ? 'from-amber-500 to-orange-500' : 'from-red-500 to-rose-500';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-app-text-tertiary">{icon}</span>
          <span className="text-[10px] text-app-text-secondary">{label}</span>
        </div>
        <span className={cn('text-[10px] font-bold', value >= 80 ? 'text-green-400' : value >= 60 ? 'text-amber-400' : 'text-red-400')}>
          {value}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={cn('h-full rounded-full bg-gradient-to-r', color)}
        />
      </div>
    </div>
  );
}

export function ViralAnalysis({ text, className }: { text: string; className?: string }) {
  const [score, setScore] = useState<ViralScore | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await aiEditApi.analyzeViral(text);
      if (res.data.success && res.data.data) {
        setScore(res.data.data as ViralScore);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const overallColor = score
    ? score.overall >= 80 ? 'text-green-400' : score.overall >= 60 ? 'text-amber-400' : 'text-red-400'
    : 'text-app-text-tertiary';

  return (
    <div className={cn('rounded-xl bg-app-surface border border-white/[0.04] overflow-hidden', className)}>
      {/* Header */}
      <button
        onClick={handleAnalyze}
        disabled={loading || !text.trim()}
        className="w-full flex items-center gap-2 px-3.5 py-2.5 hover:bg-white/[0.02] transition-colors disabled:opacity-50"
      >
        <Flame className="w-3.5 h-3.5 text-orange-400" />
        <span className="text-[11px] font-semibold text-app-text">爆款分析</span>
        {loading ? (
          <Loader2 className="w-3 h-3 animate-spin text-app-text-tertiary ml-auto" />
        ) : (
          <Sparkles className="w-3 h-3 text-app-text-tertiary ml-auto" />
        )}
      </button>

      <AnimatePresence>
        {score && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-3.5 pb-3.5 space-y-3"
          >
            {/* Overall score */}
            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.03]">
              <div className={cn('text-2xl font-bold', overallColor)}>{score.overall}</div>
              <div className="flex-1">
                <div className="text-[10px] text-app-text-tertiary">综合爆款指数</div>
                <div className="text-[10px] text-app-text-secondary">
                  {score.overall >= 80 ? '爆款潜力高，推荐发布！' : score.overall >= 60 ? '具有一定爆款潜力，建议优化后发布' : '爆款潜力较低，建议重新构思'}
                </div>
              </div>
            </div>

            {/* Score bars */}
            <div className="space-y-2">
              <ScoreBar label="话题热度" value={score.topic_heat} icon={<TrendingUp className="w-3 h-3" />} />
              <ScoreBar label="标题吸引力" value={score.headline_appeal} icon={<Target className="w-3 h-3" />} />
              <ScoreBar label="内容质量" value={score.content_quality} icon={<BarChart3 className="w-3 h-3" />} />
              <ScoreBar label="互动潜力" value={score.engagement_potential} icon={<MessageCircle className="w-3 h-3" />} />
              <ScoreBar label="传播潜力" value={score.share_potential} icon={<Share2 className="w-3 h-3" />} />
            </div>

            {/* Strengths */}
            {score.strengths.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-[9px] text-green-400 font-medium">
                  <CheckCircle className="w-3 h-3" />
                  内容优势
                </div>
                <ul className="space-y-0.5">
                  {score.strengths.map((s, i) => (
                    <li key={i} className="text-[10px] text-app-text-secondary flex items-start gap-1.5">
                      <span className="text-green-400/60 mt-0.5">●</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Weaknesses */}
            {score.weaknesses.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-[9px] text-amber-400 font-medium">
                  <AlertTriangle className="w-3 h-3" />
                  潜在不足
                </div>
                <ul className="space-y-0.5">
                  {score.weaknesses.map((w, i) => (
                    <li key={i} className="text-[10px] text-app-text-secondary flex items-start gap-1.5">
                      <span className="text-amber-400/60 mt-0.5">●</span>
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tips */}
            {score.tips.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-[9px] text-blue-400 font-medium">
                  <Lightbulb className="w-3 h-3" />
                  优化建议
                </div>
                <ul className="space-y-0.5">
                  {score.tips.map((t, i) => (
                    <li key={i} className="text-[10px] text-app-text-secondary flex items-start gap-1.5">
                      <Zap className="w-2.5 h-2.5 text-blue-400/60 mt-0.5 flex-shrink-0" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
