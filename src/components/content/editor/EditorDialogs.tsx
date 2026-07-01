import {
  Hash, SearchIcon, Send,
  Loader2, AlertTriangle, XCircle,
} from 'lucide-react';
import { contentsApi } from '../../../services/api';
import { Button } from '../../ui/button';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { formatRelativeTime, cn } from '../../../utils/helpers';
import { PlatformIcon } from '../../agent/PlatformIcons';
import { PLATFORM_MAP } from '../../agent/PlatformSelector';
import { useUIStore } from '../../../stores/useUIStore';
import { AiPreviewDialog } from './AiPreviewDialog';
import { HistoryDialog } from './HistoryDialog';
import type { UseContentEditorReturn } from '../../../hooks/useContentEditor';

interface EditorDialogsProps {
  editor: UseContentEditorReturn;
}

// Banned word item 类型（来自后端 banned words 检查）
interface BannedWordItem {
  word: string;
  reason?: string;
  suggestion?: string;
  severity?: 'high' | 'medium' | 'low';
}

export function EditorDialogs({ editor }: EditorDialogsProps) {
  const { showToast } = useUIStore();
  const {
    // Headlines
    headlinesOpen, setHeadlinesOpen, headlines, handleTitleChange,
    // SEO
    seoOpen, setSeoOpen, seoResult,
    // History
    historyOpen, handleHistoryOpenChange, versions,
    content, loadContent,
    // Publish history
    publishHistoryOpen, setPublishHistoryOpen, publishRecords, publishHistoryLoading,
    // Delete
    deleteConfirmOpen, setDeleteConfirmOpen, handleDelete,
    // AI Preview
    aiPreviewOpen, setAiPreviewOpen, aiPreviewResult, aiPreviewAction, handleApplyAiPreview,
    // Banned words
    bannedWordsOpen, setBannedWordsOpen, bannedWordsList, handleApplyBannedReplace,
    // Ops
    editContentMd,
  } = editor;

  return (
    <>
      {/* ── Headlines Dialog ── */}
      <Dialog open={headlinesOpen} onOpenChange={setHeadlinesOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <Hash className="w-4 h-4 text-primary-400" />推荐标题
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {headlines.length === 0 ? (
              <p className="text-xs text-app-text-tertiary py-4 text-center">暂无推荐标题</p>
            ) : (
              headlines.map((h, i) => (
                <button
                  key={i}
                  onClick={() => { handleTitleChange(h); setHeadlinesOpen(false); showToast('标题已更新', 'success'); }}
                  className="w-full text-left rounded-lg border border-app-border bg-app-surface px-3 py-2 text-xs text-app-text hover:border-primary-500/30 hover:bg-primary-500/5 transition-colors"
                >
                  {h}
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── SEO Dialog ── */}
      <Dialog open={seoOpen} onOpenChange={setSeoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <SearchIcon className="w-4 h-4 text-primary-400" />SEO 分析
            </DialogTitle>
          </DialogHeader>
          {seoResult && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold" style={{ color: seoResult.overall >= 70 ? '#22c55e' : seoResult.overall >= 40 ? '#eab308' : '#ef4444' }}>
                  {seoResult.overall}
                </span>
                <span className="text-xs text-app-text-tertiary">/ 100</span>
              </div>
              {seoResult.suggestions.length > 0 ? (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-medium text-app-text-tertiary">优化建议</p>
                  {seoResult.suggestions.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11px] text-app-text-secondary">
                      <span className="text-yellow-400 mt-0.5 shrink-0">•</span>
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-green-400">内容质量良好，无需优化 🎉</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── History Dialog ── */}
      <HistoryDialog
        open={historyOpen}
        onOpenChange={handleHistoryOpenChange}
        versions={versions}
        currentContent={editContentMd}
        contentId={content?.id}
        onRestore={async (_versionId, contentMd, versionNum) => {
          try {
            const res = await contentsApi.update(content!.id, {
              content_md: contentMd || '',
              change_summary: `回滚到 v${versionNum}`,
            });
            if (res.data.success) {
              showToast(`已恢复到 v${versionNum}`, 'success');
              handleHistoryOpenChange(false);
              if (content?.id) loadContent(content.id);
            }
          } catch {
            showToast('恢复失败', 'error');
          }
        }}
      />

      {/* ── Publish History Dialog ── */}
      <Dialog open={publishHistoryOpen} onOpenChange={setPublishHistoryOpen}>
        <DialogContent className="max-w-lg max-h-[60vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Send className="w-4 h-4 text-primary-400" />
              发布记录
            </DialogTitle>
          </DialogHeader>
          {publishHistoryLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-app-text-tertiary" /></div>
          ) : publishRecords.length === 0 ? (
            <p className="text-center text-xs text-app-text-tertiary py-8">暂无发布记录</p>
          ) : (
            <div className="flex-1 overflow-auto space-y-2 pr-1">
              {publishRecords.map((record, idx) => {
                const plat = PLATFORM_MAP.get(record.platform_code);
                return (
                  <div key={record.id || idx} className="rounded-lg border border-app-border bg-app-surface p-3 flex items-center gap-3">
                    <PlatformIcon id={record.platform_code} size={20} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-app-text">{plat?.label || record.platform_code}</p>
                      <p className="text-[10px] text-app-text-tertiary">{formatRelativeTime(record.published_at || record.created_at)}</p>
                    </div>
                    <span className={cn(
                      'text-[10px] px-2 py-0.5 rounded-full font-medium',
                      record.status === 'published' ? 'bg-green-500/10 text-green-400' :
                      record.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                      'bg-yellow-500/10 text-yellow-400'
                    )}>
                      {record.status === 'published' ? '已发布' : record.status === 'failed' ? '失败' : '草稿'}
                    </span>
                    {record.platform_url && (
                      <a href={record.platform_url} target="_blank" rel="noreferrer" className="text-[10px] text-primary-400 hover:underline shrink-0">查看</a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ── */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="删除内容"
        description="确定要删除这篇内容吗？此操作不可恢复。"
        variant="danger"
        onConfirm={handleDelete}
      />

      {/* ── AI Preview Dialog (改写/扩写/总结/翻译/语调) ── */}
      <AiPreviewDialog
        open={aiPreviewOpen}
        onOpenChange={setAiPreviewOpen}
        action={aiPreviewAction}
        original={editContentMd}
        result={aiPreviewResult}
        onApply={handleApplyAiPreview}
      />

      {/* ── Banned Words Dialog ── */}
      <Dialog open={bannedWordsOpen} onOpenChange={setBannedWordsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />违禁词检测
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-app-text-secondary">
              发现 <span className="text-red-400 font-medium">{bannedWordsList.length}</span> 个违禁词：
            </p>
            <div className="max-h-48 overflow-y-auto space-y-1.5">
              {bannedWordsList.map((item, i) => {
                const w = item as BannedWordItem;
                return (
                <div key={i} className="px-3 py-2 rounded-lg bg-red-500/5 border border-red-500/10">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span className="text-xs text-red-300 font-mono">{w.word}</span>
                    {item.severity && (
                      <span className={cn(
                        'text-[9px] px-1 py-0.5 rounded font-medium',
                        item.severity === 'high' ? 'bg-red-500/20 text-red-400' :
                        w.severity === 'medium' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      )}>
                        {w.severity === 'high' ? '高危' : w.severity === 'medium' ? '中危' : '低危'}
                      </span>
                    )}
                  </div>
                  {w.reason && (
                    <p className="text-[10px] text-red-300/70 mt-0.5 ml-6">{w.reason}</p>
                  )}
                  {w.suggestion && (
                    <p className="text-[10px] text-green-400/70 mt-0.5 ml-6">建议：{w.suggestion}</p>
                  )}
                </div>
              );
              })}
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setBannedWordsOpen(false)}>关闭</Button>
              <Button size="sm" onClick={handleApplyBannedReplace} className="bg-red-600 hover:bg-red-500">
                全部替换为 ***
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
