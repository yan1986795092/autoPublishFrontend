import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/helpers';
import { ArrowLeftRight, ChevronDown, ChevronUp } from 'lucide-react';

interface DiffSegment {
  type: 'equal' | 'insert' | 'delete';
  text: string;
}

interface Props {
  sourceContent: string;
  adaptedContent: string;
  sourceLabel: string;
  adaptedLabel: string;
}

function computeDiff(a: string, b: string): DiffSegment[] {
  const lines1 = a.split('\n');
  const lines2 = b.split('\n');

  // Simple LCS-based diff
  const dp: number[][] = Array.from({ length: lines1.length + 1 }, () =>
    Array(lines2.length + 1).fill(0)
  );

  for (let i = 1; i <= lines1.length; i++) {
    for (let j = 1; j <= lines2.length; j++) {
      if (lines1[i - 1] === lines2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const result: DiffSegment[] = [];
  let i = lines1.length;
  let j = lines2.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && lines1[i - 1] === lines2[j - 1]) {
      result.unshift({ type: 'equal', text: lines1[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'insert', text: lines2[j - 1] });
      j--;
    } else {
      result.unshift({ type: 'delete', text: lines1[i - 1] });
      i--;
    }
  }

  return result;
}

export function PlatformDiffView({ sourceContent, adaptedContent, sourceLabel, adaptedLabel }: Props) {
  const [collapsed, setCollapsed] = useState(true);

  const segments = useMemo(
    () => computeDiff(sourceContent, adaptedContent),
    [sourceContent, adaptedContent]
  );

  const changes = segments.filter((s) => s.type !== 'equal').length;

  return (
    <div className="border-t border-white/[0.04]">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/[0.02] transition-colors"
      >
        <ArrowLeftRight className="w-3 h-3 text-primary-400" />
        <span className="text-[10px] font-medium text-app-text-secondary">平台差异对比</span>
        {changes > 0 && (
          <span className="text-[9px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
            {changes} 处差异
          </span>
        )}
        {collapsed ? <ChevronDown className="w-3 h-3 text-app-text-tertiary ml-auto" /> : <ChevronUp className="w-3 h-3 text-app-text-tertiary ml-auto" />}
      </button>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            {/* Labels */}
            <div className="flex gap-2 px-3 pb-1">
              <div className="flex-1 text-[9px] text-app-text-tertiary font-medium">{sourceLabel}</div>
              <div className="flex-1 text-[9px] text-app-text-tertiary font-medium">{adaptedLabel}</div>
            </div>

            {/* Diff rows */}
            <div className="px-3 pb-3 max-h-48 overflow-y-auto space-y-0.5">
              {segments.map((seg, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex gap-2 text-[10px] font-mono leading-relaxed',
                      seg.type === 'insert' && 'bg-green-500/5 text-green-300',
                      seg.type === 'delete' && 'bg-red-500/5 text-red-300 line-through',
                      seg.type === 'equal' && 'text-app-text-tertiary'
                    )}
                  >
                    <div className="flex-1 truncate">
                      {seg.type === 'delete' ? seg.text : seg.type === 'equal' ? seg.text : ''}
                    </div>
                    <div className="flex-1 truncate">
                      {seg.type === 'insert' ? seg.text : seg.type === 'equal' ? seg.text : ''}
                    </div>
                  </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
