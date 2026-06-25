import { useState, useMemo } from 'react';
import { HistoryIcon, RotateCcw, GitCompare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ContentVersion } from '../../../types';
import { Button } from '../../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { formatRelativeTime, cn } from '../../../utils/helpers';
import { DiffView } from './DiffView';

interface HistoryDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  versions: ContentVersion[];
  currentContent: string;
  contentId?: string;
  onRestore: (versionId: string, contentMd: string, versionNum: number) => Promise<void>;
}

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

// ─── Component ────────────────────────────────────────────

export function HistoryDialog({ open, onOpenChange, versions, currentContent, contentId, onRestore }: HistoryDialogProps) {
  const [selectedVersion, setSelectedVersion] = useState<ContentVersion | null>(null);
  const [restoring, setRestoring] = useState(false);

  const diffLines = useMemo(() => {
    if (!selectedVersion || !selectedVersion.content_md) return null;
    return computeDiff(currentContent, selectedVersion.content_md);
  }, [currentContent, selectedVersion]);

  const handleVersionClick = (version: ContentVersion, isLatest: boolean) => {
    if (isLatest) return;
    if (selectedVersion?.id === version.id) {
      setSelectedVersion(null);
    } else {
      setSelectedVersion(version);
    }
  };

  const handleRestore = async () => {
    if (!selectedVersion || !selectedVersion.content_md || !contentId) return;
    setRestoring(true);
    try {
      await onRestore(selectedVersion.id, selectedVersion.content_md, selectedVersion.version_number);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setSelectedVersion(null); onOpenChange(v); }}>
      <DialogContent className="max-w-4xl max-h-[70vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <HistoryIcon className="w-4 h-4 text-primary-400" />
            版本历史
            {selectedVersion && (
              <span className="text-[10px] text-blue-400 font-normal ml-2">
                对比 v{selectedVersion.version_number}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        {versions.length > 0 ? (
          <div className="flex-1 grid grid-cols-[220px_1fr] gap-0 min-h-0 overflow-hidden border-t border-app-border/30">
            {/* ── 左栏：版本时间轴 ── */}
            <div className="overflow-y-auto border-r border-app-border/30 p-3">
              <div className="relative ml-2">
                <div className="absolute left-[11px] top-2 bottom-2 w-px bg-app-border/50" />
                {versions.map((version, idx) => {
                  const isLatest = idx === 0;
                  const isSelected = selectedVersion?.id === version.id;
                  return (
                    <div key={version.id} className="relative flex gap-3 pb-4 group">
                      <div className="relative shrink-0 mt-1">
                        <div
                          className={cn(
                            'w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center transition-colors',
                            isLatest ? 'border-primary-400 bg-primary-500/20' :
                            isSelected ? 'border-blue-400 bg-blue-500/20 cursor-pointer hover:opacity-80' :
                            'border-app-border bg-app-surface cursor-pointer hover:border-primary-400/50'
                          )}
                          onClick={() => handleVersionClick(version, isLatest)}
                          title={isLatest ? '当前版本' : '点击对比'}
                        >
                          {isLatest ? (
                            <span className="text-[8px] text-primary-400 font-bold">L</span>
                          ) : isSelected ? (
                            <span className="text-[8px] text-blue-400 font-bold">✓</span>
                          ) : (
                            <span className="text-[8px] text-app-text-tertiary">{version.version_number}</span>
                          )}
                        </div>
                      </div>
                      <div
                        className={cn(
                          'flex-1 min-w-0 rounded-lg border p-2.5 transition-colors cursor-pointer',
                          isSelected ? 'border-blue-500/40 bg-blue-500/[0.04]' :
                          'border-app-border bg-app-surface hover:border-primary-400/30'
                        )}
                        onClick={() => handleVersionClick(version, isLatest)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-app-text shrink-0">v{version.version_number}</span>
                          <span className="text-[10px] text-app-text-tertiary whitespace-nowrap">{formatRelativeTime(version.created_at)}</span>
                          {isLatest && <span className="text-[8px] px-1 py-0.5 bg-primary-500/15 text-primary-400 rounded font-medium">当前</span>}
                        </div>
                        {version.change_summary && (
                          <p className="text-[10px] text-app-text-secondary mt-1 line-clamp-2">{version.change_summary}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── 右栏：对比预览 ── */}
            <div className="overflow-y-auto p-3">
              {selectedVersion && diffLines ? (
                <div>
                  <div className="flex items-center gap-2 mb-3 text-[11px] text-app-text-secondary">
                    <GitCompare className="w-3.5 h-3.5" />
                    当前版本 vs <span className="font-medium text-blue-400">v{selectedVersion.version_number}</span>
                  </div>
                  <DiffView
                    lines={diffLines}
                    version1="当前"
                    version2={selectedVersion.version_number}
                  />
                  <div className="flex justify-end mt-3">
                    <Button
                      size="xs"
                      onClick={handleRestore}
                      loading={restoring}
                      className="text-[10px]"
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />应用此版本
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-app-text-tertiary">
                  <GitCompare className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-xs">点击左侧版本查看差异</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-center text-app-text-tertiary py-8 text-xs">暂无版本记录</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
