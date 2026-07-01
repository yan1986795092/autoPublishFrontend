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

interface UseConversationChatReturn {
  isChatting: boolean;
  sendChatMessage: (
    text: string,
    platform?: string,
    contentType?: string,
    preferences?: {
      creativity?: number;
      length?: 'short' | 'medium' | 'long';
      tone?: string;
      audience?: string;
    },
  ) => Promise<void>;
  /** 中止当前对话 SSE 连接（修复 BUG-25：让 handleStop 也能停对话阶段） */
  abort: () => void;
}

/**
 * 对话聊天 hook — 调用 /api/v1/conversation/chat SSE 端点
 *
 * 发消息给对话 LLM，流式接收回复文本。
 * 如果收到 trigger 事件，自动调用 Agent 的 runStreaming 进入生成流程。
 * platform/contentType 由前端 PlatformSelector 传入，让 LLM 跳过已确认信息。
 *
 * 消息添加统一由本 hook 处理，调用方只负责调用 sendChatMessage()。
 */
export function useConversationChat(): UseConversationChatReturn {
  const [isChatting, setIsChatting] = useState(false);
  const processorRef = useRef<SSEProcessor | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 使用 ConversationStore 管理消息
  const addMessage = useConversationStore((s) => s.addMessage);
  const updateMessage = useConversationStore((s) => s.updateMessage);
  const conversationId = useConversationStore((s) => s.conversationId);

  // Agent Store
  const runStreaming = useAgentStore((s) => s.runStreaming);
  const showToast = useUIStore((s) => s.showToast);

  const sendChatMessage = useCallback(async (
    text: string,
    platform?: string,
    contentType?: string,
    preferences?: {
      creativity?: number;
      length?: 'short' | 'medium' | 'long';
      tone?: string;
      audience?: string;
    },
  ) => {
    if (isChatting) return;
    setIsChatting(true);

    // 1. 插入用户消息
    const userMsgId = crypto.randomUUID();
    addMessage({
      id: userMsgId,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    } as ChatMessage);

    // 2. 插入 assistant 占位
    const assistantId = crypto.randomUUID();
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

    // 3. 连接对话 SSE
    let accumulatedText = '';
    let triggerData: ConversationTrigger | null = null;
    let settled = false;  // 防止 done/error 被重复触发，避免 isChatting 状态错乱
    const finalize = (status: 'completed' | 'failed', content: string) => {
      if (settled) return;
      settled = true;
      updateMessage(assistantId, { status, content });
      setIsChatting(false);
    };
    const processor = new SSEProcessor();
    processorRef.current = processor;

    const abortController = new AbortController();
    abortControllerRef.current?.abort();
    abortControllerRef.current = abortController;

    const token = useAuthStore.getState().accessToken;

    // 前端实时过滤 [GENERATE]...[/GENERATE] 块，确保流式过程中用户看不到它
    const GENERATE_BLOCK_RE = /\[GENERATE\]\s*(\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})\s*\[\/GENERATE\]/g;
    const filterGenerateBlock = (text: string): string =>
      text.replace(GENERATE_BLOCK_RE, '').trimEnd();

    // SSE 事件 data 的最小类型契约
    interface SseTextEvent { content?: string }
    interface SseErrorEvent { message?: string }

    processor.on('text', (event) => {
      const data = event.data as SseTextEvent;
      const rawContent = data.content || '';
      const filteredContent = filterGenerateBlock(rawContent);
      accumulatedText += filteredContent;
      updateMessage(assistantId, { content: accumulatedText });
    });

    processor.on('text_cleanup', (event) => {
      const data = event.data as SseTextEvent;
      accumulatedText = data.content || '';
      updateMessage(assistantId, { content: accumulatedText });
    });

    processor.on('trigger', (event) => {
      triggerData = event.data as unknown as ConversationTrigger;
    });

    processor.on('done', async () => {
      finalize('completed', accumulatedText);

      if (triggerData && triggerData._prompt) {
        // ── P0-2: 优先用 trigger.platform，回退到 message 头部解析的平台 ──
        // 解决对话 LLM 没把 platform 透传回 trigger 的边界场景。
        const PLATFORM_HINT_RE = /^\[目标平台：([^\]]+)\]\s*\n?/;
        let resolvedPlatform = triggerData.platform || null;
        if (!resolvedPlatform && text) {
          const m = text.match(PLATFORM_HINT_RE);
          if (m) {
            const labelToCode: Record<string, string> = {};
            for (const p of PUBLISHABLE_PLATFORMS) labelToCode[p.label] = p.id;
            for (const p of CONTENT_STYLES) labelToCode[p.label] = p.id;
            for (const p of PROFESSIONAL_STYLES) labelToCode[p.label] = p.id;
            resolvedPlatform = labelToCode[m[1].trim()] || null;
          }
        }
        showToast('开始创作...', 'info');
        try {
          await runStreaming(
            triggerData._prompt || triggerData.topic || '',
            resolvedPlatform || triggerData.platform || undefined,
            {
              action: triggerData.action,
              topic: triggerData.topic,
              platform: resolvedPlatform || triggerData.platform,
              style: triggerData.style,
              tone: triggerData.tone,
              audience: triggerData.audience,
              keywords: triggerData.keywords,
              length: triggerData.length,
              revision_focus: triggerData.revision_focus,
            },
            triggerData,
          );
        } catch (e) {
          console.error('runStreaming failed:', e);
          showToast('生成启动失败', 'error');
        }
      }
    });

    processor.on('error', (event) => {
      const data = event.data as SseErrorEvent;
      const errorMsg = data.message || '对话出错';
      finalize('failed', accumulatedText || errorMsg);
      showToast(errorMsg, 'error');
    });

    try {
      await processor.connect(conversationApi.chatUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: text,
          conversation_id: conversationId || undefined,
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
      if (err?.name !== 'AbortError') {
        finalize('failed', '连接对话服务失败');
        showToast('连接对话服务失败', 'error');
      } else {
        // 被 abort 时也要解锁按钮，防止快速连点后死锁
        setIsChatting(false);
      }
    } finally {
      // 兜底：若任何路径都没把 isChatting 重置（边缘 bug 导致 settled 未触发），
      // 这里强制解锁。setIsChatting 在 React 18 严格模式下幂等。
      // 用 microtask 推到下一拍，避免覆盖 done 的更新。
      queueMicrotask(() => {
        if (!settled) setIsChatting(false);
      });
    }
  }, [isChatting, addMessage, updateMessage, conversationId, runStreaming, showToast]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, []);

  // 修复 BUG-25：暴露 abort 方法，让 useExecutionEngine.handleStop 能停对话阶段
  const abort = useCallback(() => {
    processorRef.current?.abort();
    abortControllerRef.current?.abort();
    if (isChatting) setIsChatting(false);
  }, [isChatting]);

  return { isChatting, sendChatMessage, abort };
}
