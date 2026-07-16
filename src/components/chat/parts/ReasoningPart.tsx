import React, { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../utils/helpers';
import { formatDurationPrecise } from '../../../utils/format';
import type { ReasoningPart as ReasoningPartType } from './types';

interface ReasoningPartProps {
  part: ReasoningPartType;
}

/** 根据 Agent 类型获取样式配置 */
function getReasoningConfig(agent: string | undefined) {
  const configs: Record<string, { icon: string; label: string; bgColor: string; borderColor: string; textColor: string }> = {
    // 规划推理：蓝色系
    ManagerAgent: {
      icon: '📋',
      label: '执行计划',
      bgColor: 'bg-blue-500/5',
      borderColor: 'border-blue-500/20',
      textColor: 'text-blue-400',
    },
    // 搜索分析推理：绿色系
    SearchAnalyzer: {
      icon: '🔍',
      label: '搜索分析',
      bgColor: 'bg-green-500/5',
      borderColor: 'border-green-500/20',
      textColor: 'text-green-400',
    },
    AnalysisAgent: {
      icon: '📊',
      label: '分析过程',
      bgColor: 'bg-green-500/5',
      borderColor: 'border-green-500/20',
      textColor: 'text-green-400',
    },
    // 写作推理：紫色系
    WritingAgent: {
      icon: '✍️',
      label: '创作思路',
      bgColor: 'bg-purple-500/5',
      borderColor: 'border-purple-500/20',
      textColor: 'text-purple-400',
    },
    // 审核推理：橙色系
    ReviewAgent: {
      icon: '🔍',
      label: '审核意见',
      bgColor: 'bg-orange-500/5',
      borderColor: 'border-orange-500/20',
      textColor: 'text-orange-400',
    },
    // 修正推理：红色系
    FixAgent: {
      icon: '🔧',
      label: '修正过程',
      bgColor: 'bg-red-500/5',
      borderColor: 'border-red-500/20',
      textColor: 'text-red-400',
    },
    // 默认推理：灰色系
    default: {
      icon: '💭',
      label: '思考过程',
      bgColor: 'bg-app-surface/30',
      borderColor: 'border-app-border/30',
      textColor: 'text-app-text-secondary',
    },
  };
  return configs[agent || ''] || configs.default;
}

function ReasoningPartInner({ part }: ReasoningPartProps) {
  const [expanded, setExpanded] = useState(!part.collapsed_by_default);

  const duration = part.duration_ms != null
    ? formatDurationPrecise(part.duration_ms / 1000)
    : null;

  const config = getReasoningConfig(part.agent);
  const summarySuffix = duration ? ` · ${duration}` : '';

  return (
    <div className="my-2">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-app-text-secondary hover:text-app-text transition-colors"
      >
        <span className={config.textColor}>{config.icon}</span>
        <span className={cn('font-medium', config.textColor)}>{config.label}</span>
        {duration && (
          <span className="text-app-text-tertiary">{summarySuffix}</span>
        )}
        <span className={cn(
          'text-app-text-tertiary/60 transition-transform duration-200',
          expanded && 'rotate-180',
        )}>
          ▼
        </span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="reasoning-content"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className={cn(
              'mt-2 px-3 py-2.5 rounded-lg text-xs',
              'whitespace-pre-wrap leading-relaxed',
              config.bgColor,
              'border',
              config.borderColor,
              part.state === 'streaming' ? 'border-l-2 border-l-primary-500' : '',
            )}>
              {part.content}
              {part.state === 'streaming' && (
                <span className="inline-block w-[2px] h-[12px] bg-primary-400 ml-0.5 animate-pulse" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const ReasoningPart = memo(ReasoningPartInner, (prev, next) => {
  return (
    prev.part.id === next.part.id &&
    prev.part.content === next.part.content &&
    prev.part.state === next.part.state &&
    prev.part.collapsed_by_default === next.part.collapsed_by_default &&
    prev.part.duration_ms === next.part.duration_ms &&
    prev.part.agent === next.part.agent
  );
});

ReasoningPart.displayName = 'ReasoningPart';
