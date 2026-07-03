import React, { useState, useCallback, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { LoadingDots } from '../ui/loading-dots';
import { MessageBubbleSkeleton, ChatBubbleSkeleton } from '../ui/skeleton';
import { useAgentEngine } from '../../hooks/useExecutionEngine';
import { useConversationChat } from '../../hooks/useConversationChat';
import { useAgentStore } from '../../stores/useAgentStore';
import { useConversationStore } from '../../stores/useConversationStore';
import { useUIStore } from '../../stores/useUIStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { formatDuration } from '../../utils/format';
import { cn } from '../../utils/helpers';
import {
  Send, Square, Bot,
  SlidersHorizontal, ArrowDown, PanelRight, Menu, X,
} from 'lucide-react';
import { AdvancedPanel } from './AdvancedPanel';
import { EmptyWorkspace } from './EmptyWorkspace';
import { MessageBubbleMemo } from './MessageBubble';
import { isPublishable, PLATFORM_MAP } from './PlatformSelector';


// ── Component ──

export interface WorkspaceProps {
  rightPanelOpen?: boolean;
  onToggleRightPanel?: () => void;
  mobileSidebarOpen?: boolean;
  onToggleMobileSidebar?: () => void;
}

export function Workspace({
  rightPanelOpen = true,
  onToggleRightPanel,
  mobileSidebarOpen = false,
  onToggleMobileSidebar,
}: WorkspaceProps) {
  // prompt 是 UI 本地状态（输入框内容），不属于 agent store
  const [prompt, setPrompt] = useState('');
  const engine = useAgentEngine();
  const {
    isRunning, runningTime,
    messages, currentResult, thinkingSteps, llmChunks, reasoningChunks,
    stages, currentStage, hasFirstEventReceived,
    handleStop: engineHandleStop,
    handleClearCurrent: engineClearCurrent,
  } = engine;

  // 修复 BUG-25 + #8：解构 abort 用于在 handleStop 中停掉对话 SSE
  // 引入 isGenerating 区分"对话阶段"（isChatting）和"生成阶段"（isGenerating）
  const { sendChatMessage, isChatting, isGenerating, abort: abortChat } = useConversationChat();

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // 修复 #8：保存发送前的 prompt，stop 时还原
  const pendingPromptRef = useRef<string | null>(null);

  // 修复 #8：统一 phase 状态机
  // - 'idle'    : 空闲，可以发送
  // - 'chat'    : 对话 LLM 流式回复中（对话阶段，可 stop）
  // - 'generating': Agent 生成中（生成阶段，可 stop）
  // isRunning | isGenerating 表示 Agent 阶段；isChatting 表示对话阶段
  const phase: 'idle' | 'chat' | 'generating' = isGenerating || isRunning
    ? 'generating'
    : isChatting
      ? 'chat'
      : 'idle';
  const isBusy = phase !== 'idle';

  // 修复 BUG-10：此前误用 useAgentStore.createConversation，
  // 实际会话列表由 useConversationStore 管理，导致点击"新对话"后列表 active 项不更新。
  // 这里正确使用对话 store 创建。
  const createConversation = useConversationStore((s) => s.createConversation);
  const showToast = useUIStore((s) => s.showToast);
  // 修复 BUG-15：避免用户连点"新对话"导致并发创建
  const [isCreating, setIsCreating] = useState(false);

  const handleNewConversation = useCallback(async () => {
    if (isCreating) return;
    setIsCreating(true);
    setPrompt('');
    void engineClearCurrent();
    try {
      const newId = await createConversation();
      if (!newId) {
        showToast('创建对话失败，请检查网络', 'error');
      }
    } catch (e) {
      showToast('创建对话失败', 'error');
      console.error('new conversation failed:', e);
    } finally {
      setIsCreating(false);
    }
  }, [isCreating, createConversation, engine, showToast, setPrompt]);

  // 修复 #8 + BUG-25：stop 按钮需要同时停掉 agent 流和对话流，
  // 并把 pending prompt 还原到输入框，让用户能编辑后重发。
  const handleStop = useCallback(() => {
    engineHandleStop();
    abortChat();
    if (pendingPromptRef.current) {
      setPrompt(pendingPromptRef.current);
      pendingPromptRef.current = null;
      // 让输入框重新拿到焦点，用户可继续编辑
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [engineHandleStop, abortChat, setPrompt]);

  // P4: 监听"对话切换中"事件——切对话时清 pendingPromptRef，避免 stale prompt
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => {
      pendingPromptRef.current = null;
    };
    window.addEventListener('app:conversation-switching', handler);
    return () => window.removeEventListener('app:conversation-switching', handler);
  }, []);

  // ── 选中平台/文体（左侧引导页 + 右侧预览画廊共享） ──
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(() => {
    // 修复 #7：刷新后从 localStorage 恢复平台选择
    try {
      return localStorage.getItem('autopublish-selected-platform');
    } catch {
      return null;
    }
  });

  // 修复 #7：平台选择变化时持久化到 localStorage
  useEffect(() => {
    try {
      if (selectedPlatform) {
        localStorage.setItem('autopublish-selected-platform', selectedPlatform);
      } else {
        localStorage.removeItem('autopublish-selected-platform');
      }
    } catch { /* 忽略 storage 错误 */ }
  }, [selectedPlatform]);

  // ── Params dialog ── 修复 #12：参数从 useSettingsStore 读写，自动持久化
  const [paramsOpen, setParamsOpen] = useState(false);
  const creationPreferences = useSettingsStore((s) => s.creationPreferences);
  const setCreationPreferences = useSettingsStore((s) => s.setCreationPreferences);
  // 兼容旧逻辑里使用的别名（handleSubmit 仍按 preferences 入参结构展开）
  const creativity = creationPreferences.creativity;
  const contentLength = creationPreferences.length;
  const tone = creationPreferences.tone;
  const audience = creationPreferences.audience;

  // ── 流式消息区滚动控制 ──
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);
  const scrollDueToProgramRef = useRef(false);
  const [isUserPinned, setIsUserPinned] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const PIN_THRESHOLD = 80;

  const isAtBottom = useCallback(() => {
    const el = scrollViewportRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight <= PIN_THRESHOLD;
  }, []);

  const handleScrollViewport = useCallback(() => {
    if (scrollDueToProgramRef.current) return;
    const atBottom = isAtBottom();
    setIsUserPinned((prev) => {
      if (atBottom && prev) {
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
    scrollDueToProgramRef.current = true;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto',
    });
    setIsUserPinned(false);
    setUnreadCount(0);
    setTimeout(() => { scrollDueToProgramRef.current = false; }, 0);
  }, []);

  // ── 输入框 auto-resize ──
  useEffect(() => {
    const ta = inputRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [prompt]);

  // P26: 累计 chunk 数量变化也要触发滚动。reasoning 流（30ms debounce）和
  //      body 流（120ms debounce）会让 StageTimeline / MessageBubble 高度增加，
  //      但 messages.length / stages.length 不变——之前 useLayoutEffect 不会触发，
  //      用户看到"屏幕卡住 + 内容继续在下方生长"。
  //      用累计 token 数作为"内容增长"的廉价信号。
  const totalLlmChunks = useMemo(
    () => Object.values(llmChunks).reduce((sum, arr) => sum + arr.length, 0),
    [llmChunks],
  );
  const totalReasoningChunks = useMemo(
    () => Object.values(reasoningChunks).reduce((sum, arr) => sum + arr.length, 0),
    [reasoningChunks],
  );
  const prevCountsRef = useRef({ messages: 0, stages: 0, llm: 0, reasoning: 0 });

  useLayoutEffect(() => {
    if (!isRunning) return;
    if (isUserPinned) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUnreadCount((c) => c + 1);
      return;
    }
    const el = scrollViewportRef.current;
    if (!el) return;

    const msgCount = messages.length;
    const stageCount = stages.length;
    const llmCount = totalLlmChunks;
    const reasoningCount = totalReasoningChunks;
    const prev = prevCountsRef.current;
    // 任何一个累计量增长都触发滚动（chunks 用 > 而非 !== 因为 key 增删不影响）
    const grew = msgCount > prev.messages
      || stageCount > prev.stages
      || llmCount > prev.llm
      || reasoningCount > prev.reasoning;

    if (grew) {
      prevCountsRef.current = {
        messages: msgCount,
        stages: stageCount,
        llm: llmCount,
        reasoning: reasoningCount,
      };
      scrollDueToProgramRef.current = true;
      const id = requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
        // P18: scroll 事件是异步派发的，setTimeout(0) 太短导致 flag 过早复位，
        //     用户在滚动动画期间手滚会被误判为主动滚动 → unreadCount 误增。
        //     用 rAF 后的 100ms 给浏览器留足时间派发 scroll 事件，再复位 flag。
        setTimeout(() => { scrollDueToProgramRef.current = false; }, 100);
      });
      return () => cancelAnimationFrame(id);
    }
  }, [isRunning, isUserPinned, messages.length, stages.length, totalLlmChunks, totalReasoningChunks]);

  useEffect(() => {
    if (isRunning) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsUserPinned(false);
      setUnreadCount(0);
    }
  }, [isRunning]);

  const handleSubmit = useCallback(async (overridePrompt?: string) => {
    const text = (overridePrompt ?? prompt).trim();
    if (!text || isBusy) return;
    // 修复 #8：把待发送内容存进 ref，stop 时还原到输入框
    pendingPromptRef.current = text;
    setPrompt('');
    // 非发布类文体（如 tutorial/seo）作为 contentType 传给对话 LLM，让 trigger 阶段少问文体。
    const contentType = selectedPlatform && !isPublishable(selectedPlatform) ? selectedPlatform : undefined;
    useAgentStore.getState().setPreviewPlatform(selectedPlatform);
    useAgentStore.getState().setPreviewContentType(contentType || null);
    // ── P0-2: 当用户已选平台时，把平台强约束追加到 message 头部，
    //   这样即使对话 LLM 在 trigger 阶段漏掉 platform 透传，
    //   后续 stream 端也能从 trigger._prompt 里恢复平台 DNA。──
    const platformHint = selectedPlatform
      ? PLATFORM_MAP.get(selectedPlatform)?.label || selectedPlatform
      : '';
    const enrichedText = platformHint
      ? `[目标平台：${platformHint}]\n${text}`
      : text;
    // 修复 BUG-4：把生成参数一并发送，让对话 LLM 在决定 trigger 时把这些当作用户偏好
    await sendChatMessage(enrichedText, selectedPlatform || undefined, contentType, {
      creativity,
      length: contentLength,
      tone,
      audience,
    });
    // 发送完成（不管成功失败）清掉 pending
    pendingPromptRef.current = null;
  }, [prompt, isBusy, setPrompt, sendChatMessage, selectedPlatform, creativity, contentLength, tone, audience]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // 修复 BUG-14：第二个 if 缺少 !e.shiftKey 防御，
    // 导致 Cmd/Ctrl+Shift+Enter 也会意外提交。统一用 !e.shiftKey 区分"换行 vs 提交"。
    if (e.key === 'Enter' && !e.shiftKey && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Enter' && !e.shiftKey) {
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
      {/* 左侧：消息区 + 输入区 */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* 修复 BUG-11：mobile (<md) 顶部工具栏 — 打开对话历史侧栏 + 切换右栏 */}
        {onToggleMobileSidebar && (
          <div className="md:hidden flex items-center gap-1 px-3 py-2 border-b border-app-border bg-app-surface flex-shrink-0">
            <button
              onClick={onToggleMobileSidebar}
              className="w-8 h-8 rounded-md flex items-center justify-center text-app-text-tertiary hover:text-app-text hover:bg-app-hover transition-colors"
              title={mobileSidebarOpen ? '关闭对话列表' : '打开对话列表'}
              aria-label="对话列表"
              aria-expanded={mobileSidebarOpen}
            >
              {mobileSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
            <span className="text-xs font-medium text-app-text-secondary truncate">对话</span>
            <div className="ml-auto flex items-center gap-1">
              {onToggleRightPanel && (
                <button
                  onClick={onToggleRightPanel}
                  className="w-8 h-8 rounded-md flex items-center justify-center text-app-text-tertiary hover:text-app-text hover:bg-app-hover transition-colors"
                  title={rightPanelOpen ? '隐藏预览' : '显示预览'}
                >
                  <PanelRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* 消息容器 — 统一背景 */}
        <div className="flex-1 min-h-0 flex flex-col px-6 py-4">
          <div className="flex-1 bg-app-surface rounded-xl border border-app-border overflow-hidden flex flex-col min-h-0">
            <ScrollArea
              className="flex-1 p-4"
              viewportRef={scrollViewportRef}
              onViewportScroll={handleScrollViewport}
            >
              <div className="max-w-3xl mx-auto space-y-4 relative">
                {isIdle ? (
                  <EmptyWorkspace
                    selectedPlatform={selectedPlatform}
                    onSelectPlatform={setSelectedPlatform}
                    onSelect={(s) => { setPrompt(s); inputRef.current?.focus(); }}
                    onCtaClick={(s) => {
                      setPrompt(s);
                      inputRef.current?.focus();
                      // 修复 #6：一帧后自动提交（绕过闭包 stale prompt）
                      requestAnimationFrame(() => {
                        if (!isBusy) handleSubmit(s);
                      });
                    }}
                  />
                ) : (
                  <>
                    {/* Agent 运行中显示骨架屏 */}
                    {isRunning && !hasFirstEventReceived && (
                      <>
                        <ChatBubbleSkeleton />
                        <MessageBubbleSkeleton />
                      </>
                    )}
                    {messages.map((msg, idx) => {
                      // 找到上一条 user 消息（用于"重试"功能）
                      const prevUserMsg = idx > 0
                        ? [...messages.slice(0, idx)].reverse().find((m) => m.role === 'user')
                        : null;
                      // P5: 重试时保留原 platform + 生成参数，避免产物质量不同
                      const retryPlatform = selectedPlatform
                        || (msg as any).renderPayload?.platform
                        || (msg as any).generationMeta?.platform
                        || null;
                      const handleRetry = (msgId: string, _prompt: string) => {
                        // 优先用原 user prompt，避免 content 是 placeholder
                        const promptToUse = prevUserMsg?.content || _prompt;
                        if (!promptToUse) return;
                        // 取消当前任务并用原 prompt 重新生成
                        // engine.handleStop 会停 SSE + 断 WS
                        engine.handleStop();
                        // 异步重新发请求（让 abort 先走完）
                        setTimeout(() => {
                          // runStreaming 在 useAgentStore 上，不在 engine 上
                          // 保留 platform + 参数，与原生成一致
                          useAgentStore.getState().runStreaming(
                            promptToUse,
                            retryPlatform,
                            { creativity, length: contentLength, tone, audience },
                          );
                        }, 50);
                      };
                      return (
                        <MessageBubbleMemo
                          key={msg.id}
                          message={msg}
                          copiedId={copiedId}
                          onCopy={handleCopy}
                          onRetry={handleRetry}
                          thinkingSteps={thinkingSteps}
                          runningTime={runningTime}
                          stages={stages}
                          currentStage={currentStage}
                          llmChunks={llmChunks}
                          reasoningChunks={reasoningChunks}
                        />
                      );
                    })}
                  </>
                )}

                {/* Running indicator — 修复 #1：判断改为"isRunning 但还没产生消息"，避免与气泡叠加 */}
                {isRunning && !hasFirstEventReceived && messages.length === 0 && (
                  <div className="flex items-center gap-2 text-xs text-app-text-tertiary px-1">
                    <Bot className="w-4 h-4 text-primary-400 animate-pulse" />
                    <span>思考中</span>
                    <LoadingDots color="var(--color-primary-400)" size={6} />
                    <span className="ml-auto text-[10px]">{formatDuration(runningTime)}</span>
                  </div>
                )}

                {/* 回到最新按钮 */}
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
                      className="sticky bottom-2 left-full -translate-x-2 ml-2 mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary-500/90 hover:bg-primary-500 text-white px-3 py-1.5 text-xs font-medium shadow-lg shadow-primary-500/20 transition-colors"
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
          </div>
        </div>

        {/* Toolbar — 非透明背景 */}
        <div className="flex-shrink-0 flex items-center gap-2 px-6 py-2">
          <button
            onClick={() => setParamsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-app-border bg-app-elevated text-[10px] text-app-text-secondary hover:text-app-text hover:border-primary-500/30 hover:bg-primary-500/5 transition-colors"
          >
            <SlidersHorizontal className="w-3 h-3" />
            参数
          </button>
          {hasEvents && !isRunning && (
            <button
              onClick={handleNewConversation}
              disabled={isCreating}
              className="ml-auto text-[10px] text-app-text-tertiary hover:text-app-text-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? '创建中...' : '新对话'}
            </button>
          )}
        </div>

        {/* Input */}
        <div className="flex-shrink-0 px-6 pb-4">
          <div className="max-w-3xl mx-auto">
            {/* 修复 #5：平台选择视觉指示器 */}
            {selectedPlatform && (
              <div className="mb-1.5 flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full border border-primary-500/30 bg-primary-500/10 px-2.5 py-0.5 text-[10px] font-medium text-primary-300">
                  {(() => {
                    const p = PLATFORM_MAP.get(selectedPlatform);
                    return <>{p?.icon ?? '📌'} {p?.label ?? selectedPlatform}</>;
                  })()}
                  <button
                    onClick={() => setSelectedPlatform(null)}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-primary-500/20 transition-colors"
                    title="取消选择"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
                <span className="text-[9px] text-app-text-tertiary/50">将作为目标平台</span>
              </div>
            )}
            <div className="flex items-end gap-2 rounded-xl border border-app-border bg-app-elevated px-4 py-3">
              <textarea
                ref={inputRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入你的需求... (支持小红书笔记、公众号文章、代码、脚本等)"
                aria-label="创作指令输入框"
                aria-describedby="input-hint"
                className="flex-1 min-h-[44px] max-h-[120px] resize-none bg-transparent text-sm text-app-text placeholder:text-app-text-tertiary outline-none leading-relaxed"
                rows={1}
              />
              {/* 修复 #8：统一 phase 状态机驱动按钮 */}
              {isBusy ? (
                <Button
                  onClick={handleStop}
                  className="h-9 px-3 flex-shrink-0"
                  variant="destructive"
                  size="sm"
                  aria-label="停止生成"
                  title={phase === 'chat' ? '停止对话' : '停止生成'}
                >
                  <Square className="w-3.5 h-3.5" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={!prompt.trim() || isBusy}
                  className="h-9 px-4 flex-shrink-0 gap-1.5"
                  size="sm"
                  aria-label="发送消息"
                >
                  <Send className="w-3.5 h-3.5" />
                  发送
                </Button>
              )}
            </div>
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-[10px] text-app-text-tertiary/50">
                {prompt.length > 0 && (
                  <span className="mr-3">{prompt.length} 字</span>
                )}
                <kbd className="px-1 py-0.5 rounded border border-app-border/50 bg-app-surface text-[9px] font-mono text-app-text-tertiary/60 mr-1">Enter</kbd>
                <span className="text-app-text-tertiary/40">或</span>
                <kbd className="mx-1 px-1 py-0.5 rounded border border-app-border/50 bg-app-surface text-[9px] font-mono text-app-text-tertiary/60">⌘↵</kbd>
                <span className="text-app-text-tertiary/40 ml-1">发送</span>
                <span className="mx-2 text-app-border/30">·</span>
                <kbd className="px-1 py-0.5 rounded border border-app-border/50 bg-app-surface text-[9px] font-mono text-app-text-tertiary/60 mr-1">⇧</kbd>
                <span className="text-app-text-tertiary/40">Enter 换行</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 右侧：预览面板 */}
      {rightPanelOpen && (
        <AdvancedPanel
          selectedPlatform={selectedPlatform}
          onCollapse={onToggleRightPanel}
        />
      )}
      {!rightPanelOpen && onToggleRightPanel && (
        <button
          onClick={onToggleRightPanel}
          className="flex-shrink-0 border-l border-app-border bg-app-surface/50 hover:bg-app-surface flex items-center justify-center w-8 transition-colors"
          title="展开预览面板"
        >
          <PanelRight className="w-3.5 h-3.5 text-app-text-tertiary" />
        </button>
      )}

      {/* Params Dialog */}
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
                type="range" min="0" max="1" step="0.1" value={creativity}
                onChange={(e) => setCreationPreferences({ creativity: parseFloat(e.target.value) })}
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
                    onClick={() => setCreationPreferences({ length: l })}
                    className={cn(
                      'flex-1 rounded-lg border px-3 py-1.5 text-xs transition-colors',
                      contentLength === l
                        ? 'border-primary-500/50 bg-primary-500/10 text-primary-400'
                        : 'border-app-border text-app-text-secondary'
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
                    onClick={() => setCreationPreferences({ tone: t.id })}
                    className={cn(
                      'rounded-full px-3 py-1 text-xs transition-colors',
                      tone === t.id
                        ? 'bg-primary-500/20 text-primary-400 ring-1 ring-primary-500/30'
                        : 'bg-app-elevated text-app-text-secondary border border-app-border'
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
                    onClick={() => setCreationPreferences({ audience: a.id })}
                    className={cn(
                      'flex-1 rounded-lg border px-3 py-1.5 text-xs transition-colors',
                      audience === a.id
                        ? 'border-primary-500/50 bg-primary-500/10 text-primary-400'
                        : 'border-app-border text-app-text-secondary'
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

