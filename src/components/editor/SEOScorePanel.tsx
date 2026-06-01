import { useState, useRef, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import { useEditorStore } from '../../stores/useEditorStore';
import { aiEditApi } from '../../services/api';
import { cn } from '../../utils/helpers';
import { BarChart3, Loader2, ChevronDown, ChevronUp, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SEOScore } from '../../types';

interface Props {
  editor: Editor;
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  const barColor = value >= 80 ? 'bg-green-500' : value >= 60 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] text-app-text-tertiary w-20 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={cn('h-full rounded-full', barColor)}
        />
      </div>
      <span className={cn('text-[10px] font-mono w-7 text-right', color)}>{value}</span>
    </div>
  );
}

export function SEOScorePanel({ editor }: Props) {
  const { activePlatform } = useEditorStore();
  const [score, setScore] = useState<SEOScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchScore = async (text: string) => {
    if (!text.trim() || text.length < 20) {
      setScore(null);
      return;
    }
    setLoading(true);
    try {
      const res = await aiEditApi.analyzeSeo(text, activePlatform);
      const data = res.data.data;
      if (data) {
        setScore(data as SEOScore);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  // Debounced auto-check on editor changes
  useEffect(() => {
    const handleUpdate = () => {
      if (timerRef.current != null) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        fetchScore(editor.state.doc.textContent);
      }, 1500);
    };

    editor.on('update', handleUpdate);
    return () => {
      editor.off('update', handleUpdate);
      if (timerRef.current != null) clearTimeout(timerRef.current);
    };
  }, [editor, activePlatform]);

  const overall = score?.overall ?? 0;
  const overallColor = overall >= 80 ? 'text-green-400' : overall >= 60 ? 'text-amber-400' : 'text-red-400';

  const suggestionIcon = (type: string) => {
    switch (type) {
      case 'error': return <AlertCircle className="w-2.5 h-2.5 text-red-400" />;
      case 'warning': return <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />;
      default: return <Info className="w-2.5 h-2.5 text-blue-400" />;
    }
  };

  return (
    <div className="border-t border-white/[0.04]">
      {/* Toggle header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-2 px-4 py-2 hover:bg-white/[0.02] transition-colors"
      >
        <BarChart3 className={cn('w-3 h-3', overall >= 80 ? 'text-green-400' : overall >= 60 ? 'text-amber-400' : 'text-app-text-tertiary')} />
        <span className="text-[10px] font-medium text-app-text-secondary">SEO 评分</span>
        {loading && <Loader2 className="w-2.5 h-2.5 animate-spin text-app-text-tertiary ml-auto" />}
        {!loading && score && (
          <span className={cn('text-[10px] font-bold font-mono ml-auto', overallColor)}>{overall}</span>
        )}
        {!loading && !score && (
          <span className="text-[9px] text-app-text-tertiary ml-auto">输入内容后自动分析</span>
        )}
        {collapsed ? <ChevronDown className="w-3 h-3 text-app-text-tertiary ml-1" /> : <ChevronUp className="w-3 h-3 text-app-text-tertiary ml-1" />}
      </button>

      {/* Score details */}
      <AnimatePresence>
        {!collapsed && score && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-2">
              <ScoreBar label="标题吸引力" value={score.title_score} color={overallColor} />
              <ScoreBar label="关键词密度" value={score.keyword_score} color={overallColor} />
              <ScoreBar label="可读性" value={score.readability_score} color={overallColor} />
              <ScoreBar label="互动潜力" value={score.engagement_score} color={overallColor} />

              {score.suggestions.length > 0 && (
                <div className="mt-2 pt-2 border-t border-white/[0.04] space-y-1">
                  {score.suggestions.map((s, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      {suggestionIcon(s.type)}
                      <span className="text-[9px] text-app-text-tertiary">{s.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
