import { useState, useCallback, useRef, useEffect } from 'react';
import { useConversationStore } from '../stores/useConversationStore';
import { useAgentStore } from '../stores/useAgentStore';
import { useUIStore } from '../stores/useUIStore';
import { conversationApi } from '../services/api';
import { SSEProcessor } from '../services/sse-processor';
import { useAuthStore } from '../stores/useAuthStore';
import type { ConversationTrigger } from '../types';
import type { ChatMessage } from '../types/agent';
import { PUBLISHABLE_PLATFORMS, CONTENT_STYLES, PROFESSIONAL_STYLES } from '../components/agent/PlatformSelector';

interface Preferences {
  creativity?: number;
  length?: 'short' | 'medium' | 'long';
  tone?: string;
  audience?: string;
}

// P17: 把 platform label→code 提到模块级，trigger 回调里直接复用
const PLATFORM_LABEL_TO_CODE: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const p of PUBLISHABLE_PLATFORMS) map[p.label] = p.id;
  for (const p of CONTENT_STYLES) map[p.label] = p.id;
  for (const p of PROFESSIONAL_STYLES) map[p.label] = p.id;
  return map;
})();

// P15: 对话聊天的 text 事件 throttle 间隔（与 useAgentStore._MSG_UPDATE_INTERVAL 对齐）
const CHAT_TEXT_UPDATE_INTERVAL = 50;
const PLATFORM_HINT_RE = /^\[目标平台：([^\]]+)\]\s*\n?/;

interface UseConversationChatReturn {
  isChatting: boolean;
  /** 当前是否处于生成阶段（useAgentStore.isRunning） */
  isGenerating: boolean;
  sendChatMessage: (
    text: string,
    platform?: string,
    contentType?: string,
    preferences?: Preferences,
  ) => Promise<void>;
  /**
   * 中止当前对话 SSE + 触发链。
   * 修复 BUG-25：让 Workspace 的 handleStop 能同时停对话阶段和生成阶段。
   */
  abort: () => void;
}

/**
 * 对话聊天 hook — 调用 /api/v1/conversation/chat SSE 端点
 *
 * 流程：
 * 1) 发消息给对话 LLM，流式接收回复文本
 * 2) 收到 trigger → 调 Agent runStreaming 进入生成阶段
 * 3) 没收到 trigger → 把对话回复持久化到后端（修复 #3 刷新即丢）
 * 4) trigger 处理移到 on('trigger')，on('done') 只 await 它完成（修复 #4 时序）
 */
export function useConversationChat(): UseConversationChatReturn {
  const [isChatting, setIsChatting] = useState(false);
  const isGenerating = useAgentStore((s) => s.isRunning);
  const processorRef = useRef<SSEProcessor | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  // 跟踪本次对话的用户消息 ID，用于对话阶段把 user 消息持久化到后端
  const userMsgIdRef = useRef<string | null>(null);
  const persistTokenRef = useRef(0); // 自增：每次 send 自增；abort / 失败时用快照判断
  // P21: 用 ref 让 abort() 能 finalize 当前活跃的 assistant placeholder，
  //     避免 SSE 被 abort 后 placeholder 永远 stuck 在 status='running'。
  //     accumulatedText 同步镜像在此，让 abort 路径能拿到最后一次内容。
  const activeAssistantIdRef = useRef<string | null>(null);
  const activeAccumulatedRef = useRef<string>('');
  // 修复 #3（isChatting 竞态）：用 ref 做操作守卫，避免 React 闭包过时导致双击穿透
  const isChattingRef = useRef(false);
  // 修复 #8（对话超时）：对话阶段 60 秒无 done/error 则自动 abort
  const chatTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addMessage = useConversationStore((s) => s.addMessage);
  const updateMessage = useConversationStore((s) => s.updateMessage);
  const conversationId = useConversationStore((s) => s.conversationId);

  const runStreaming = useAgentStore((s) => s.runStreaming);
  const stopAgentStreaming = useAgentStore((s) => s.stopStreaming);
  const showToast = useUIStore((s) => s.showToast);

  /**
   * 把对话消息持久化到后端。
   * 用于：
   *  - 触发 trigger 的场景（让对话历史里有这次回复）
   *  - 纯对话场景（无 trigger 时，刷新页面也不丢，修复 #3）
   */
  const persistAssistantMessage = useCallback(
    async (token: number, content: string, conversationIdAtSend: string | null) => {
      // token 不一致说明已被新一次 send / abort 取消
      if (token !== persistTokenRef.current) return;
      if (!conversationIdAtSend) return;
      try {
        const { chatApi } = await import('../services/api');
        await chatApi.addMessage(conversationIdAtSend, {
          role: 'assistant',
          content,
          status: 'completed',
        });
      } catch (e) {
        // 静默失败：本地已经有完整内容，后端补写是非关键的
        console.warn('[persistAssistantMessage] failed:', e);
      }
    },
    [],
  );

  const sendChatMessage = useCallback(async (
    text: string,
    platform?: string,
    contentType?: string,
    preferences?: Preferences,
  ) => {
    // 修复 #3（isChatting 竞态）：用 ref 而非闭包 state，防止旧值导致双击穿透
    if (isChattingRef.current) return;
    isChattingRef.current = true;

    // 抢占：自增 token，旧的 send / abort 失效
    persistTokenRef.current += 1;
    const myToken = persistTokenRef.current;

    setIsChatting(true);

    // 1. 插入用户消息（本地 + 立即异步持久化到后端）
    const userMsgId = crypto.randomUUID();
    userMsgIdRef.current = userMsgId;
    addMessage({
      id: userMsgId,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    } as ChatMessage);

    const conversationIdAtSend = conversationId || null;
    if (conversationIdAtSend) {
      // 修复 BUG-C5：持久化失败时给用户提示，而不只是 console.warn
      try {
        const { chatApi } = await import('../services/api');
        chatApi.addMessage(conversationIdAtSend, {
          role: 'user',
          content: text,
          status: 'completed',
        }).catch((e) => {
          console.warn('[persistUserMessage] failed:', e);
          showToast('消息保存失败，刷新页面后可能丢失，请检查网络', 'error');
        });
      } catch {
        // 忽略 import 失败
      }
    }

    // 2. 插入 assistant 占位
    const assistantId = crypto.randomUUID();
    // P21: 暴露到 ref，让 abort() 在 SSE 被中断后能 finalize placeholder
    activeAssistantIdRef.current = assistantId;
    activeAccumulatedRef.current = '';
    addMessage({
      id: assistantId,
      role: 'assistant',
      content: '',
      status: 'running',
      timestamp: Date.now(),
      kind: 'conversation',
      renderMode: 'bubble',
      renderPayload: null,
      generationMeta: null,
    } as ChatMessage);

    // 3. SSE 处理
    let accumulatedText = '';
    let triggerData: ConversationTrigger | null = null;
    let triggerPromise: Promise<void> | null = null;
    let settled = false;

    const finalize = (status: 'completed' | 'failed', content: string) => {
      if (settled) return;
      settled = true;
      isChattingRef.current = false; // 修复 #3：ref 与 state 同步
      updateMessage(assistantId, { status, content });
      setIsChatting(false);
      // 持久化对话回复（#3：刷新页面不丢）
      void persistAssistantMessage(myToken, content, conversationIdAtSend);
      // 修复 #8：清理超时定时器
      if (chatTimeoutRef.current) {
        clearTimeout(chatTimeoutRef.current);
        chatTimeoutRef.current = null;
      }
    };

    const processor = new SSEProcessor();
    processorRef.current = processor;

    const abortController = new AbortController();
    abortControllerRef.current?.abort();
    abortControllerRef.current = abortController;

    const token = useAuthStore.getState().accessToken;

    interface SseTextEvent { content?: string }
    interface SseErrorEvent { message?: string }
    interface SseDoneEvent { conversation_id?: string; message_id?: string | null }

    // P15: chat text 事件 50ms throttle，节流频繁 set/updateMessage → 减少 MessageBubble 重渲染
    //     用 ref 而不是 closure-local，让 abort/onSwitch 路径能 flush 残留。
    const chatTextTimer: { current: ReturnType<typeof setTimeout> | null } = { current: null };
    const chatTextDirty: { current: boolean } = { current: false };
    const flushChatText = () => {
      chatTextTimer.current = null;
      if (chatTextDirty.current) {
        chatTextDirty.current = false;
        updateMessage(assistantId, { content: accumulatedText });
      }
    };
    const scheduleChatTextFlush = () => {
      if (chatTextTimer.current) {
        chatTextDirty.current = true;
        return;
      }
      updateMessage(assistantId, { content: accumulatedText });
      chatTextTimer.current = setTimeout(flushChatText, CHAT_TEXT_UPDATE_INTERVAL);
    };

    processor.on('text', (event) => {
      const data = event.data as SseTextEvent;
      // v3 改造：对话 LLM 已不再输出 [GENERATE]{json}[/GENERATE] 文本标记，
      // 所有触发统一通过 trigger_generation 工具调用完成。
      // 这里直接累加文本即可（不再需要 filterGenerateBlock）。
      const text = data.content || '';
      if (!text) return;
      accumulatedText += text;
      activeAccumulatedRef.current = accumulatedText; // P21: 暴露给 abort 路径
      scheduleChatTextFlush();
    });

    processor.on('text_cleanup', (event) => {
      const data = event.data as SseTextEvent;
      accumulatedText = data.content || '';
      activeAccumulatedRef.current = accumulatedText; // P21
      // text_cleanup 是替换而非追加，立即刷一次不受 throttle 影响
      if (chatTextTimer.current) {
        clearTimeout(chatTextTimer.current);
        chatTextTimer.current = null;
        chatTextDirty.current = false;
      }
      updateMessage(assistantId, { content: accumulatedText });
    });

    // 修复 #4：trigger 处理移到 on('trigger')，on('done') 只 await 它完成
    processor.on('trigger', (event) => {
      triggerData = event.data as unknown as ConversationTrigger;
      if (!triggerData?._prompt) return;

      triggerPromise = (async () => {
        // P17: 用模块级 PLATFORM_LABEL_TO_CODE（不再每次重建 3 个 hash）
        let resolvedPlatform = triggerData!.platform || null;
        if (!resolvedPlatform && text) {
          const m = text.match(PLATFORM_HINT_RE);
          if (m) {
            resolvedPlatform = PLATFORM_LABEL_TO_CODE[m[1].trim()] || null;
          }
        }

        if (myToken !== persistTokenRef.current) return;

        showToast('开始创作...', 'info');
        try {
          await runStreaming(
            triggerData!._prompt || triggerData!.topic || '',
            resolvedPlatform || triggerData!.platform || undefined,
            {
              action: triggerData!.action,
              topic: triggerData!.topic,
              platform: resolvedPlatform || triggerData!.platform,
              style: triggerData!.style,
              tone: triggerData!.tone,
              audience: triggerData!.audience,
              keywords: triggerData!.keywords,
              length: triggerData!.length,
              revision_focus: triggerData!.revision_focus,
              // 把后端 trigger.parameters（来自 preferences）也透传
              ...(triggerData as any).parameters,
            },
            triggerData as any,
          );
        } catch (e) {
          console.error('runStreaming failed:', e);
          showToast('生成启动失败', 'error');
        }
      })();
    });

    processor.on('done', async (event) => {
      // P22: 后端返回的 conversation_id 可能与前端不同（新对话已自动创建），
      //       此处把 store.conversationId 同步到真实 ID，避免后续切走对话
      //       导致 placeholder 找不到归宿。message_id 暂不映射（前端已用临时 UUID）。
      try {
        const data = (event?.data ?? {}) as SseDoneEvent;
        if (data.conversation_id) {
          const convState = useConversationStore.getState();
          if (convState.conversationId !== data.conversation_id) {
            // 注意：只在当前 store 的 conversationId 为空（首次发消息场景）时同步
            // 已存在的对话不动（避免把用户切走的新对话又拉回来）
            if (!convState.conversationId) {
              useConversationStore.setState({ conversationId: data.conversation_id });
            }
          }
        }
      } catch {
        // 静默：done 事件格式异常不应阻塞 finalize
      }

      // 等 trigger 链处理完，避免 done 先 finalize 把 isChatting 置回 false
      // 但 trigger 流跑 agent 是分钟级，最终 isChatting 由 agent 阶段结束或 abort 控制
      // 这里只 finalize 对话阶段（已完成），让 isChatting=false
      // trigger 阶段用 isGenerating 跟踪
      if (triggerPromise) {
        // 不 await，让 done 不被阻塞；triggerPromise 在后台继续
        // 但如果 triggerPromise 抛错，要避免 unhandled rejection
        triggerPromise.catch(() => {});
      } else if (typeof window !== 'undefined') {
        // 前端兜底：done 到达时若没收到 trigger 事件，且 LLM 输出包含"开始创作"
        // 等明确信号词 + 用户消息含生成关键词，主动用本地 platform/content_type/preferences
        // 触发生成（防止后端 trigger 解析失败 / SSE 漏发导致用户卡住）
        const _llmText = (accumulatedText || '').trim();
        const _readySignals = ['开始创作', '信息够了', '开始生成', '准备好了', '开始吧'];
        const _userText = (text || '').toLowerCase();
        const _genKeywords = ['写', '生成', '重新生成', '重写', '再来一份', '写一份', '生成一份', '来一份'];
        const _wantsGen = _genKeywords.some((kw) => _userText.includes(kw.toLowerCase()));
        const _looksReady = _readySignals.some((s) => _llmText.includes(s));
        if (_looksReady && _wantsGen && !useAgentStore.getState().isRunning) {
          try {
            // 提取用户原文（剥离 [目标平台：xxx]\n 前缀）
            const _stripHint = _userText.replace(/^\[目标平台：[^\]]+\]\s*\n?/i, '');
            const _platform = platform || undefined;
            await runStreaming(_stripHint, _platform, {
              action: 'create',
              topic: _stripHint,
              platform: _platform,
              tone: preferences?.tone,
              length: preferences?.length,
              audience: preferences?.audience,
              ...(contentType ? { style: contentType } : {}),
            } as Record<string, unknown>);
            showToast('已开始创作', 'success');
          } catch (e) {
            console.error('[fallback runStreaming] failed:', e);
          }
        }
      }
      // P21: flush throttle 残留，确保 placeholder 显示最终文本（不被 throttle 缓冲吞掉）
      if (chatTextTimer.current) {
        clearTimeout(chatTextTimer.current);
        flushChatText();
      }
      finalize('completed', accumulatedText);
    });

    processor.on('error', (event) => {
      const data = event.data as SseErrorEvent;
      const msg = data.message || '对话出错';
      // P21: flush throttle 残留后 finalize，避免 placeholder stuck 在生成中
      if (chatTextTimer.current) {
        clearTimeout(chatTextTimer.current);
        flushChatText();
      }
      finalize('failed', accumulatedText || msg);
      showToast(msg, 'error');
    });

    // 修复 #8（对话超时）：60 秒无 done/error 则自动 abort
    chatTimeoutRef.current = setTimeout(() => {
      if (!settled) {
        abortController.abort();
        processorRef.current?.abort();
        finalize('failed', '对话回复超时，请重试');
        showToast('对话回复超时，请重试', 'error');
      }
    }, 60_000);

    try {
      await processor.connect(conversationApi.chatUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: text,
          conversation_id: conversationIdAtSend || undefined,
          platform: platform || undefined,
          content_type: contentType || undefined,
          preferences: preferences && Object.keys(preferences).length > 0 ? preferences : undefined,
        }),
      }, {
        onError(errorMsg) {
          finalize('failed', accumulatedText || errorMsg);
          showToast(errorMsg, 'error');
        },
      }, abortController.signal, 60_000);
    } catch (e: unknown) {
      const err = e as { name?: string };
      // 修复 #8：清理超时定时器
      if (chatTimeoutRef.current) {
        clearTimeout(chatTimeoutRef.current);
        chatTimeoutRef.current = null;
      }
      if (err?.name !== 'AbortError') {
        finalize('failed', '连接对话服务失败');
        showToast('连接对话服务失败', 'error');
      } else {
        setIsChatting(false);
      }
    } finally {
      queueMicrotask(() => {
        if (!settled) {
          isChattingRef.current = false;
          setIsChatting(false);
        }
      });
    }
  }, [isChatting, addMessage, updateMessage, conversationId, runStreaming, showToast, persistAssistantMessage]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, []);

  // 修复 #5：监听全局"切对话"事件，自停 SSE
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onSwitch = () => {
      persistTokenRef.current += 1;
      processorRef.current?.abort();
      abortControllerRef.current?.abort();
      // P21: finalize 当前 placeholder，避免 status='running' 残留
      const aid = activeAssistantIdRef.current;
      if (aid) {
        const convState = useConversationStore.getState();
        const msg = convState.messages.find((m) => m.id === aid);
        if (msg && msg.status === 'running') {
          convState.updateMessage(aid, { status: 'failed', content: msg.content || '已取消' });
        }
        activeAssistantIdRef.current = null;
      }
      // 注：throttle 定时器是 sendChatMessage 的 closure-local，外部无法触达，
      //     但其 flush 只会调 updateMessage（写入 msg.content），而下一步 finalize
      //     已把 placeholder 置为 failed——定时器最多迟到一次空 write，无副作用。
      isChattingRef.current = false; // 修复 #3
      if (isChatting) setIsChatting(false);
    };
    window.addEventListener('app:conversation-switching', onSwitch);
    return () => window.removeEventListener('app:conversation-switching', onSwitch);
  }, [isChatting]);

  const abort = useCallback(() => {
    // 自增 token，让所有进行中的持久化和 trigger 链作废
    persistTokenRef.current += 1;
    // 修复 #8：清理对话超时定时器
    if (chatTimeoutRef.current) {
      clearTimeout(chatTimeoutRef.current);
      chatTimeoutRef.current = null;
    }
    processorRef.current?.abort();
    abortControllerRef.current?.abort();
    // 同时停 agent 流
    stopAgentStreaming();
    // P21: finalize 当前 placeholder，避免 status='running' 残留
    const aid = activeAssistantIdRef.current;
    if (aid) {
      const convState = useConversationStore.getState();
      const msg = convState.messages.find((m) => m.id === aid);
      if (msg && msg.status === 'running') {
        convState.updateMessage(aid, { status: 'failed', content: msg.content || '已取消' });
      }
      activeAssistantIdRef.current = null;
    }
    isChattingRef.current = false; // 修复 #3
    if (isChatting) setIsChatting(false);
  }, [isChatting, stopAgentStreaming]);

  return { isChatting, isGenerating, sendChatMessage, abort };
}