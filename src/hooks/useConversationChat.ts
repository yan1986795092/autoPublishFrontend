import { useState, useCallback, useRef } from 'react';
import { useAgentStore } from '../stores/useAgentStore';
import { useUIStore } from '../stores/useUIStore';
import { conversationApi } from '../services/api';
import { SSEProcessor } from '../services/sse-processor';
import { useAuthStore } from '../stores/useAuthStore';
import type { ConversationTrigger } from '../types';

interface UseConversationChatReturn {
  isChatting: boolean;
  sendChatMessage: (text: string) => Promise<void>;
}

/**
 * 对话聊天 hook — 调用 /api/v1/conversation/chat SSE 端点
 *
 * 发消息给对话 LLM，流式接收回复文本。
 * 如果收到 trigger 事件，自动调用 Agent 的 runStreaming 进入生成流程。
 */
export function useConversationChat(): UseConversationChatReturn {
  const [isChatting, setIsChatting] = useState(false);
  const processorRef = useRef<SSEProcessor | null>(null);

  const addMessage = useAgentStore((s) => s.addMessage);
  const updateMessage = useAgentStore((s) => s.updateMessage);
  const conversationId = useAgentStore((s) => s.conversationId);
  const runStreaming = useAgentStore((s) => s.runStreaming);
  const showToast = useUIStore((s) => s.showToast);

  const sendChatMessage = useCallback(async (text: string) => {
    if (isChatting) return;
    setIsChatting(true);

    // 1. 先插入用户消息（调用方已在 Workspace 中做了，但为了 hook 独立，这里也做）
    const userMsgId = crypto.randomUUID();
    addMessage({
      id: userMsgId,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    });

    // 2. 插入 assistant 占位
    const assistantId = crypto.randomUUID();
    addMessage({
      id: assistantId,
      role: 'assistant',
      content: '',
      status: 'running',
      timestamp: Date.now(),
      isConversationReply: true,
    });

    // 3. 连接对话 SSE
    let accumulatedText = '';
    let triggerData: ConversationTrigger | null = null;
    const processor = new SSEProcessor();
    processorRef.current = processor;

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
      // 标记对话回复完成
      updateMessage(assistantId, {
        status: 'completed',
        content: accumulatedText,
      });
      setIsChatting(false);

      // 如果有 trigger，走生成流程
      if (triggerData && triggerData._prompt) {
        showToast('开始创作...', 'info');
        // 调用现有的生成 Pipeline
        await runStreaming(triggerData._prompt, triggerData.platform);
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
      }, new AbortController().signal, 60_000);
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

  return { isChatting, sendChatMessage };
}
