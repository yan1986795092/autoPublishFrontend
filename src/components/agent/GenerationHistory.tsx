import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../utils/helpers';
import { getAgentLabel } from '../../config/agents';
import type { PreviousGeneration } from '../../types';
import {
  History, FileText, ChevronDown, Eye, RotateCcw,
  CheckSquare, Square as SquareIcon, X,
} from 'lucide-react';

interface GenerationHistoryProps {
  generations: PreviousGeneration[];
  onRestore?: (gen: PreviousGeneration) => void;
  maxDisplay?: number;
}

export function GenerationHistory({ generations, onRestore, maxDisplay = 20 }: GenerationHistoryProps) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const displayed = [...generations].reverse().slice(0, maxDisplay);

  const handleRestore = (gen: PreviousGeneration) => {
    if (onRestore) {
      onRestore(gen);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      if (next.size >= 2) {
        const first = next.values().next().value;
        if (first) next.delete(first);
      }
      next.add(id);
    }
    setSelectedIds(next);
  };

  const selectedGens = [...selectedIds].map((id) => generations.find((g) => g.id === id)).filter(Boolean) as PreviousGeneration[];

  if (displayed.length === 0) return null;

  return (
    <div className="pt-3 border-t border-app-border/50">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <History className="w-3.5 h-3.5 text-app-text-secondary" />
          <span className="text-[11px] font-semibold text-app-text-secondary">历史生成记录</span>
          <span className="text-[10px] text-app-text-tertiary">{generations.length}</span>
        </div>
        {displayed.length >= 2 && (
          <button
            onClick={() => { setCompareMode(!compareMode); setSelectedIds(new Set()); }}
            className={cn(
              'text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors',
              compareMode ? 'text-blue-400 bg-blue-500/10' : 'text-app-text-tertiary hover:text-app-text-secondary'
            )}
          >
            {compareMode ? <X className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {compareMode ? '退出对比' : '对比'}
          </button>
        )}
      </div>

      {/* Compare view */}
      {compareMode && selectedGens.length === 2 && (
        <div className="mb-3 grid grid-cols-2 gap-2 rounded-lg border border-app-border bg-app-surface p-2">
          {selectedGens.map((gen, i) => (
            <div key={gen.id} className="text-[10px]">
              <p className="font-medium text-app-text truncate mb-1">#{i + 1}</p>
              <p className="text-app-text-tertiary line-clamp-3 mb-1">{gen.prompt}</p>
              <p className="text-app-text-secondary">
                {gen.result?.output?.full_text
                  ? `${(gen.result.output.full_text as string).slice(0, 100)}...`
                  : '无内容'}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* List */}
      <div className="space-y-1">
        {displayed.map((gen) => {
          const output = gen.result?.output;
          const title = (output?.title as string) ||
            ((output?.full_text as string)?.slice(0, 60)) ||
            gen.prompt.slice(0, 60);
          const isExpanded = expanded === gen.id;
          const isSelected = selectedIds.has(gen.id);

          return (
            <div key={gen.id}>
              <button
                onClick={() => {
                  if (compareMode) {
                    toggleSelect(gen.id);
                  } else {
                    setExpanded(isExpanded ? null : gen.id);
                  }
                }}
                className={cn(
                  'w-full rounded-lg border border-app-border/60 bg-app-elevated/50 px-2.5 py-2 text-left transition-all hover:border-blue-500/30 group',
                  isSelected && 'border-blue-500/50 bg-blue-500/5'
                )}
              >
                <div className="flex items-center gap-2">
                  {compareMode ? (
                    isSelected ? (
                      <CheckSquare className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                    ) : (
                      <SquareIcon className="w-3.5 h-3.5 text-app-text-tertiary flex-shrink-0" />
                    )
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-app-text-tertiary flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-app-text truncate">{title}</p>
                    <p className="text-[10px] text-app-text-tertiary truncate">{gen.prompt}</p>
                  </div>
                  <span className="text-[9px] text-app-text-tertiary flex-shrink-0">
                    {new Date(gen.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {!compareMode && (
                    <ChevronDown className={cn(
                      'w-3 h-3 text-app-text-tertiary transition-transform flex-shrink-0',
                      isExpanded && 'rotate-180'
                    )} />
                  )}
                </div>
              </button>

              <AnimatePresence>
                {isExpanded && !compareMode && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="ml-5 pl-2 border-l border-app-border/30 mt-0.5 space-y-1 pb-1">
                      {gen.plan && (
                        <p className="text-[10px] text-app-text-tertiary">
                          计划: {gen.plan.goal?.slice(0, 80)}
                          <span className="ml-1">({gen.plan.tasks.length} 步)</span>
                        </p>
                      )}
                      {gen.result?.usage && (
                        <p className="text-[10px] text-app-text-tertiary">
                          Token: {gen.result.usage.tokens_used} | 耗时: {gen.result.usage.time_elapsed.toFixed(1)}s
                        </p>
                      )}
                      {gen.result?.thinking_trace?.steps && (
                        <div className="flex flex-wrap gap-1">
                          {gen.result.thinking_trace.steps.map((s, i) => (
                            <span key={i} className="text-[9px] px-1 py-0.5 rounded bg-app-border/30 text-app-text-tertiary">
                              {getAgentLabel(s.agent)}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2 pt-0.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRestore(gen); }}
                          className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-0.5"
                        >
                          <RotateCcw className="w-2.5 h-2.5" /> 恢复
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/agent?taskId=${gen.result?.task_id}`); }}
                          className="text-[10px] text-app-text-tertiary hover:text-app-text-secondary"
                        >
                          查看详情
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
