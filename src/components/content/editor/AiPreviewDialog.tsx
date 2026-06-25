import { useMemo } from 'react';
import { Wand2, Expand, Languages, Volume2 } from 'lucide-react';
import { cn } from '../../../utils/helpers';
import { Button } from '../../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';

interface AiPreviewDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  action: string;
  original: string;
  result: string;
  onApply: () => void;
}

const ACTION_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  rewrite: { label: '改写结果', icon: <Wand2 className="w-4 h-4 text-primary-400" /> },
  expand: { label: '扩写结果', icon: <Expand className="w-4 h-4 text-primary-400" /> },
  translate: { label: '翻译结果', icon: <Languages className="w-4 h-4 text-primary-400" /> },
  tone: { label: '语调优化结果', icon: <Volume2 className="w-4 h-4 text-primary-400" /> },
};

// ─── Simple LCS-based line diff ───────────────────────────

function lcs<T>(a: T[], b: T[]): number[][] {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp;
}

function computeDiff(a: string, b: string): Array<{ type: string; text: string }> {
  const linesA = a.split('\n');
  const linesB = b.split('\n');
  const dp = lcs(linesA, linesB);
  const result: Array<{ type: string; text: string }> = [];
  let i = linesA.length, j = linesB.length;

  const stack: Array<{ type: string; text: string }> = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && linesA[i - 1] === linesB[j - 1]) {
      stack.push({ type: 'equal', text: linesA[i - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      stack.push({ type: 'insert', text: linesB[j - 1] });
      j--;
    } else {
      stack.push({ type: 'delete', text: linesA[i - 1] });
      i--;
    }
  }

  while (stack.length > 0) result.push(stack.pop()!);
  return result;
}

/** 配对左右列：删除行只在左栏显示，新增行只在右栏显示，相等行两边都显示 */
interface PairedRow {
  left: { text: string; type: string } | null;
  right: { text: string; type: string } | null;
}

function pairRows(lines: Array<{ type: string; text: string }>): PairedRow[] {
  const result: PairedRow[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.type === 'equal') {
      result.push({
        left: { text: line.text, type: 'equal' },
        right: { text: line.text, type: 'equal' },
      });
      i++;
    } else if (line.type === 'delete') {
      if (i + 1 < lines.length && lines[i + 1].type === 'insert') {
        result.push({
          left: { text: line.text, type: 'delete' },
          right: { text: lines[i + 1].text, type: 'insert' },
        });
        i += 2;
      } else {
        result.push({ left: { text: line.text, type: 'delete' }, right: null });
        i++;
      }
    } else if (line.type === 'insert') {
      result.push({ left: null, right: { text: line.text, type: 'insert' } });
      i++;
    } else {
      i++;
    }
  }
  return result;
}

// ─── Component ────────────────────────────────────────────

export function AiPreviewDialog({ open, onOpenChange, action, original, result, onApply }: AiPreviewDialogProps) {
  const info = ACTION_LABELS[action] || { label: 'AI 结果', icon: null };

  const diffLines = useMemo(() => computeDiff(original, result), [original, result]);
  const rows = useMemo(() => pairRows(diffLines), [diffLines]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            {info.icon}
            {info.label}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 grid grid-cols-2 gap-0 overflow-hidden rounded-lg border border-app-border">
          {/* Column headers */}
          <div className="flex border-b border-app-border/50 bg-app-surface/80">
            <div className="flex-1 px-3 py-1.5 text-[10px] font-medium text-app-text-tertiary">原文</div>
          </div>
          <div className="flex border-b border-app-border/50 bg-app-surface/80">
            <div className="flex-1 px-3 py-1.5 text-[10px] font-medium text-primary-400/80">AI 结果</div>
          </div>

          {/* Left column - original */}
          <div className="overflow-y-auto max-h-[50vh] font-mono text-[11px] leading-5 border-r border-app-border/30">
            {rows.map((row, i) => (
              <div
                key={i}
                className={cn(
                  'flex items-stretch',
                  row.left?.type === 'delete' && 'bg-red-500/[0.08]',
                )}
              >
                <div className={cn(
                  'flex items-center flex-1 min-w-0 px-3 py-0.5',
                  row.left?.type === 'delete' && 'text-red-300',
                  row.left?.type === 'equal' && 'text-app-text-secondary',
                  row.left === null && 'text-app-text-tertiary/20',
                )}>
                  <span className={cn(
                    'w-4 shrink-0 select-none',
                    row.left?.type === 'delete' ? 'text-red-400/60' : 'text-transparent',
                  )}>
                    {row.left?.type === 'delete' ? '−' : ''}
                  </span>
                  <span className="truncate whitespace-pre-wrap">{row.left?.text ?? ''}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Right column - AI result */}
          <div className="overflow-y-auto max-h-[50vh] font-mono text-[11px] leading-5">
            {rows.map((row, i) => (
              <div
                key={i}
                className={cn(
                  'flex items-stretch',
                  row.right?.type === 'insert' && 'bg-green-500/[0.08]',
                )}
              >
                <div className={cn(
                  'flex items-center flex-1 min-w-0 px-3 py-0.5',
                  row.right?.type === 'insert' && 'text-green-300',
                  row.right?.type === 'equal' && 'text-app-text-secondary',
                  row.right === null && 'text-app-text-tertiary/20',
                )}>
                  <span className={cn(
                    'w-4 shrink-0 select-none',
                    row.right?.type === 'insert' ? 'text-green-400/60' : 'text-transparent',
                  )}>
                    {row.right?.type === 'insert' ? '+' : ''}
                  </span>
                  <span className="truncate whitespace-pre-wrap">{row.right?.text ?? ''}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 shrink-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>取消</Button>
          <Button size="sm" onClick={onApply} className="bg-primary-600 hover:bg-primary-500">
            应用修改
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
