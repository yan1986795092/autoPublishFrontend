import { useState, useCallback, useRef, useEffect } from 'react';
import { useConversationStore } from '../stores/useConversationStore';
import { useAgentStore } from '../stores/useAgentStore';
import { useUIStore } from '../stores/useUIStore';
import { conversationApi } from '../services/api';
import { SSEProcessor } from '../services/sse-processor';
import { useAuthStore } from '../stores/useAuthStore';
import type { ConversationTrigger } from '../types';
import type { ChatMessage } from '../types/agent';

interface UseConversationChatReturn {
  isChatting: boolean;
  sendChatMessage: (text: string, platform?: string, contentType?: string) => Promise<void>;
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

  const sendChatMessage = useCallback(async (text: string, platform?: string, contentType?: string) => {
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
    const processor = new SSEProcessor();
    processorRef.current = processor;

    const abortController = new AbortController();
    abortControllerRef.current?.abort();
    abortControllerRef.current = abortController;

    const token = useAuthStore.getState().accessToken;

    processor.on('text', (event) => {
      const content = (event.data as any).content || '';
      accumulatedText += content;
      updateMessage(assistantId, { content: accumulatedText });
    });

    processor.on('text_cleanup', (event) => {
      accumulatedText = (event.data as any).content || '';
      updateMessage(assistantId, { content: accumulatedText });
    });

    processor.on('trigger', (event) => {
      triggerData = event.data as unknown as ConversationTrigger;
    });

    processor.on('done', async () => {
      updateMessage(assistantId, {
        status: 'completed',
        content: accumulatedText,
      });
      setIsChatting(false);

      if (triggerData && triggerData._prompt) {
        showToast('开始创作...', 'info');
        try {
          await runStreaming(
            triggerData._prompt || triggerData.topic || '',
            triggerData.platform,
            {
              action: triggerData.action,
              topic: triggerData.topic,
              platform: triggerData.platform,
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
      const errorMsg = (event.data as any).message || '对话出错';
      updateMessage(assistantId, {
        status: 'failed',
        content: accumulatedText || errorMsg,
      });
      setIsChatting(false);
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
        }),
      }, {
        onError(errorMsg) {
          updateMessage(assistantId, {
            status: 'failed',
            content: accumulatedText || errorMsg,
          });
          setIsChatting(false);
          showToast(errorMsg, 'error');
        },
      }, abortController.signal, 60_000);
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        updateMessage(assistantId, {
          status: 'failed',
          content: '连接对话服务失败',
        });
        setIsChatting(false);
        showToast('连接对话服务失败', 'error');
      }
    }
  }, [isChatting, addMessage, updateMessage, conversationId, runStreaming, showToast]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, []);

  return { isChatting, sendChatMessage };
}
