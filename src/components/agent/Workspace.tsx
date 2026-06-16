import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { useExecutionEngine } from '../../hooks/useExecutionEngine';
import { useNavigate } from 'react-router-dom';
import { contentsApi } from '../../services/api';
import { useUIStore } from '../../stores/useUIStore';
import { useAgentStore } from '../../stores/useAgentStore';
import type { StageInfo, LLMChunk, ReasoningChunk } from '../../types';
import {
  Send, Square, Bot, Sparkles, Copy, Check,
  SlidersHorizontal, Save,
} from 'lucide-react';
import { AdvancedPanel } from './AdvancedPanel';
import { StageTimeline } from './StageTimeline';
import { PlatformTags } from './PlatformTags';
import { PLATFORM_MAP } from './PlatformSelector';
// ── Format helpers ──

function formatTime(ts: number) {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m${seconds % 60}s`;
}

// ── Helpers ──

function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

// ── Component ──

export function Workspace() {
  const engine = useExecutionEngine('create');
  const {
    prompt, setPrompt, isRunning, runningTime,
    messages, currentResult, thinkingSteps, llmChunks, reasoningChunks,
    stages, currentStage,
    handleStop,
  } = engine;
  // 解构 handleExecute 以避免 handleSubmit 的 useCallback 依赖整个 engine 对象
  // （engine 是新对象引用，会导致 useCallback 失效并级联触发 handleKeyDown 重建）
  const { handleExecute: engineHandleExecute } = engine;

  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const createConversation = useAgentStore((s) => s.createConversation);

  // ── Params dialog ──
  const [paramsOpen, setParamsOpen] = useState(false);
  const [creativity, setCreativity] = useState(0.7);
  const [contentLength, setContentLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [tone, setTone] = useState<string>('friendly');
  const [audience, setAudience] = useState<string>('intermediate');

  const platform = selectedPlatform ? PLATFORM_MAP.get(selectedPlatform) : null;

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim() || isRunning) return;
    // 传入选中的平台和生成参数
    await engineHandleExecute(prompt.trim(), selectedPlatform, {
      creativity,
      content_length: contentLength,
      tone,
      audience,
    });
    setPrompt('');
  }, [prompt, isRunning, engineHandleExecute, setPrompt, selectedPlatform, creativity, contentLength, tone, audience]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const handleCopy = useCallback(async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const hasEvents = messages.length > 0 || thinkingSteps.length > 0 || currentResult !== null;
  const isIdle = messages.length === 0 && !isRunning;

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col min-w-0">
        {/* Platform indicator (compact, shown when selected) */}
        {selectedPlatform && (
          <div className="flex-shrink-0 border-b border-app-border/30 bg-app-surface/50">
            <div className="flex items-center gap-2 px-6 py-1.5">
              <span className="text-[11px] text-app-text-secondary">
                {PLATFORM_MAP.get(selectedPlatform)?.icon} {PLATFORM_MAP.get(selectedPlatform)?.label}
              </span>
              {PLATFORM_MAP.get(selectedPlatform)?.category === 'publishable' && (
                <span className="text-[9px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded-full font-medium">发布</span>
              )}
              <button
                onClick={() => setSelectedPlatform(null)}
                className="ml-auto text-[10px] text-app-text-tertiary hover:text-app-text-secondary transition-colors"
              >
                清除
              </button>
            </div>
          </div>
        )}

        {/* Messages area */}
        <ScrollArea className="flex-1 min-w-0 px-6 py-4">
          <div className="max-w-3xl mx-auto space-y-4">
            {isIdle ? (
              <EmptyWorkspace
                platform={platform}
                onSelect={(s) => { setPrompt(s); inputRef.current?.focus(); }}
              />
            ) : (
              messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  copiedId={copiedId}
                  onCopy={handleCopy}
                  thinkingSteps={thinkingSteps}
                  runningTime={runningTime}
                  stages={stages}
                  currentStage={currentStage}
                  llmChunks={llmChunks}
                  reasoningChunks={reasoningChunks}
                />
              ))
            )}

            {/* Running indicator — only show if no stages yet (pre-stage bootstrap) */}
            {isRunning && stages.length === 0 && messages[messages.length - 1]?.status === 'running' && (
              <div className="flex items-center gap-2 text-xs text-app-text-tertiary px-1">
                <Bot className="w-4 h-4 text-blue-400 animate-pulse" />
                <span>思考中</span>
                <span className="flex gap-0.5">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
                <span className="ml-auto text-[10px]">{formatDuration(runningTime)}</span>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Toolbar */}
        <div className="flex-shrink-0 flex items-center gap-2 px-6 py-2 border-t border-app-border/30 bg-app-surface/50">
          <button
            onClick={() => setParamsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-app-border/50 text-[10px] text-app-text-secondary hover:text-app-text hover:border-primary-500/30 transition-colors"
          >
            <SlidersHorizontal className="w-3 h-3" />
            参数
          </button>
          {hasEvents && !isRunning && (
            <button
              onClick={async () => {
                setPrompt('');
                engine.handleClearCurrent();
                await createConversation();
              }}
              className="ml-auto text-[10px] text-app-text-tertiary hover:text-app-text-secondary transition-colors"
            >
              新对话
            </button>
          )}
        </div>

        {/* Input */}
        <div className="flex-shrink-0 px-6 py-3 border-t border-app-border/30">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-2 rounded-xl border border-app-border bg-app-elevated px-4 py-3">
              <textarea
                ref={inputRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入你的需求... (支持小红书笔记、公众号文章、代码、脚本等)"
                className="flex-1 min-h-[44px] max-h-[120px] resize-none bg-transparent text-sm text-app-text placeholder:text-app-text-tertiary outline-none leading-relaxed"
                rows={1}
              />
              {isRunning ? (
                <Button onClick={handleStop} className="h-9 px-3 flex-shrink-0" variant="destructive" size="sm">
                  <Square className="w-3.5 h-3.5" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={!prompt.trim() || isRunning}
                  className="h-9 px-4 flex-shrink-0 gap-1.5"
                  size="sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  生成
                </Button>
              )}
            </div>
            {/* Platform tags below input */}
            <div className="mt-1.5 flex items-center justify-between">
              <PlatformTags selected={selectedPlatform} onSelect={setSelectedPlatform} />
              <span className="text-[10px] text-app-text-tertiary/50">Ctrl+Enter 发送</span>
            </div>
          </div>
        </div>
      </div>

      <AdvancedPanel selectedPlatform={selectedPlatform} />

      {/* ── Params Dialog ── */}
      <Dialog open={paramsOpen} onOpenChange={setParamsOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-primary-400" />
              生成参数
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-app-text-secondary mb-2">创造力 ({creativity.toFixed(1)})</p>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={creativity}
                onChange={(e) => setCreativity(parseFloat(e.target.value))}
                className="w-full accent-primary-500"
              />
            </div>
            <Separator />
            <div>
              <p className="text-xs font-medium text-app-text-secondary mb-2">篇幅</p>
              <div className="flex gap-1">
                {(['short', 'medium', 'long'] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setContentLength(l)}
                    className={cn(
                      'flex-1 rounded-lg border px-3 py-1.5 text-xs transition-colors',
                      contentLength === l ? 'border-primary-500/50 bg-primary-500/10 text-primary-400' : 'border-app-border text-app-text-secondary'
                    )}
                  >
                    {l === 'short' ? '短篇' : l === 'medium' ? '中篇' : '长篇'}
                  </button>
                ))}
              </div>
            </div>
            <Separator />
            <div>
              <p className="text-xs font-medium text-app-text-secondary mb-2">语调</p>
              <div className="flex flex-wrap gap-1">
                {[
                  { id: 'friendly', label: '友好' },
                  { id: 'professional', label: '专业' },
                  { id: 'humorous', label: '幽默' },
                  { id: 'warm', label: '温暖' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTone(t.id)}
                    className={cn(
                      'rounded-full px-3 py-1 text-xs transition-colors',
                      tone === t.id ? 'bg-primary-500/20 text-primary-400 ring-1 ring-primary-500/30' : 'bg-app-surface text-app-text-secondary'
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <Separator />
            <div>
              <p className="text-xs font-medium text-app-text-secondary mb-2">目标读者</p>
              <div className="flex gap-1">
                {[
                  { id: 'beginner', label: '初学者' },
                  { id: 'intermediate', label: '进阶' },
                  { id: 'expert', label: '专家' },
                ].map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setAudience(a.id)}
                    className={cn(
                      'flex-1 rounded-lg border px-3 py-1.5 text-xs transition-colors',
                      audience === a.id ? 'border-primary-500/50 bg-primary-500/10 text-primary-400' : 'border-app-border text-app-text-secondary'
                    )}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Sub-components ──

function EmptyWorkspace({ platform, onSelect }: { platform: { icon: string; label: string } | null; onSelect: (s: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center mb-4">
        <Sparkles className="w-7 h-7 text-blue-400" />
      </div>
      <h2 className="text-base font-semibold text-app-text mb-1">
        {platform ? `开始${platform.label}创作` : '开始创作'}
      </h2>
      <p className="text-xs text-app-text-secondary leading-relaxed max-w-sm mb-5">
        {platform
          ? `为${platform.label}生成适配的内容，Agent 将自动调整风格和格式`
          : '选择一个平台，或直接输入需求，Agent 将自动拆解任务并执行'
        }
      </p>
      <div className="flex flex-wrap gap-2 justify-center">
        {platform?.label === '小红书' && (
          <button onClick={() => onSelect('为某款 AI 写作工具写一篇小红书种草笔记，要求标题吸引人，正文口语化')}
            className="px-4 py-2 rounded-full border border-app-border/50 text-xs text-app-text-secondary hover:border-red-500/30 hover:text-red-400 transition-colors">
            📕 写一篇种草笔记
          </button>
        )}
        {platform?.label === '公众号' && (
          <button onClick={() => onSelect('写一篇关于远程办公效率的深度长文，2000 字左右')}
            className="px-4 py-2 rounded-full border border-app-border/50 text-xs text-app-text-secondary hover:border-green-500/30 hover:text-green-400 transition-colors">
            📱 写一篇公众号文章
          </button>
        )}
        {platform?.label === '微博' && (
          <button onClick={() => onSelect('写一条关于 AI 热点的微博，140 字以内，带话题标签')}
            className="px-4 py-2 rounded-full border border-app-border/50 text-xs text-app-text-secondary hover:border-yellow-500/30 hover:text-yellow-400 transition-colors">
            🔵 写一条微博
          </button>
        )}
        {platform?.label === '抖音' && (
          <button onClick={() => onSelect('为一个 30 秒的科技产品宣传视频创作分镜脚本')}
            className="px-4 py-2 rounded-full border border-app-border/50 text-xs text-app-text-secondary hover:border-pink-500/30 hover:text-pink-400 transition-colors">
            🎵 写抖音脚本
          </button>
        )}
        {!platform && (
          <>
            <button onClick={() => onSelect('写一篇 AI 编程趋势分析')}
              className="px-4 py-2 rounded-full border border-app-border/50 text-xs text-app-text-secondary hover:border-blue-500/30 hover:text-blue-400 transition-colors">
              ✏️ 写一篇文章
            </button>
            <button onClick={() => onSelect('为一款智能笔记应用写产品推广文案')}
              className="px-4 py-2 rounded-full border border-app-border/50 text-xs text-app-text-secondary hover:border-purple-500/30 hover:text-purple-400 transition-colors">
              📝 写产品文案
            </button>
            <button onClick={() => onSelect('编写一份 REST API 设计规范文档')}
              className="px-4 py-2 rounded-full border border-app-border/50 text-xs text-app-text-secondary hover:border-cyan-500/30 hover:text-cyan-400 transition-colors">
              📘 写技术文档
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function MessageBubble({
  message, copiedId, onCopy,
  runningTime,
  stages, currentStage, llmChunks, reasoningChunks,
}: {
  message: { id: string; role: string; content: string; timestamp: number; status?: string; result?: any };
  copiedId: string | null;
  onCopy: (id: string, text: string) => void;
  thinkingSteps?: any[];
  runningTime?: number;
  stages?: StageInfo[];
  currentStage?: string | null;
  llmChunks?: Record<string, LLMChunk[]>;
  reasoningChunks?: Record<string, ReasoningChunk[]>;
}) {
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useUIStore();


  const handleSaveToContent = useCallback(async () => {
    if (!message.content) return;
    setSaving(true);
    try {
      // 直接创建 Content 记录，不再触发 AI 重新生成
      const title = message.content.split('\n')[0].replace(/^#+\s*/, '').slice(0, 80) || '生成内容';
      const res = await contentsApi.create({
        title,
        content_md: message.content,
        platform_code: 'xiaohongshu',
      });
      const contentId = res.data.data?.id;
      if (contentId) {
        showToast('已保存到内容管理', 'success', { label: '查看', onClick: () => navigate(`/content/${contentId}`) });
      } else {
        showToast('已保存但无法跳转，请在内容管理中查看', 'success');
      }
    } catch {
      showToast('保存失败，请稍后重试', 'error');
    } finally {
      setSaving(false);
    }
  }, [message.content, navigate, showToast]);

  if (message.role === 'user') {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end">
        <div className="max-w-[75%] rounded-2xl rounded-tr-md bg-primary-600/15 px-4 py-2.5">
          <p className="text-sm text-app-text whitespace-pre-wrap">{message.content}</p>
          <p className="mt-0.5 text-right text-[10px] text-app-text-tertiary">{formatTime(message.timestamp)}</p>
        </div>
      </motion.div>
    );
  }

  if (message.role === 'assistant') {
    const isRunning = message.status === 'running';
    const isFailed = message.status === 'failed';
    const displayContent = message.content || '';

    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
        <div className="max-w-[85%] w-full rounded-xl border border-app-border/40 bg-app-elevated p-4">
          {/* Header */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isRunning ? (
                <Bot className="w-4 h-4 text-blue-400 animate-pulse" />
              ) : isFailed ? (
                <span className="w-4 h-4 text-red-400">⚠️</span>
              ) : (
                <Sparkles className="w-4 h-4 text-yellow-400" />
              )}
              <span className="text-xs font-medium text-app-text">
                {isRunning ? '生成中...' : isFailed ? '生成失败' : '生成结果'}
              </span>
              {isRunning && runningTime !== undefined && (
                <span className="text-[10px] text-app-text-tertiary">{formatDuration(runningTime)}</span>
              )}
            </div>
            {!isRunning && displayContent && (
              <button
                onClick={() => onCopy(message.id, displayContent)}
                className="rounded p-1 text-app-text-tertiary hover:text-app-text-secondary transition-colors"
              >
                {copiedId === message.id ? (
                  <Check className="w-3.5 h-3.5 text-green-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>

          {/* Content: Thinking animation (no content yet) */}
          {isRunning && !displayContent && (
            <div className="flex items-center gap-1.5 py-2">
              <span className="text-sm text-app-text-secondary">思考中</span>
              <span className="flex gap-0.5">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          )}

          {/* Stage-based timeline — 流式逐字渲染 */}
          {stages && stages.length > 0 && (
            <StageTimeline
              stages={stages}
              currentStage={currentStage || null}
              isRunning={isRunning}
              llmChunks={llmChunks}
              reasoningChunks={reasoningChunks}
            />
          )}

          {/* Failed message */}
          {isFailed && !displayContent && (
            <div className="text-sm text-red-400 py-1">请求失败，请重试</div>
          )}

          {/* Save & Usage */}
          {!isRunning && displayContent && (
            <div className="mt-3 flex items-center justify-between border-t border-app-border/30 pt-2">
              <Button
                onClick={handleSaveToContent}
                disabled={saving}
                variant="ghost"
                size="xs"
                className="text-app-text-tertiary hover:text-primary-400"
              >
                <Save className="w-3 h-3 mr-1" />
                {saving ? '保存中...' : '保存到内容管理'}
              </Button>
              {message.result?.usage && (
                <div className="flex flex-wrap gap-3 text-[10px] text-app-text-tertiary">
                  <span>Token: {message.result.usage.tokens_used}</span>
                  <span>耗时: {message.result.usage.time_elapsed?.toFixed(1)}s</span>
                  <span>模型: {message.result.usage.model || 'N/A'}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  return null;
}

