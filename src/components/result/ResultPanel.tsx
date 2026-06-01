import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useEditorStore } from '../../stores/useEditorStore';
import { useAgentStore } from '../../stores/useAgentStore';
import { useUIStore } from '../../stores/useUIStore';
import { useContentPipelineStore, PIPELINE_STAGE_LABELS, PIPELINE_STAGE_COLORS, PIPELINE_STAGE_ORDER } from '../../stores/useContentPipelineStore';
import { useGeneratorStore } from '../../stores/useGeneratorStore';
import { ContentEditor } from '../editor/ContentEditor';
import { Button } from '../ui/button';
import { cn } from '../../utils/helpers';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Eye, PenLine, Copy, Download, FileText, Sparkles, Loader2, Check } from 'lucide-react';

export function ResultPanel() {
  const { content_md } = useEditorStore();
  const { isRunning } = useAgentStore();
  const { showToast } = useUIStore();
  const { stage, setStage } = useContentPipelineStore();
  const [isEditMode, setIsEditMode] = useState(false);
  const [copied, setCopied] = useState(false);

  const hasContent = content_md.trim().length > 0;

  // Derive a filename from the draft title or a fallback
  const { draft } = useGeneratorStore();

  const handleCopy = useCallback(async () => {
    if (!content_md) return;
    try {
      await navigator.clipboard.writeText(content_md);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast('内容已复制到剪贴板', 'success');
    } catch {
      // Fallback copy
      const ta = document.createElement('textarea');
      ta.value = content_md;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('内容已复制到剪贴板', 'success');
    }
  }, [content_md, showToast]);

  const handleExport = useCallback(() => {
    if (!content_md) return;
    const blob = new Blob([content_md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(draft.title || 'content').replace(/[<>:"/\\|?*]/g, '_').slice(0, 80) || 'content'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [content_md, draft.title]);

  const handleToggleMode = useCallback(() => {
    setIsEditMode(prev => !prev);
  }, []);

  // ─── Edit Mode ───
  if (isEditMode && hasContent) {
    return (
      <div className="h-full flex flex-col">
        {/* Minimal header: just a "back to preview" button */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-app-border flex-shrink-0 bg-app-surface/50">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary-600/20 flex items-center justify-center">
              <PenLine className="w-3 h-3 text-primary-400" />
            </div>
            <span className="text-xs font-semibold text-app-text">编辑内容</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleToggleMode} className="h-7 text-xs gap-1.5">
            <Eye className="w-3.5 h-3.5" />
            预览
          </Button>
        </div>
        <div className="flex-1 min-h-0">
          <ContentEditor />
        </div>
      </div>
    );
  }

  // ─── Read Mode / Empty State ───
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-app-border flex-shrink-0 bg-app-surface/50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-primary-600/20 flex items-center justify-center">
            <FileText className="w-3 h-3 text-primary-400" />
          </div>
          <span className="text-xs font-semibold text-app-text">生成结果</span>
          {isRunning && hasContent && (
            <span className="flex items-center gap-1.5 ml-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-[10px] text-blue-400/70">生成中</span>
            </span>
          )}
          {/* Pipeline stage indicator */}
          {hasContent && !isRunning && (
            <div className="flex items-center gap-1.5 ml-2" title="点击切换流水线阶段">
              <div className="flex items-center gap-0.5">
                {PIPELINE_STAGE_ORDER.map((s, i) => {
                  const currentIdx = PIPELINE_STAGE_ORDER.indexOf(stage);
                  const isActive = i <= currentIdx;
                  return (
                    <div key={s} className="flex items-center">
                      <button
                        onClick={() => setStage(s)}
                        className={cn(
                          'w-1.5 h-1.5 rounded-full transition-all',
                          isActive ? 'bg-primary-500' : 'bg-app-border'
                        )}
                        title={PIPELINE_STAGE_LABELS[s]}
                      />
                      {i < PIPELINE_STAGE_ORDER.length - 1 && (
                        <span className={cn(
                          'w-2 h-px mx-px',
                          i < currentIdx ? 'bg-primary-500/50' : 'bg-app-border'
                        )} />
                      )}
                    </div>
                  );
                })}
              </div>
              <span className={cn('text-[10px] font-medium', PIPELINE_STAGE_COLORS[stage])}>
                {PIPELINE_STAGE_LABELS[stage]}
              </span>
            </div>
          )}
        </div>
        {hasContent && (
          <div className="flex items-center gap-1">
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-md text-app-text-tertiary hover:text-app-text hover:bg-white/5 transition-colors"
              title="复制全文"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={handleExport}
              className="p-1.5 rounded-md text-app-text-tertiary hover:text-app-text hover:bg-white/5 transition-colors"
              title="导出 Markdown"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-4 bg-app-border mx-0.5" />
            <button
              onClick={handleToggleMode}
              className="p-1.5 rounded-md text-app-text-tertiary hover:text-app-text hover:bg-white/5 transition-colors"
              title="进入编辑模式"
            >
              <PenLine className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {hasContent ? (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-3xl mx-auto px-8 py-8"
          >
            <div className="
              prose prose-invert max-w-none
              [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-app-text [&_h1]:mt-8 [&_h1]:mb-4 [&_h1]:tracking-tight
              [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-app-text [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:tracking-tight
              [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-app-text [&_h3]:mt-6 [&_h3]:mb-2
              [&_p]:text-base [&_p]:text-app-text-secondary [&_p]:leading-8 [&_p]:mb-4
              [&_ul]:text-base [&_ul]:text-app-text-secondary [&_ul]:leading-8 [&_ul]:mb-4 [&_ul]:pl-5
              [&_ol]:text-base [&_ol]:text-app-text-secondary [&_ol]:leading-8 [&_ol]:mb-4 [&_ol]:pl-5
              [&_li]:text-base [&_li]:text-app-text-secondary [&_li]:leading-8 [&_li]:mb-1
              [&_blockquote]:border-l-4 [&_blockquote]:border-primary-500/40 [&_blockquote]:pl-5 [&_blockquote]:py-2 [&_blockquote]:my-6 [&_blockquote]:bg-primary-500/[0.04] [&_blockquote]:rounded-r-lg
              [&_blockquote_p]:text-base [&_blockquote_p]:text-primary-300/70 [&_blockquote_p]:mb-0
              [&_code]:bg-app-elevated [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md [&_code]:text-sm [&_code]:font-mono [&_code]:text-primary-400 [&_code]:border [&_code]:border-app-border
              [&_pre]:bg-[#0d0d0f] [&_pre]:p-5 [&_pre]:rounded-xl [&_pre]:my-6 [&_pre]:border [&_pre]:border-app-border [&_pre]:overflow-x-auto
              [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:border-0 [&_pre_code]:text-sm [&_pre_code]:text-app-text-secondary
              [&_hr]:border-app-border [&_hr]:my-10
              [&_a]:text-primary-400 [&_a]:underline [&_a]:underline-offset-2 [&_a]:decoration-primary-500/30
              [&_img]:rounded-xl [&_img]:my-6 [&_img]:border [&_img]:border-app-border [&_img]:w-full
              [&_table]:w-full [&_table]:border-collapse [&_table]:my-6 [&_table]:text-sm
              [&_th]:border [&_th]:border-app-border [&_th]:px-4 [&_th]:py-2 [&_th]:text-left [&_th]:text-app-text [&_th]:bg-app-elevated [&_th]:font-semibold
              [&_td]:border [&_td]:border-app-border [&_td]:px-4 [&_td]:py-2 [&_td]:text-app-text-secondary
            ">
              <Markdown remarkPlugins={[remarkGfm]}>{content_md}</Markdown>
            </div>
            {isRunning && (
              <div className="flex items-center gap-2 mt-6 text-sm text-blue-400/60">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>内容持续生成中…</span>
              </div>
            )}
          </motion.div>
        ) : isRunning ? (
          /* Loading shimmer */
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Loader2 className="w-6 h-6 text-blue-400/50 animate-spin" />
            <p className="text-xs text-app-text-tertiary">等待 Agent 生成内容</p>
          </div>
        ) : (
          /* Empty state with workflow guide */
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-full flex flex-col items-center justify-center px-8"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/[0.08] to-purple-500/[0.08] border border-white/[0.06] flex items-center justify-center mb-5">
              <Sparkles className="w-8 h-8 text-blue-400/40" />
            </div>
            <h3 className="text-sm font-medium text-app-text-secondary mb-1.5">等待创作</h3>
            <p className="text-xs text-app-text-tertiary max-w-[200px] leading-relaxed mb-8">
              在左侧输入需求，Agent 团队将协作生成内容
            </p>

            {/* ── Workflow guide ── */}
            <div className="flex items-center gap-3">
              {[
                { step: '01', label: '输入需求', icon: (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-400"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                ), desc: '描述你的创作需求' },
                { step: '02', label: 'Agent 规划', icon: (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-400"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                ), desc: '团队协作拆解任务' },
                { step: '03', label: '生成内容', icon: (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-400"><polyline points="20 6 9 17 4 12"/></svg>
                ), desc: '实时生成完整内容' },
              ].map((item, i) => (
                <div key={item.step} className="flex items-center gap-3">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-9 h-9 rounded-xl border border-app-border bg-app-elevated flex items-center justify-center">
                      {item.icon}
                    </div>
                    <p className="text-[10px] font-medium text-app-text">{item.label}</p>
                    <p className="text-[9px] text-app-text-tertiary text-center max-w-[60px] leading-tight">{item.desc}</p>
                  </div>
                  {i < 2 && (
                    <div className="flex-shrink-0 mb-5">
                      <svg width="20" height="8" viewBox="0 0 20 8" fill="none">
                        <path d="M0 4h16m0 0l-4-3m4 3l-4 3" stroke="currentColor" strokeWidth="1" className="text-app-border"/>
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* ── Tip ── */}
            <p className="text-[10px] text-app-text-tertiary/60 mt-8">
              生成完成后，点击「编辑」进入富文本编辑器进一步修改
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
