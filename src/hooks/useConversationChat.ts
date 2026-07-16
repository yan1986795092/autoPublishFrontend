import { useState, useCallback, useRef, useEffect } from 'react';
import { useConversationStore } from '../stores/useConversationStore';
import { useAgentStore } from '../stores/useAgentStore';
import { useUIStore } from '../stores/useUIStore';
import { conversationApi } from '../services/api';
import { SSEProcessor } from '../services/sse-processor';
import { useAuthStore } from '../stores/useAuthStore';
// ConversationTrigger type no longer needed (v4, direct agent pipeline)
import type { ChatMessage, ExecutionPlan } from '../types/agent';
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
  const activeAssistantIdRef = useRef<string | null>(null);
  const activeAccumulatedRef = useRef<string>('');
  const isChattingRef = useRef(false);
  
  const chatTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addMessage = useConversationStore((s) => s.addMessage);
  const updateMessage = useConversationStore((s) => s.updateMessage);
  const conversationId = useConversationStore((s) => s.conversationId);

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
    let settled = false;
    // 生成消息跟踪（后端直连 Agent Pipeline 后，所有事件走同一条 SSE）
    const genMsgIdRef: { current: string | null } = { current: null };
    let genAccumulatedText = '';

    const finalize = (status: 'completed' | 'failed', content: string) => {
      if (settled) return;
      settled = true;
      isChattingRef.current = false; // 修复 #3：ref 与 state 同步
      updateMessage(assistantId, { status, content });
      setIsChatting(false);
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

    processor.on('message_start', (event) => {
      const data = event.data as Record<string, unknown>;
      const msgId = data.message_id as string;
      console.log('[DEBUG message_start]', { backendMsgId: msgId, assistantId });
      if (!msgId) return;
      genMsgIdRef.current = assistantId;
      genAccumulatedText = '';
      // 升级 placeholder 为 generation 卡片——Agent Pipeline 开始后，所有
      // text_delta / artifact 内容都是生成产物，必须走 generation_card 分支。
      // MessageBubble 用 _isGeneration（kind/renderMode）判断渲染为生成卡片还是对话气泡，
      // 保留 kind='conversation' 会让流式内容错误地显示在对话气泡里。
      updateMessage(assistantId, { kind: 'generation', renderMode: 'generation_card' });
      useAgentStore.setState({
        stages: [],
        currentStage: null,
        reasoningChunks: {},
        thinkingSteps: [],
        streamEvents: [],
        hasFirstEventReceived: true,
        currentPlan: null,
        isRunning: true,
      });
      // streamingMessageId 指向 assistantId，让 applyStreamEvent 把后续
      // stage/plan/reasoning 事件路由到这条 message 的 parts[]。
      useAgentStore.setState({ streamingMessageId: assistantId } as Partial<ReturnType<typeof useAgentStore.getState>>);
    });

    processor.on('plan', (event) => {
      // v3 parts 模型：plan 事件 → applyStreamEvent 路由到 message.parts[]
      const { applyStreamEvent } = useAgentStore.getState();
      applyStreamEvent(event.data as import('../types/partReducer').StreamEventV3);
      // 兼容旧路径：保留 currentPlan 供 resultToTimelineEvents / 预览面板使用
      const data = event.data as Record<string, unknown>;
      if (data.goal) {
        useAgentStore.setState({ currentPlan: data as unknown as ExecutionPlan });
      }
    });

    processor.on('text_delta', (event) => {
      const data = event.data as { part_id?: string; delta?: string; agent?: string; channel?: string };
      const delta = data.delta || '';
      if (!delta || !genMsgIdRef.current) return;
      // body/search channel 累进消息正文（review channel 不进，避免审核意见混入正文）
      const channel = data.channel || 'body';
      if (channel === 'body' || channel === 'search') {
        genAccumulatedText += delta;
        updateMessage(genMsgIdRef.current, { content: genAccumulatedText });
      }
      // 把 delta 也写入 llmChunks，让 StageTimeline 能实时显示中间产物
      // 修复 BUG-19: key 命名必须与 reasoning_delta 一致（`${agent}|${round}`），
      // 否则 StageTimeline 用 stageKey 查找时永远查不到 text_delta 的 chunks。
      const agent = data.agent;
      if (agent) {
        const round = (data as any).round ?? (data as any)._review_round ?? 0;
        const key = `${agent}|${round}`;
        useAgentStore.setState((state) => {
          const existing = state.llmChunks[key] || [];
          return {
            llmChunks: {
              ...state.llmChunks,
              [key]: [...existing, { agent, content: delta, timestamp: Date.now() }],
            },
          };
        });
      }
      // 路由到 parts 模型，让 chat/MessageBubble 在 parts 模式下也能流式渲染文本
      const { applyStreamEvent } = useAgentStore.getState();
      applyStreamEvent(event.data as import('../types/partReducer').StreamEventV3);
    });

    processor.on('reasoning_delta', (event) => {
      const data = event.data as Record<string, unknown>;
      const agent = data.agent as string;
      const delta = (data.delta as string) || '';
      console.log('[DEBUG reasoning_delta]', { agent, delta: delta.slice(0, 20), streamingMsgId: useAgentStore.getState().streamingMessageId });
      // 修复 #11：兼容两种 round 字段命名 —— 后端 stream_core.py 用 'round'，
      //     nodes.py 用 '_review_round'。优先取 'round'，缺失则退化。
      const round = (data.round as number | undefined)
        ?? (data._review_round as number | undefined)
        ?? 0;
      if (!delta || !agent) return;
      // 写入 reasoningChunks（StageTimeline 展开态用）
      const key = `${agent}|${round}`;
      const currentState = useAgentStore.getState();
      const existing = currentState.reasoningChunks[key] || [];
      useAgentStore.setState({
        reasoningChunks: {
          ...currentState.reasoningChunks,
          [key]: [...existing, { agent, content: delta, timestamp: Date.now() }],
        },
      });
      // 同时路由到 parts 模型，让 chat/MessageBubble 在 parts 模式下渲染 reasoning part
      const { applyStreamEvent } = useAgentStore.getState();
      applyStreamEvent(event.data as import('../types/partReducer').StreamEventV3);
    });

    processor.on('stage', (event) => {
      const data = event.data as Record<string, unknown>;
      const agent = data.agent as string;
      const label = (data.label as string) || '';
      const icon = (data.icon as string) || '⚙️';
      const status = data.status as string;
      console.log('[DEBUG stage]', { agent, label, status, streamingMsgId: useAgentStore.getState().streamingMessageId });
      // 修复 #11：后端字段命名漂移 —— stream_core.py 写 'round'，
      //     nodes.py 写 '_review_round'。兼容两种。
      const round = (data.round as number | undefined)
        ?? (data._review_round as number | undefined)
        ?? 0;
      const durationMs = data.duration_ms as number | undefined;
      const errorMsg = data.error as string | undefined;
      const stageKey = `${agent}|${round}`;

  
      const { applyStreamEvent } = useAgentStore.getState();
      applyStreamEvent(event.data as import('../types/partReducer').StreamEventV3);

      useAgentStore.setState((state) => {
     
        if (status === 'started' || status === 'running') {
          const exists = state.stages.find(
            (s) => `${s.agent}|${s.reviewRound || 0}` === stageKey
          );
          if (!exists) {
            return {
              stages: [
                ...state.stages,
                {
                  agent,
                  label,
                  icon,
                  status: 'running' as const,
                  substeps: [],
                  reviewRound: round,
                },
              ],
              currentStage: agent,
            };
          }
          return {
            stages: state.stages.map((s) =>
              `${s.agent}|${s.reviewRound || 0}` === stageKey
                ? { ...s, status: 'running' as const }
                : s
            ),
            currentStage: agent,
          };
        }

        if (status === 'completed' || status === 'done') {
          return {
            stages: state.stages.map((s) => {
              if (`${s.agent}|${s.reviewRound || 0}` !== stageKey) return s;
              const chunks = state.reasoningChunks[stageKey] || [];
              return {
                ...s,
                status: 'completed' as const,
                duration: durationMs,
                reasoning: chunks.map((c) => c.content).join(''),
              };
            }),
            currentStage: state.currentStage === agent ? null : state.currentStage,
          };
        }

        if (status === 'error') {
          return {
            stages: state.stages.map((s) =>
              `${s.agent}|${s.reviewRound || 0}` === stageKey
                ? { ...s, status: 'failed' as const, duration: durationMs, error: errorMsg }
                : s
            ),
          };
        }

        return {};
      });
    });
    // [修复 Bug 2] agent_event → 中间产物日志（WritingAgent 工具结果、agent 完成状态）
    // 后端透传 "📎 工具结果" / "✅ 完成" 等日志到 SSE
    processor.on('agent_event', (event) => {
      const data = event.data as { part_id?: string; agent?: string; content?: string };
      console.log('[DEBUG agent_event]', { agent: data.agent, content: (data.content || '').slice(0, 80) });
      const msgId = genMsgIdRef.current;
      if (!msgId) return;
      // agent_event 内容累加到正文预览（message_end 前用户能看到每个 agent 的产物）
      if (data.content) {
        genAccumulatedText += '\n' + data.content;
        updateMessage(msgId, { content: genAccumulatedText });
      }
    });

    // [修复 Bug 3] tool_result → agent 工具输出（供 GenerationTimeline 显示）
    processor.on('tool_result', (event) => {
      const data = event.data as Record<string, unknown>;
      const msgId = genMsgIdRef.current;
      if (!msgId) return;
      // 路由到 parts 模型（tool_call state → done/error）
      const { applyStreamEvent } = useAgentStore.getState();
      applyStreamEvent(event.data as import('../types/partReducer').StreamEventV3);
    });

    processor.on('artifact', (event) => {
      const data = event.data as Record<string, unknown>;
      const body = (data.body as string) || '';
      const msgId = genMsgIdRef.current;
      console.log('[DEBUG artifact]', { msgId, hasBody: !!body, title: data.title, tags: data.tags });
      if (!msgId) return;
      // 路由到 parts 模型（chat/MessageBubble 用）
      const { applyStreamEvent, syncPreview, setCurrentResult } = useAgentStore.getState();
      applyStreamEvent(event.data as import('../types/partReducer').StreamEventV3);
      // artifact 到达时，后端已生成最终产物
      if (body) {
        genAccumulatedText = body;
        updateMessage(msgId, { content: body });
      }
      // ── 同步标题/标签/正文到右侧预览面板 ──
      // 后端 artifact 事件携带结构化 title 和 tags（如 TitleAgent / TagAgent 的产物），
      // 直接通过 syncPreview 写入 useAgentStore，AdvancedPanel 读取后渲染到模板对应位置。
      // 同时设置 currentResult 供预览面板的合并逻辑使用。
      const title = (data.title as string) || null;
      const tags = Array.isArray(data.tags) ? (data.tags as string[]) : [];
      syncPreview({ content: body, title, tags });
      if (body || title || tags.length > 0) {
        setCurrentResult({
          output: {
            content: body,
            full_text: body,
            title,
            tags,
            platform: data.platform,
            content_type: data.artifact_type,
          },
        } as any);
      }
    });

    processor.on('message_end', (event) => {
      const data = event.data as Record<string, unknown>;
      const msgId = genMsgIdRef.current;
      console.log('[DEBUG message_end]', { msgId, genAccumulatedLen: genAccumulatedText.length, msgCount: useConversationStore.getState().messages.length });
      if (msgId) {
        // 在 isRunning 变 false 前，把运行时 stages 保存到 message.result
        // 否则 agent/MessageBubble 的 displayStages 会变空
        const agentState = useAgentStore.getState();
        const status = (data.status === 'failed') ? 'failed' : 'completed';
        updateMessage(msgId, {
          status,
          content: genAccumulatedText || undefined,
          result: {
            _stages: agentState.stages,
            _thinkingSteps: agentState.thinkingSteps,
            _llmChunks: agentState.llmChunks,
            _reasoningChunks: agentState.reasoningChunks,
          } as any,
        });
        genMsgIdRef.current = null;
      }
      // ── 兜底同步：若 artifact 事件未触发或未携带 title/tags，
      // 从 genAccumulatedText 正文中提取标题和标签，同步到右侧预览面板 ──
      const agentStoreState = useAgentStore.getState();
      if (genAccumulatedText && (!agentStoreState.previewContent || !agentStoreState.previewTitle)) {
        // 从正文提取标题（第一段非空行，# 开头的 heading 或前 4-60 字）
        const bodyLines = genAccumulatedText.split('\n').map(l => l.trim()).filter(Boolean);
        let fallbackTitle: string | null = null;
        if (bodyLines.length > 0) {
          const first = bodyLines[0].replace(/^#{1,3}\s+/, '').replace(/^\*\*\s*(?:标题|Title)\s*[：:]\s*/, '').replace(/\s*\*\*$/, '');
          if (first.length >= 2 && first.length <= 60) {
            fallbackTitle = first;
          } else if (bodyLines.length > 1) {
            const second = bodyLines[1].replace(/^#{1,3}\s+/, '');
            if (second.length >= 2 && second.length <= 60) {
              fallbackTitle = second;
            }
          }
        }
        // 从正文提取标签（#tag 模式）
        const inlineTags = [...new Set(
          (genAccumulatedText.match(/#[^#\s\n]+/g) || [])
            .map(t => t.replace(/^#/, '').trim())
            .filter(Boolean)
        )].slice(0, 8);

        const finalTitle = agentStoreState.previewTitle || fallbackTitle;
        const finalTags = agentStoreState.previewTags.length > 0 ? agentStoreState.previewTags : inlineTags;
        agentStoreState.syncPreview({ content: genAccumulatedText, title: finalTitle, tags: finalTags });
        agentStoreState.setCurrentResult({
          output: { content: genAccumulatedText, full_text: genAccumulatedText, title: finalTitle, tags: finalTags },
        } as any);
      }

      // 路由到 parts 模型（让 message_end 关闭所有 streaming part）
      const { applyStreamEvent } = useAgentStore.getState();
      applyStreamEvent(event.data as import('../types/partReducer').StreamEventV3);

      useAgentStore.setState({
        isRunning: false,
        hasFirstEventReceived: false,
        streamingMessageId: null,
      } as Partial<ReturnType<typeof useAgentStore.getState>>);
    });

    processor.on('done', async (event) => {
      try {
        const data = (event?.data ?? {}) as SseDoneEvent;
        if (data.conversation_id) {
          const convState = useConversationStore.getState();
          if (convState.conversationId !== data.conversation_id) {
      
            if (!convState.conversationId) {
              useConversationStore.setState({ conversationId: data.conversation_id });
            }
          }
        }
      } catch {
    
      }

      if (chatTextTimer.current) {
        clearTimeout(chatTextTimer.current);
        flushChatText();
      }
      // done 时优先取 pipeline 产物，没有 pipeline 则回退到对话回复
      finalize('completed', genAccumulatedText || accumulatedText);
    });

    processor.on('error', (event) => {
      const data = event.data as SseErrorEvent;
      const msg = data.message || '对话出错';
      // 路由到 parts 模型（chat/MessageBubble 用）
      const { applyStreamEvent } = useAgentStore.getState();
      applyStreamEvent(event.data as import('../types/partReducer').StreamEventV3);
      useAgentStore.setState({
        isRunning: false,
        hasFirstEventReceived: false,
        streamingMessageId: null,
      } as Partial<ReturnType<typeof useAgentStore.getState>>);
      if (chatTextTimer.current) {
        clearTimeout(chatTextTimer.current);
        flushChatText();
      }
      finalize('failed', accumulatedText || msg);
      showToast(msg, 'error');
    });

    chatTimeoutRef.current = setTimeout(() => {
      if (!settled) {
        abortController.abort();
        processorRef.current?.abort();
        finalize('failed', '对话回复超时，请重试');
        showToast('对话回复超时，请重试', 'error');
      }
    }, 600_000);

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
      }, abortController.signal, 600_000);
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
      }
    } finally {
      // 始终重置 isChattingRef，防止 SSE 异常断开后按钮卡住
      isChattingRef.current = false;
      queueMicrotask(() => {
        if (!settled) {
          setIsChatting(false);
        }
      });
    }
  }, [isChatting, addMessage, updateMessage, conversationId, showToast, persistAssistantMessage]);

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
      isChattingRef.current = false; // 修复 #3
      if (isChatting) setIsChatting(false);
    };
    window.addEventListener('app:conversation-switching', onSwitch);
    return () => window.removeEventListener('app:conversation-switching', onSwitch);
  }, [isChatting]);

  const abort = useCallback(() => {
    persistTokenRef.current += 1;
    if (chatTimeoutRef.current) {
      clearTimeout(chatTimeoutRef.current);
      chatTimeoutRef.current = null;
    }
    processorRef.current?.abort();
    abortControllerRef.current?.abort();
    stopAgentStreaming();
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