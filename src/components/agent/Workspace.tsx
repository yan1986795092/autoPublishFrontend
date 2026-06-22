import React, { useState, useCallback, useRef, useEffect, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { useExecutionEngine } from '../../hooks/useExecutionEngine';
import { useConversationChat } from '../../hooks/useConversationChat';
import { useAgentStore } from '../../stores/useAgentStore';
import { AGENT_STAGE_MAP, type StageInfo, type LLMChunk, type ReasoningChunk } from '../../types';
import {
  Send, Square, Bot, Sparkles, Copy, Check,
  SlidersHorizontal, Eye, ArrowDown,
} from 'lucide-react';
import { AdvancedPanel } from './AdvancedPanel';
import { StageTimeline } from './StageTimeline';
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
  const { sendChatMessage, isChatting } = useConversationChat();
  const {
    prompt, setPrompt, isRunning, runningTime,
    messages, currentResult, thinkingSteps, llmChunks, reasoningChunks,
    stages, currentStage, hasFirstEventReceived,
    handleStop,
  } = engine;
  // 解构 handleExecute 以避免 handleSubmit 的 useCallback 依赖整个 engine 对象
  // （engine 是新对象引用，会导致 useCallback 失效并级联触发 handleKeyDown 重建）
  const { handleExecute: engineHandleExecute } = engine;

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const createConversation = useAgentStore((s) => s.createConversation);

  // ── Params dialog ──
  const [paramsOpen, setParamsOpen] = useState(false);
  const [creativity, setCreativity] = useState(0.7);
  const [contentLength, setContentLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [tone, setTone] = useState<string>('friendly');
  const [audience, setAudience] = useState<string>('intermediate');

  // ── 流式消息区滚动控制：自动贴底 + 用户上滑让出 + 「回到最新」按钮 ──
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);
  // 防止程序滚动触发的 scroll 事件与 useLayoutEffect 互相触发形成抖动
  const scrollDueToProgramRef = useRef(false);
  // 用户是否主动上滑离开底部（让出控制权）
  const [isUserPinned, setIsUserPinned] = useState(false);
  // 离开底部时累计的「新内容」计数（贴底后清零）
  const [unreadCount, setUnreadCount] = useState(0);
  // 距离底部多少像素以内算「贴底」
  const PIN_THRESHOLD = 80;

  const isAtBottom = useCallback(() => {
    const el = scrollViewportRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight <= PIN_THRESHOLD;
  }, []);

  // 监听视口滚动：用户主动上滑离开底部 → 让出控制权并开始累计未读
  // 注意：程序调用 scrollTo 触发的 scroll 事件会被 scrollDueToProgramRef 忽略，避免与 useLayoutEffect 互相触发
  const handleScrollViewport = useCallback(() => {
    if (scrollDueToProgramRef.current) return;
    const atBottom = isAtBottom();
    setIsUserPinned((prev) => {
      if (atBottom && prev) {
        // 回到底部 → 重新贴底，清零未读
        setUnreadCount(0);
        return false;
      }
      if (!atBottom && !prev) {
        return true;
      }
      return prev;
    });
  }, [isAtBottom]);

  const scrollToBottom = useCallback((smooth = false) => {
    const el = scrollViewportRef.current;
    if (!el) return;
    // 标记本次为程序滚动，防止 handleScrollViewport 的 scroll 事件与 useLayoutEffect 互相触发
    scrollDueToProgramRef.current = true;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto',
    });
    setIsUserPinned(false);
    setUnreadCount(0);
    // 等待一个 event loop 后清除标记，让用户的下次真实滚动能正常响应
    setTimeout(() => { scrollDueToProgramRef.current = false; }, 0);
  }, []);

  // 追踪消息/阶段数量的上轮值，用于判断是否需要滚动
  const prevCountsRef = useRef({ messages: 0, stages: 0 });

  // 流式内容更新时：只在 messages 或 stages 实际增长时才滚动到最新
  // 避免每次 chunk 写入都触发 scroll 导致抖动
  useLayoutEffect(() => {
    if (!isRunning) return;
    if (isUserPinned) {
      // 用户在看历史：累计新阶段数作为未读提示
      setUnreadCount((c) => c + 1);
      return;
    }
    const el = scrollViewportRef.current;
    if (!el) return;

    const msgCount = messages.length;
    const stageCount = stages.length;
    const prev = prevCountsRef.current;
    const grew = msgCount > prev.messages || stageCount > prev.stages;

    if (grew) {
      prevCountsRef.current = { messages: msgCount, stages: stageCount };
      // 标记本次为程序滚动，防止 handleScrollViewport 的 scroll 事件与 rAF 互相触发
      scrollDueToProgramRef.current = true;
      const id = requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
        setTimeout(() => { scrollDueToProgramRef.current = false; }, 0);
      });
      return () => cancelAnimationFrame(id);
    }
  }, [isRunning, isUserPinned, messages.length, stages.length]);

  // 新一轮开始时重置状态
  useEffect(() => {
    if (isRunning) {
      setIsUserPinned(false);
      setUnreadCount(0);
    }
  }, [isRunning]);

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim() || isRunning || isChatting) return;
    const text = prompt.trim();
    setPrompt('');
    // 统一走对话引擎：LLM 自行判断是闲聊、小修改、还是触发生成
    await sendChatMessage(text);
  }, [prompt, isRunning, isChatting, setPrompt, sendChatMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
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
  const isIdle = messages.length === 0 && !isRunning && !isChatting;

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col min-w-0">
        {/* Messages area — 受控滚动视口：自动贴底 + 用户上滑让出 */}
        <ScrollArea
          className="flex-1 min-w-0 px-6 py-4"
          viewportRef={scrollViewportRef}
          onViewportScroll={handleScrollViewport}
        >
          <div className="max-w-3xl mx-auto space-y-4 relative">
            {isIdle ? (
              <EmptyWorkspace
                onSelect={(s) => { setPrompt(s); inputRef.current?.focus(); }}
              />
            ) : (
              messages.map((msg) => (
                <MessageBubbleMemo
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

            {/* Running indicator — show only before first SSE event arrives (stream hasn't started showing results yet) */}
            {isRunning && !hasFirstEventReceived && messages[messages.length - 1]?.status === 'running' && (
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

            {/* 「回到最新」浮动按钮：用户上滑离开底部时出现 */}
            <AnimatePresence>
              {isRunning && isUserPinned && (
                <motion.button
                  key="scroll-to-bottom"
                  type="button"
                  onClick={() => scrollToBottom(true)}
                  initial={{ opacity: 0, y: 8, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                  className="sticky bottom-2 left-full -translate-x-2 ml-2 mt-2 inline-flex items-center gap-1.5 rounded-full bg-blue-500/90 hover:bg-blue-500 text-white px-3 py-1.5 text-xs font-medium shadow-lg shadow-blue-500/20 backdrop-blur transition-colors"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                  回到最新
                  {unreadCount > 0 && (
                    <span className="ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-white/25 text-[10px] font-semibold">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </motion.button>
              )}
            </AnimatePresence>
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
              {isRunning || isChatting ? (
                <Button onClick={handleStop} className="h-9 px-3 flex-shrink-0" variant="destructive" size="sm">
                  <Square className="w-3.5 h-3.5" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={!prompt.trim() || isRunning || isChatting}
                  className="h-9 px-4 flex-shrink-0 gap-1.5"
                  size="sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  发送
                </Button>
              )}
            </div>
            {/* Hint text below input */}
            <div className="mt-1.5 flex items-center justify-end">
              <span className="text-[10px] text-app-text-tertiary/50">Enter 发送 · Shift+Enter 换行</span>
            </div>
          </div>
        </div>
      </div>

      <AdvancedPanel />

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

function EmptyWorkspace({ onSelect }: { onSelect: (s: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center mb-4">
        <Sparkles className="w-7 h-7 text-blue-400" />
      </div>
      <h2 className="text-base font-semibold text-app-text mb-1">开始创作</h2>
      <p className="text-xs text-app-text-secondary leading-relaxed max-w-sm mb-5">
        告诉 Agent 你想创作什么，LLM 将自动拆解任务并完成
      </p>
      <div className="flex flex-wrap gap-2 justify-center">
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
      </div>
    </div>
  );
}

/**
 * 降级方案：为没有 _llmChunks 的旧消息，从 message.content 构建 chunks
 */
function _fallbackLlmChunks(result: any, content: string): Record<string, LLMChunk[]> {
  const chunks: Record<string, LLMChunk[]> = {};
  if (!content || !result?._stages) return chunks;
  const ts = Date.now();
  for (const st of result._stages) {
    if (st.agent === 'WritingAgent' || st.agent === 'FixAgent') {
      chunks[st.agent] = [{ agent: st.agent, content, timestamp: ts }];
    }
  }
  return chunks;
}

function _hasPersistedGenerationResult(result: any): boolean {
  if (!result || typeof result !== 'object') return false;

  if (Array.isArray(result._stages) && result._stages.length > 0) return true;
  if (result._draftContent) return true;
  if (result._llmChunks && Object.keys(result._llmChunks).length > 0) return true;
  if (result.usage) return true;
  if (result.agent_type || result.task_id) return true;

  const output = result.output;
  if (!output || typeof output !== 'object') return false;
  return Boolean(output.full_text || output.content || output.draft_content);
}

function _isTriggerOnlyConversationResult(result: any): boolean {
  if (!result || typeof result !== 'object') return false;
  return Boolean(result.trigger) && !_hasPersistedGenerationResult(result);
}

function _synthesizeStages(result: any, content: string): StageInfo[] {
  const llmChunks = result?._llmChunks as Record<string, LLMChunk[]> | undefined;
  const generatedAgents = ['WritingAgent', 'FixAgent'].filter((agent) =>
    Boolean(llmChunks?.[agent]?.length)
  );

  if (generatedAgents.length > 0) {
    return generatedAgents.map((agent) => {
      const mapEntry = AGENT_STAGE_MAP[agent] || { label: '生成中', icon: '✍️' };
      return {
        agent,
        label: mapEntry.label,
        icon: mapEntry.icon,
        status: 'completed' as const,
      };
    });
  }

  const draftContent = result?._draftContent || result?.output?.draft_content;
  const finalContent = result?.output?.full_text || result?.output?.content || content;
  if (draftContent || finalContent) {
    const mapEntry = AGENT_STAGE_MAP.WritingAgent;
    return [{
      agent: 'WritingAgent',
      label: mapEntry.label,
      icon: mapEntry.icon,
      status: 'completed' as const,
    }];
  }

  return [];
}

function MessageBubble({
  message, copiedId, onCopy,
  runningTime,
  stages, currentStage, llmChunks, reasoningChunks, thinkingSteps,
}: {
  message: { id: string; role: string; content: string; timestamp: number; status?: string; result?: any; isConversationReply?: boolean; isGeneratedMessage?: boolean };
  copiedId: string | null;
  onCopy: (id: string, text: string) => void;
  thinkingSteps?: any[];
  runningTime?: number;
  stages?: StageInfo[];
  currentStage?: string | null;
  llmChunks?: Record<string, LLMChunk[]>;
  reasoningChunks?: Record<string, ReasoningChunk[]>;
}) {
  const handlePreview = useCallback(() => {
    if (!message.content) return;
    useAgentStore.getState().setPreviewContent(message.content);
  }, [message.content]);

  // 「最终产物」面板的展开状态：流式过程中默认折叠，避免撑高视口；完成后默认展开
  const [finalExpanded, setFinalExpanded] = useState(false);
  useEffect(() => {
    // 完成时默认展开；开始生成时重置为折叠
    if (message.status === 'running') {
      setFinalExpanded(false);
    } else if (message.status === 'completed' || (!message.status && message.content)) {
      setFinalExpanded(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message.status]);

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
    // ── 判断是对话回复还是生成结果 ──
    // 三种情况：
    //   1. isConversationReply === true → 对话回复（聊天气泡）
    //   2. status === 'running' 且 非对话回复 → 正在生成（展示 StageTimeline）
    //   3. result._stages 存在 → 已完成生成结果
    //   4. 其他（如后端 reload 的数据，无 result）→ 聊天气泡兜底
    const _isConvReply = message.isConversationReply === true;
    const _isGeneratedMessage = message.isGeneratedMessage === true;
    const _msgResult = message.result as any | null;
    const _hasGeneratedResult = _hasPersistedGenerationResult(_msgResult);
    const _isTriggerOnlyReply = _isTriggerOnlyConversationResult(_msgResult);
    const _isRunningGen = (message.status === 'running' && !_isConvReply) || _isGeneratedMessage;

    const _isChatBubble = (_isConvReply && !_isGeneratedMessage)
      || _isTriggerOnlyReply
      || (!_isRunningGen && !_hasGeneratedResult);
    if (_isChatBubble) {
      const isRunning = message.status === 'running';
      const isFailed = message.status === 'failed';
      return (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
          <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-app-elevated/60 border border-app-border/20 px-4 py-2.5">
            {isRunning && !message.content ? (
              <div className="flex items-center gap-1.5 py-1">
                <Bot className="w-4 h-4 text-blue-400 animate-pulse" />
                <span className="text-sm text-app-text-secondary">思考中</span>
                <span className="flex gap-0.5">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            ) : (
              <>
                <p className="text-sm text-app-text whitespace-pre-wrap leading-relaxed">{message.content}</p>
                {isRunning && (
                  <span className="inline-block w-2 h-4 bg-blue-400 ml-0.5 animate-pulse" />
                )}
              </>
            )}
            {!isRunning && !isFailed && (
              <p className="mt-1 text-[10px] text-app-text-tertiary">{formatTime(message.timestamp)}</p>
            )}
            {isFailed && (
              <p className="text-xs text-red-400 mt-1">回复失败</p>
            )}
          </div>
        </motion.div>
      );
    }

    const isRunning = message.status === 'running';
    const isFailed = message.status === 'failed';
    const displayContent = message.content || '';

    // Per-message stages/chunks: completed messages use stored data, not global state.
    // This prevents all messages from showing the same (latest) stages/chunks.
    const msgResult = message.result as any;
    const storedStages = Array.isArray(msgResult?._stages) ? msgResult._stages : [];
    const fallbackStages = storedStages.length === 0 ? _synthesizeStages(msgResult, displayContent) : storedStages;
    const displayStages = isRunning ? (stages || []) : fallbackStages;
    const displayCurrentStage = isRunning ? (currentStage || null) : null;
    const displayLlmChunks = isRunning
      ? (llmChunks || {})
      : (msgResult?._llmChunks || _fallbackLlmChunks(msgResult, displayContent));
    const displayReasoning = isRunning
      ? (reasoningChunks || {})
      : (msgResult?._reasoningChunks || {});
    const displayThinkingSteps = isRunning
      ? (thinkingSteps || [])
      : (msgResult?._thinkingSteps || []);

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
          {displayStages.length > 0 && (
            <StageTimeline
              stages={displayStages}
              currentStage={displayCurrentStage}
              isRunning={isRunning}
              llmChunks={displayLlmChunks}
              reasoningChunks={displayReasoning}
              thinkingSteps={displayThinkingSteps}
            />
          )}
          {/* 最终产物（可折叠：流式过程中默认折叠避免撑高视口，完成后默认展开） */}
          {displayContent && (
            <div className="mt-3 rounded-lg border border-white/[0.08] bg-white/[0.02] overflow-hidden">
              <button
                type="button"
                onClick={() => setFinalExpanded((v) => !v)}
                className="w-full flex items-center gap-2 px-3 py-2 border-b border-white/[0.06] hover:bg-white/[0.03] transition-colors text-left"
              >
                <span className="text-xs">🎯</span>
                <span className="text-xs font-medium text-app-text">最终产物</span>
                {!finalExpanded && (
                  <span className="text-[10px] text-app-text-tertiary/70 ml-1">
                    · {displayContent.length} 字
                  </span>
                )}
                <span className={cn(
                  'ml-auto text-app-text-tertiary/60 transition-transform duration-200',
                  finalExpanded && 'rotate-180',
                )}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 4L5 7L8 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </button>
              <AnimatePresence initial={false}>
                {finalExpanded && (
                  <motion.div
                    key="final-content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 py-2 text-sm text-app-text whitespace-pre-wrap leading-relaxed max-h-[60vh] overflow-y-auto">
                      {displayContent}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Failed message */}
          {isFailed && !displayContent && (
            <div className="text-sm text-red-400 py-1">请求失败，请重试</div>
          )}

          {/* Preview button & usage */}
          {!isRunning && displayContent && (
            <div className="flex items-center justify-between border-t border-app-border/30 pt-2">
              <Button
                onClick={handlePreview}
                variant="ghost"
                size="xs"
                className="text-app-text-tertiary hover:text-primary-400"
              >
                <Eye className="w-3.5 h-3.5 mr-1" />
                预览
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

const MessageBubbleMemo = React.memo(MessageBubble, (prev, next) => {
  // 仅当 message / copiedId 变化时重渲染；stages/llmChunks/reasoningChunks/thinkingSteps/runningTime
  // 变化不影响已完成的 message（displayStages 已优先用 message.result._stages），
  // 避免新流触发时所有历史 message 重新渲染导致 local state 反复重置。
  if (prev.message !== next.message) return false;
  if (prev.copiedId !== next.copiedId) return false;
  if (prev.onCopy !== next.onCopy) return false;
  return true;
});

