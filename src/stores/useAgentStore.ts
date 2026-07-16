/**
 * useAgentStore - Agent 执行状态管理
 * 
 * 职责：
 * - Agent 执行状态 (currentTask, currentResult, isRunning)
 * - SSE 流处理 (streamEvents, llmChunks, reasoningChunks)
 * - WebSocket 管理
 * - 预览功能
 * - 技能应用
 * 
 * 注意：对话管理已迁移到 useConversationStore
 */
import { create } from 'zustand';
import type {
  AsyncTask, AgentResult, ExecutionPlan,
  ThinkingStep, StreamEvent, LLMChunk, ReasoningChunk,
  StageInfo, IntentConflict,
} from '../types';
import { getResultThinkingSteps } from '../utils/agentEvents';
import { resultToTimelineEvents } from '../utils/agentEventTimeline';
import { agentApi, chatApi } from '../services/api';
import { SSEProcessor } from '../services/sse-processor';
import { useAuthStore } from './useAuthStore';
import { useConversationStore } from './useConversationStore';
import { eventToPartOp } from './eventToPartOp';
import { reduceParts } from './partReducer';
import type { Message, MessagePart } from '../types/message';
import type { PartOp } from '../types/partReducer';

interface AgentState {
  // 当前任务
  currentTaskId: string | null;
  currentTask: AsyncTask | null;
  currentResult: AgentResult | null;
  currentPlan: ExecutionPlan | null;
  isRunning: boolean;
  error: string | null;

  // Parts 模型：当前流式消息 ID（spec 2026-07-02 §4.1）
  streamingMessageId: string | null;

  // Thinking trace（实时步骤）
  thinkingSteps: ThinkingStep[];

  // 流式事件列表（统一渲染源）
  streamEvents: StreamEvent[];

  // LLM token 流（打字机效果）
  llmChunks: Record<string, LLMChunk[]>;
  reasoningChunks: Record<string, ReasoningChunk[]>;

  // 动态阶段列表（用于 StageTimeline）
  stages: StageInfo[];
  currentStage: string | null;
  intentConflicts: IntentConflict[];

  // 流式事件是否已开始（第一个 SSE 事件到达后为 true）
  hasFirstEventReceived: boolean;

  // WebSocket 状态（P6: 已删除，仅保留 disconnectWebSocket 作 no-op 兼容）

  // 流式处理器
  _streamingProcessor: SSEProcessor | null;
  _abortController: AbortController | null;

  // Applied Skill
  appliedSkill: import('../types').AppliedSkill | null;
  appliedSkillFull: import('../types').Skill | null;
  setAppliedSkill: (applied: import('../types').AppliedSkill | null, full: import('../types').Skill | null) => void;

  // 右侧预览
  previewContent: string | null;
  setPreviewContent: (content: string | null) => void;
  previewTitle: string | null;
  setPreviewTitle: (title: string | null) => void;
  previewTags: string[];
  setPreviewTags: (tags: string[]) => void;
  previewPlatform: string | null;
  setPreviewPlatform: (platform: string | null) => void;
  previewContentType: string | null;
  setPreviewContentType: (contentType: string | null) => void;
  previewSyncTrigger: number;
  triggerPreviewSync: () => void;
  // 同步预览：将 preview_sync 事件的数据应用到预览面板（与 MessageBubble.handlePreview 逻辑一致）
  syncPreview: (data: { content: string | null; title: string | null; tags: string[] }) => void;

  // Stream events
  addStreamEvent: (event: StreamEvent) => void;

  // Parts 模型：SSE v3 事件 → Part reducer 单一入口（spec §4.1）
  applyStreamEvent: (event: import('../types/partReducer').StreamEventV3) => void;

  // Actions
  previewPlan: (prompt: string) => Promise<ExecutionPlan | null>;
  runSync: (prompt: string) => Promise<AgentResult | null>;
  runAsync: (prompt: string, platform?: string | null) => Promise<string | null>;
  runStreaming: (prompt: string, platform?: string | null, parameters?: Record<string, unknown>, trigger?: Record<string, unknown>) => Promise<void>;
  loadTaskStatus: (taskId: string) => Promise<void>;
  setCurrentResult: (result: AgentResult | null) => void;
  setCurrentTask: (task: AsyncTask | null) => void;
  cancelTask: (taskId: string) => Promise<boolean>;
  stopStreaming: () => void;
  clearCurrent: () => void;
  /**
   * 重置整个 store 到初始状态
   * 用于：用户切换账号、logout、严重错误恢复
   * 注意：会清空所有对话、任务、流式状态、localStorage 缓存
   */
  reset: () => void;

  /** 重试失败消息（spec Phase 3.4）：用同 prompt 重新触发流式生成 */
  retryMessage: (messageId: string) => void;

  disconnectWebSocket: () => void;
}

// C2: streamEvents 上限 200（与 thinkingSteps 一致），避免长任务无限增长
const _MAX_STREAM_EVENTS = 200;
const _CHUNK_UPDATE_INTERVAL = 120;
const _MSG_UPDATE_INTERVAL = 50;

export const useAgentStore = create<AgentState>()((set, get) => ({
  currentTaskId: null,
  currentTask: null,
  currentResult: null,
  currentPlan: null,
  isRunning: false,
  error: null,
  streamingMessageId: null,
  thinkingSteps: [],
  streamEvents: [],
  llmChunks: {},
  reasoningChunks: {},
  stages: [],
  currentStage: null,
  intentConflicts: [],
  hasFirstEventReceived: false,
  _streamingProcessor: null,
  _abortController: null,
  appliedSkill: null,
  appliedSkillFull: null,
  previewContent: null,
  previewTitle: null,
  previewTags: [],
  previewPlatform: null,
  previewContentType: null,
  previewSyncTrigger: 0,

  setAppliedSkill: (applied, full) => set({ appliedSkill: applied, appliedSkillFull: full }),
  setPreviewContent: (content) => set({ previewContent: content }),
  setPreviewTitle: (title) => set({ previewTitle: title }),
  setPreviewTags: (tags) => set({ previewTags: tags }),
  setPreviewPlatform: (platform) => set({ previewPlatform: platform }),
  setPreviewContentType: (contentType) => set({ previewContentType: contentType }),
  triggerPreviewSync: () => set((state) => ({ previewSyncTrigger: state.previewSyncTrigger + 1 })),
  // 同步预览：将 preview_sync 事件的数据应用到预览面板
  syncPreview: ({ content, title, tags }) => set((state) => ({
    previewContent: content,
    previewTitle: title,
    previewTags: tags,
    previewSyncTrigger: state.previewSyncTrigger + 1,
  })),

  addStreamEvent: (event) => set((state) => ({ streamEvents: [...state.streamEvents, event] })),

  applyStreamEvent: (event) => {
    const { streamingMessageId } = get();
    if (!streamingMessageId) return;

    const conversationStore = useConversationStore.getState();
    const msg = conversationStore.messages.find(m => m.id === streamingMessageId);
    if (!msg) return;

    const currentParts: MessagePart[] = msg.parts || [];
    const op = eventToPartOp(event, streamingMessageId, currentParts);
    if (!op) return; // message_end / null ops

    // parts 累加：找到当前 message，更新其 parts
    const nextParts = reduceParts(currentParts, op);

    conversationStore.updateMessage(streamingMessageId, {
      parts: nextParts,
    } as Parameters<typeof conversationStore.updateMessage>[1]);

    // message_end：关闭流式
    if (event.type === 'message_end') {
      const status = event.data.status === 'completed'
        ? 'completed'
        : event.data.status === 'failed'
          ? 'failed'
          : 'completed';
      conversationStore.updateMessage(streamingMessageId, {
        status,
      } as Parameters<typeof conversationStore.updateMessage>[1]);
      set({ streamingMessageId: null });
    }
  },

  stopStreaming: () => {
    const { _streamingProcessor, _abortController, currentTaskId, streamingMessageId } = useAgentStore.getState();
    // P1-3 issue: 前端只断 SSE，未通知后端停 LangGraph → 后端继续跑。
    // 修复：stopStreaming 时 fire-and-forget 调 DELETE /agent/async/{taskId}，
    //     后端 cancel_task 改 state，LangGraph worker 下次循环检测到 CANCELLED 退出。
    // 注意：在 set() 之前调用 cancelTask（set 会把 currentTaskId 置 null）
    const taskIdToCancel = currentTaskId;
    if (taskIdToCancel) {
      import('../services/api').then(({ agentApi }) => {
        agentApi.cancelTask(taskIdToCancel).catch(() => {});
      });
    }
    if (_streamingProcessor) {
      _streamingProcessor.abort();
    }
    if (_abortController) {
      _abortController.abort();
    }

    // 修复 BUG-C1：把当前 placeholder message 设为 cancelled，
    // 避免 stopStreaming 后卡片一直停在"生成中"状态（生成按钮仍在转、无法继续操作）
    if (streamingMessageId) {
      try {
        const convState = useConversationStore.getState();
        const msg = convState.messages.find((m) => m.id === streamingMessageId);
        if (msg && msg.status === 'running') {
          convState.updateMessage(streamingMessageId, {
            status: 'cancelled',
            content: msg.content || '已取消',
          });
        }
      } catch {
        // store 未初始化或消息已被清理，静默忽略
      }
    }

    set({
      isRunning: false,
      currentTaskId: null,
      currentResult: null,
      thinkingSteps: [],
      llmChunks: {},
      reasoningChunks: {},
      stages: [],
      currentStage: null,
      intentConflicts: [],
      streamEvents: [],
      _streamingProcessor: null,
      _abortController: null,
      streamingMessageId: null,
    });
  },

  retryMessage: (messageId: string) => {
    const conversationStore = useConversationStore.getState();
    const agentStore = useAgentStore.getState();
    const messages = conversationStore.messages;
    const msg = messages.find((m) => m.id === messageId);
    if (!msg) return;

    const idx = messages.findIndex((m) => m.id === messageId);
    const prevUserMsg = idx > 0
      ? [...messages.slice(0, idx)].reverse().find((m) => m.role === 'user')
      : null;
    const promptToUse = prevUserMsg?.content || msg.content;
    if (!promptToUse) return;

    agentStore.stopStreaming();
    setTimeout(() => {
      agentStore.runStreaming(promptToUse, null);
    }, 50);
  },

  // P6: connectWebSocket 已删除（v1 遗留路径），setWsConnectionState 也删除
  //     disconnectWebSocket 保留作幂等 no-op（_ws/_reconnectTimer 在 v2 始终为 null）
  disconnectWebSocket: () => {
    // v2 不维护 WebSocket 状态——外部调用方（useExecutionEngine / useConversationStore /
    // clearAllUserStores）继续调用此函数以保持兼容性，但函数本身什么都不做。
  },

  previewPlan: async (prompt: string) => {
    try {
      set({ isRunning: true, error: null, thinkingSteps: [], currentResult: null });
      const response = await agentApi.plan({ prompt });
      if (response.data.success && response.data.data) {
        const plan = response.data.data as unknown as ExecutionPlan;
        set({ currentPlan: plan, isRunning: false });
        return plan;
      }
      set({ isRunning: false, error: '生成计划失败' });
      return null;
    } catch (e) {
      set({ isRunning: false, error: String(e) });
      return null;
    }
  },

  runSync: async (prompt: string) => {
    try {
      set({ isRunning: true, error: null, currentResult: null });
      const { appliedSkill } = get();
      const response = await agentApi.run({
        prompt,
        skill_id: appliedSkill?.skill_id,
      });
      if (response.data.success && response.data.data) {
        const result = response.data.data as unknown as AgentResult;
        set({ currentResult: result, isRunning: false });
        return result;
      }
      set({ isRunning: false, error: 'Agent 执行失败' });
      return null;
    } catch (e) {
      set({ isRunning: false, error: String(e) });
      return null;
    }
  },

  runAsync: async (prompt: string, platform?: string | null) => {
    try {
      set({ isRunning: true, error: null, thinkingSteps: [] });
      const { appliedSkill } = get();
      const response = await agentApi.submitAsync({
        prompt,
        skill_id: appliedSkill?.skill_id,
        platform: platform || undefined,
      });
      if (response.data.success && response.data.data) {
        const taskId = response.data.data.task_id;
        set({ currentTaskId: taskId, isRunning: true });
        return taskId;
      }
      set({ isRunning: false, error: 'Failed to submit task' });
      return null;
    } catch (e) {
      set({ isRunning: false, error: String(e) });
      return null;
    }
  },

  /** Push to streamEvents with a cap */
  _pushStreamEvent: (events: StreamEvent[], event: StreamEvent): StreamEvent[] => {
    const arr = [...events, event];
    return arr.length > _MAX_STREAM_EVENTS ? arr.slice(-_MAX_STREAM_EVENTS) : arr;
  },

  runStreaming: async (prompt: string, platform?: string | null, parameters?: Record<string, unknown>, trigger?: Record<string, unknown>) => {
    // 防止重复调用
    if (get().isRunning) { get().stopStreaming(); }

    // 修复 BUG-17：stopStreaming() 触发的 ondone/onerror handler 可能在事件循环
    // 中还在排队，await 一帧让事件循环先处理完这些 handler，避免前一次的
    // msgIdRef.current 被错误地用于本次消息。
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    const token = useAuthStore.getState().accessToken;
    const conversationStore = useConversationStore.getState();

    // 修复 #6：每次 runStreaming 重新读取最新的 conversationId，
    // 而不是闭包在 store 的初始值上。
    // 注意：useConversationStore.getState() 总拿最新值。
    let conversationId: string | null = conversationStore.conversationId;
    // P14: 用 mutable ref 而非 const —— messagePromise 内会自动建对话，
    //     此时需同步更新"初始 conversationId" 否则 safePersist 会与新 ID mismatch
    //     拒绝写入 DB（用户首次发消息场景下产物会丢失）。
    const initialConversationIdRef: { current: string | null } = { current: conversationId };
    const msgIdRef: { current: string } = { current: crypto.randomUUID() };
    const temporaryId = msgIdRef.current;

    // 添加 assistant placeholder
    if (!conversationStore.messages.find(m => m.role === 'assistant' && m.status === 'running')) {
      conversationStore.addMessage({
        id: temporaryId, role: 'assistant', content: '', status: 'running',
        timestamp: Date.now(), kind: 'generation', renderMode: 'generation_card',
        renderPayload: null, generationMeta: null,
      });
    }

    // Start streaming state
    set({
      isRunning: true, error: null, thinkingSteps: [], currentResult: null,
      llmChunks: {}, reasoningChunks: {}, stages: [], currentStage: null,
      intentConflicts: [], streamEvents: [], hasFirstEventReceived: false
    });

    // 初始阶段
    set({
      stages: [{
        agent: 'preparing',
        label: '🧠 思考分析中',
        icon: '🧠',
        status: 'running' as const,
        substeps: [],
      }],
      currentStage: 'preparing',
    });

    // P25: 清理上一次 runStreaming 的残留 timer + 采样计数器，
    //      避免切对话 / 重发时旧 timer 还触发 set() 写脏数据。
    if (chunkBatchTimer) {
      clearTimeout(chunkBatchTimer);
      chunkBatchTimer = null;
    }
    if (msgUpdateTimer) {
      clearTimeout(msgUpdateTimer);
      msgUpdateTimer = null;
    }
    if (_thinkingTimer) {
      clearTimeout(_thinkingTimer);
      _thinkingTimer = null;
    }
    if (_reasoningTimer) {
      clearTimeout(_reasoningTimer);
      _reasoningTimer = null;
    }
    pendingChunks = [];
    accumulatedChunks.length = 0;
    _pendingThinking = null;
    _pendingReasoningBatch = [];
    _needsRefresh = false;
    _llmStreamSample = 0;

    const controller = new AbortController();
    set({ _abortController: controller });

    // 修复 #6：移除副作用式 switchConversation，改走 conversationStore 的
    // 标准 createConversation() 流程，UI 列表立刻同步显示。
    // 同时去掉对已废弃 chatApi.quickStart 的依赖。
    // 行为保证：
    //   1) 用户列表立刻看到这条新对话
    //   2) 不会"切到了第三方创建的对话，用户毫无感知"
    //   3) 用户中途切走 → runStreaming 走完也只写回最初那个对话
    const messagePromise = (async (): Promise<string> => {
      let realAssistantId = temporaryId;
      try {
        if (!conversationId) {
          // 走 conversationStore 的标准创建路径，UI 列表立刻同步
          const newId = await conversationStore.createConversation('[内容生成]');
          if (newId) {
            conversationId = newId;
            // P14: 同步更新"初始 conversationId" ref，让 safePersist 通过守门
            //     （用户首次发消息场景下需要把 DB 写入指向新创建的对话）
            initialConversationIdRef.current = newId;
            const asstResp = await chatApi.addMessage(newId, {
              role: 'assistant', content: '', status: 'running',
            });
            if (asstResp?.data?.success && asstResp.data.data) {
              realAssistantId = asstResp.data.data.id;
            }
          }
        } else {
          // 已有对话：检查中途是否被切走
          // （切走会触发 stopStreaming + abort controller，这里只是双保险）
          const currentNowId = useConversationStore.getState().conversationId;
          if (currentNowId !== initialConversationIdRef.current) {
            logger.warning('runStreaming 时 conversationId 已变化，中止写入',
                          from=initialConversationIdRef.current, to=currentNowId);
            controller.abort();
            return temporaryId;
          }
          const [, asstResp] = await Promise.all([
            chatApi.addMessage(conversationId, {
              role: 'user', content: '[内容生成]', status: 'completed',
            }),
            chatApi.addMessage(conversationId, {
              role: 'assistant', content: '', status: 'running',
            }),
          ]);
          if (asstResp?.data?.success && asstResp.data.data) {
            realAssistantId = asstResp.data.data.id;
          }
        }
      } catch (e) {
        console.error('message creation failed:', e);
      }
      if (realAssistantId !== temporaryId) {
        msgIdRef.current = realAssistantId;
        conversationStore.updateMessage(temporaryId, { id: realAssistantId });
      }
      return realAssistantId;
    })();

    const processor = new SSEProcessor();

    // D3 + P14: safePersist — 写入 DB 前两道守门：
    //     1) conversationId 一致性（防切对话脏写）
    //        注意：自动创建对话时，messagePromise 会更新 initialConversationIdRef，
    //        所以这里读 ref.current 而非闭包常量。
    //     2) P13: msgId 仍在当前 messages 列表里（防 placeholder 被清空后用 stale ID 写）
    // local store update 仍可做（UI 短暂可见即可，刷新后由 DB 决定），但 DB 必须守门。
    const safePersist = (msgId: string, payload: Parameters<typeof chatApi.updateMessage>[1]) => {
      const convState = useConversationStore.getState();
      const currentConv = convState.conversationId;
      if (currentConv !== initialConversationIdRef.current) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[useAgentStore] conversation 已切换 (${initialConversationIdRef.current} → ${currentConv})，放弃 DB 写入`);
        }
        return Promise.resolve();
      }
      if (!convState.messages.find((m) => m.id === msgId)) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[useAgentStore] msgId ${msgId} 不在 messages 列表，放弃 DB 写入（placeholder 可能已被清空）`);
        }
        return Promise.resolve();
      }
      return chatApi.updateMessage(msgId, payload).catch((err) => {
        console.warn('[useAgentStore] DB 写入失败:', err);
      });
    };

    // Throttled update helpers
    let errorOccurred = false;
    // P20: 改用数组累积，避免长任务（>10k tokens）字符串拼接的 O(n²) 内存行为。
    //     累积到最终态时再 join() 一次。
    const accumulatedChunks: string[] = [];
    const getAccumulated = () => accumulatedChunks.join('');
    let msgUpdateTimer: ReturnType<typeof setTimeout> | null = null;
    // P9: 改名 _needsRefresh 让意图更清晰——这只是"50ms 后还有内容要刷新"的标志位，
    //     不是"待处理内容"。实际刷新内容始终从 `accumulatedChunks` 闭包读取（最新值）。
    let _needsRefresh = false;
    const updateMsg = (content: string) => {
      if (msgUpdateTimer) {
        // 已有计时器在跑——标记"50ms 后还需要再刷一次"，但不存 content。
        // 50ms 后会从闭包的 accumulatedChunks 读最新值。
        _needsRefresh = true;
        return;
      }
      conversationStore.updateMessage(msgIdRef.current, { content });
      msgUpdateTimer = setTimeout(() => {
        msgUpdateTimer = null;
        if (_needsRefresh) {
          _needsRefresh = false;
          // P20: 数组 → 字符串（join 一次完成，避免重复拷贝）
          conversationStore.updateMessage(msgIdRef.current, { content: getAccumulated() });
        }
      }, _MSG_UPDATE_INTERVAL);
    };
    // P21: 显式 flush 接口。result / done / error handler 调用前必须 flush，
    //      否则最后一段 50ms 内的 chunk 会被 _needsRefresh 标记但永远等不到 timer 触发，
    //      出现"流式产物少几个 token"的现象（句号/引号丢失）。
    const flushMsgUpdate = () => {
      if (msgUpdateTimer) {
        clearTimeout(msgUpdateTimer);
        msgUpdateTimer = null;
      }
      if (_needsRefresh) {
        _needsRefresh = false;
        conversationStore.updateMessage(msgIdRef.current, { content: getAccumulated() });
      }
    };

    // Chunk batching
    let chunkBatchTimer: ReturnType<typeof setTimeout> | null = null;
    let pendingChunks: Array<{ agent: string; content: string }> = [];

    const flushChunks = () => {
      const batch = pendingChunks;
      pendingChunks = [];
      if (batch.length === 0) return;
      set((s) => {
        const newChunks = { ...s.llmChunks };
        for (const { agent, content } of batch) {
          const existing = newChunks[agent] || [];
          newChunks[agent] = [...existing, { agent, content, timestamp: Date.now() }];
        }
        // P25: streamEvents 改成"每 N 次 flush 记 1 条采样"，避免长 body 流
        //      把 200 上限的 streamEvents 占满，导致 stage / result / thinking_step 被 FIFO 掉。
        //      llmChunks 已经持有完整流，不需要 streamEvents 每 120ms 都记一条。
        const lastEvent = batch[batch.length - 1];
        const sample = _llmStreamSample++;
        const events = sample % 5 === 0
          ? get()._pushStreamEvent(s.streamEvents, {
              id: `llm-${Date.now()}-${lastEvent.agent}`,
              type: 'llm_chunk',
              timestamp: Date.now(),
              data: { agent: lastEvent.agent, content: lastEvent.content },
              agent: lastEvent.agent,
              content: lastEvent.content,
            })
          : s.streamEvents;
        return { llmChunks: newChunks, streamEvents: events };
      });
    };
    // P25: 流式采样计数器。每次 flushChunks 自增，每 5 次记一条到 streamEvents。
    let _llmStreamSample = 0;

    // Register SSE handlers
    // 修复 BUG-C3：result 事件到达后标记 _resultCommitted，
    //     之后到达的 text_delta 不再覆盖 message.content（防止 result 先到时丢失累积）
    let _resultCommitted = false;

    // ── v3 Parts 模型事件（spec 2026-07-02 §3.3）─────────────────────────
    processor.on('message_start', (event) => {
      // v3: message_start → 设置 streamingMessageId
      const msgId = (event.data as { message_id?: string }).message_id;
      if (msgId) {
        set({ streamingMessageId: msgId });
        // 在 conversationStore 里找到这个 message，把临时 placeholder 替换为 real ID
        conversationStore.updateMessage(msgIdRef.current, { id: msgId } as Parameters<typeof conversationStore.updateMessage>[1]);
        msgIdRef.current = msgId;
      }
    });

    processor.on('text_delta', (event) => {
      // v3: text_delta → accumulate in conversationStore message content
      const data = event.data as { part_id?: string; delta: string };
      if (!data.delta) return;
      // 修复 BUG-C3：result 已提交后到达的 late delta 不能再覆盖 message.content，
      //     只累积到内部 chunks（不影响显示）；否则会冲掉后端权威 content
      if (_resultCommitted) {
        accumulatedChunks.push(data.delta);
        return;
      }
      accumulatedChunks.push(data.delta);
      updateMsg(getAccumulated());
    });

    processor.on('reasoning_delta', (event) => {
      // v3: reasoning_delta → update/add to reasoning part via applyStreamEvent
      const { applyStreamEvent } = get();
      applyStreamEvent(event.data as import('../types/partReducer').StreamEventV3);
    });

    processor.on('stage', (event) => {
      // flushChunks() 确保 pending llmChunks/reasoningChunks 在 stage 更新前已写入 store
      // 这样 completion 时读 state.reasoningChunks 能拿到最新的流式内容
      flushChunks();
      // flushReasoning() 同上：30ms debounce 的 reasoning delta 也要 flush，
      // 否则 stage:completed 时读 state.reasoningChunks 会丢失最后一批 delta
      flushReasoning();
      const data = event.data as any;
      const agent = data.agent as string;
      const status = data.status as string;
      // 调试：打印所有字段
      console.log('[DEBUG stage event]', { data, keys: Object.keys(data) });
      // 支持两种命名：后端 SSE 发 reviewRound（v3），旧数据或兼容路径用 _review_round
      const reviewRound = (data.reviewRound as number) ?? (data._review_round as number) ?? (data.round as number) ?? 0;
      console.log('[DEBUG stage event] reviewRound computed:', reviewRound);
      const stageKey = `${agent}|${reviewRound}`;

      // v3: stage → 更新 parts 数组（供 NewMessageBubble 渲染）
      const { applyStreamEvent } = get();
      applyStreamEvent(event.data as import('../types/partReducer').StreamEventV3);

      // 同时更新 useAgentStore.stages/currentStage（供 MessageBubble System C 渲染路径使用）
      // 合并两个 handler 的逻辑，避免重复注册导致状态写两遍
      set((state) => {
        if (status === 'started') {
          const existing = state.stages.find(s => `${s.agent}|${s.reviewRound || 0}` === stageKey);
          const baseStages = state.stages.filter(s => s.agent !== 'preparing');
          if (!existing) {
            return {
              stages: [...baseStages, {
                agent,
                label: (data.label as string) || '处理中',
                icon: (data.icon as string) || '⚙️',
                status: 'running' as const,
                substeps: [],
                conflicts: data.conflicts as IntentConflict[] | undefined,
                reviewRound,
              }],
              currentStage: agent,
              intentConflicts: (data.conflicts as IntentConflict[]) || state.intentConflicts,
            };
          }
          return {
            stages: state.stages.map(s =>
              `${s.agent}|${s.reviewRound || 0}` === stageKey ? { ...s, status: 'running' as const } : s
            ),
            currentStage: agent,
          };
        }

        if (status === 'completed') {
          const stageReasoning = (data._reasoning as string) || '';
          const stageKeyLocal = stageKey;
          return {
            stages: state.stages.map(s => {
              if (`${s.agent}|${s.reviewRound || 0}` !== stageKeyLocal) return s;
              const chunks = state.reasoningChunks[stageKeyLocal] || [];
              const streamText = chunks.map(c => c.content).join('');
              const parts: string[] = [];
              if (streamText) parts.push(streamText);
              if (stageReasoning && stageReasoning !== streamText) parts.push(stageReasoning);
              return {
                ...s,
                status: 'completed' as const,
                duration: data.duration as number,
                reasoning: parts.join('\n'),
              };
            }),
            currentStage: state.currentStage === agent ? null : state.currentStage,
          };
        }

        return state;
      });
    });

    processor.on('tool_input_delta', (event) => {
      // v3: tool_input_delta → update tool_call input
      const { applyStreamEvent } = get();
      applyStreamEvent(event.data as import('../types/partReducer').StreamEventV3);
    });

    processor.on('tool_result', (event) => {
      // v3: tool_result → state transition
      const { applyStreamEvent } = get();
      applyStreamEvent(event.data as import('../types/partReducer').StreamEventV3);
    });

    processor.on('artifact', (event) => {
      // v3: artifact → append artifact part
      const { applyStreamEvent } = get();
      applyStreamEvent(event.data as import('../types/partReducer').StreamEventV3);
    });

    processor.on('plan', (event) => {
      // v3: plan → append plan part
      const { applyStreamEvent } = get();
      applyStreamEvent(event.data as import('../types/partReducer').StreamEventV3);
      set({ hasFirstEventReceived: true, currentPlan: event.data as unknown as ExecutionPlan });
    });

    processor.on('message_end', (event) => {
      // v3: message_end → close all streaming parts
      const { applyStreamEvent } = get();
      applyStreamEvent(event.data as import('../types/partReducer').StreamEventV3);
    });

    processor.on('error', (event) => {
      // v3: error → append error part
      const { applyStreamEvent } = get();
      applyStreamEvent(event.data as import('../types/partReducer').StreamEventV3);
    });

    processor.on('task_created', (event) => {
      const data = event.data as { task_id?: string };
      set({ currentTaskId: data.task_id || null });
    });

    // ── preview_sync → 实时更新右侧预览面板（标题、标签、正文） ──
    // 注意：preview_sync 事件已在 graph v5 中移除，改由 result handler 直接同步预览数据
    // 此 handler 保留用于向后兼容（避免历史消息加载时出错）

    // ── Legacy v2 handlers (kept for compatibility during migration)
    // Note: v3 SSE endpoint does NOT emit thinking_step / llm_chunk / reasoning events.
    // These handlers won't fire against /stream/v3 — kept only to avoid breaking v2 fallback path.
    // 第四批修复：thinking_step / reasoning 重新启用，写入 thinkingSteps / reasoningChunks。
    //     两个事件的高频到达（reasoning token 级，thinking_step agent 级）会打满主线程
    //     并阻塞 llm_chunk / result 处理——用 debounce 合并不影响用户体验（StageTimeline
    //     实时性以 30-50ms 颗粒度足够），同时保证 body 内容渲染不被阻塞。
    //     reasoning: 30ms（更实时，让 token 级流式肉眼可见）
    //     thinking_step: 200ms（步骤级合并足够）
    //     刷新：done/error 时 flush 残留，保证流结束后数据完整。
    let _thinkingTimer: ReturnType<typeof setTimeout> | null = null;
    let _reasoningTimer: ReturnType<typeof setTimeout> | null = null;
    let _pendingThinking: { data: Record<string, unknown>; step: ReturnType<typeof _parseThinkingStep> } | null = null;
    let _pendingReasoningBatch: Array<{
      data: Record<string, unknown>;
      agent: string;
      content: string;
      reviewRound: number;
    }> = [];
    const _parseThinkingStep = (data: Record<string, unknown>) => {
      const rawStatus = (data.status as string) || 'done';
      const stepStatus: 'running' | 'done' | 'failed' =
        rawStatus === 'running' || rawStatus === 'failed' ? rawStatus : 'done';
      return {
        step_number: (data.step_number as number) || 0,
        agent: (data.agent as string) || 'Unknown',
        action: (data.action as string) || '',
        reasoning: (data.reasoning as string) || '',
        input_summary: (data.input_summary as string) || '',
        output_summary: (data.output_summary as string) || '',
        tokens_used: (data.tokens_used as number) || 0,
        time_elapsed: (data.time_elapsed as number) || 0,
        status: stepStatus,
        _from_cache: (data._from_cache as boolean) || false,
        _review_round: (data._review_round as number) || 0,
      };
    };
    const flushThinking = () => {
      if (!_pendingThinking) return;
      const pending = _pendingThinking;
      _pendingThinking = null;
      const { data, step } = pending;
      set((s) => ({
        thinkingSteps: [...s.thinkingSteps, step],
        streamEvents: get()._pushStreamEvent(s.streamEvents, {
          id: `step-${Date.now()}-${step.agent}-${step.step_number}`,
          type: 'thinking_step',
          timestamp: Date.now(),
          data,
          agent: step.agent,
          content: step.reasoning,
        }),
      }));
    };
    const flushReasoning = () => {
      if (_pendingReasoningBatch.length === 0) return;
      const batch = _pendingReasoningBatch;
      _pendingReasoningBatch = [];
      set((s) => {
        const nextChunks = { ...s.reasoningChunks };
        // 30ms debounce 窗口内的所有 chunk 都累积下来，flush 时一次性写入。
        // 之前的实现用单值 _pendingReasoning，每个窗口只保留"最后一条"，
        // burst 内的多个 chunk 会被覆盖丢弃 → StageTimeline 展开只看到碎片。
        for (const { agent, content, reviewRound } of batch) {
          const key = `${agent}|${reviewRound}`;
          const existing = nextChunks[key] || [];
          nextChunks[key] = [...existing, { agent, content, timestamp: Date.now() }];
        }
        let events = s.streamEvents;
        for (const { data, agent, content } of batch) {
          events = get()._pushStreamEvent(events, {
            id: `reasoning-${Date.now()}-${agent}`,
            type: 'reasoning',
            timestamp: Date.now(),
            data,
            agent,
            content,
          });
        }
        return { reasoningChunks: nextChunks, streamEvents: events };
      });
    };
    const scheduleReasoningFlush = () => {
      if (_reasoningTimer) return;
      // 30ms debounce：让 token 级流式肉眼可见（每帧 ~16ms），同时合并连发 token
      _reasoningTimer = setTimeout(() => {
        _reasoningTimer = null;
        flushReasoning();
      }, 30);
    };
    const scheduleThinkingFlush = () => {
      if (_thinkingTimer) return;
      _thinkingTimer = setTimeout(() => {
        _thinkingTimer = null;
        flushThinking();
      }, 200);
    };

    processor.on('thinking_step', (event) => {
      const data = event.data as Record<string, unknown>;
      _pendingThinking = { data, step: _parseThinkingStep(data) };
      scheduleThinkingFlush();
    });

    processor.on('reasoning', (event) => {
      const data = event.data as Record<string, unknown>;
      const agent = (data.agent as string) || 'Unknown';
      // 后端 SSE v2 发 content 字段，v3 / eventToPartOp 可能用 delta
      const content = (data.content as string) || (data.delta as string) || '';
      const reviewRound = (data._review_round as number) || 0;
      _pendingReasoningBatch.push({ data, agent, content, reviewRound });
      scheduleReasoningFlush();
    });
    // C4: progress 事件 5Hz，原样更新 store 会触发订阅组件 5Hz 重渲染。
    //     这里 200ms throttle：合并连发事件，但保留"最后一次"的数据，
    //     streamEvents 仍然每条都记（200 上限 FIFO）。
    let _lastProgressUpdate = 0;
    let _pendingProgressData: any = null;
    let _progressFlushTimer: ReturnType<typeof setTimeout> | null = null;
    const flushProgress = () => {
      if (_pendingProgressData == null) return;
      const data = _pendingProgressData;
      _pendingProgressData = null;
      _lastProgressUpdate = Date.now();
      set((s) => ({
        currentTask: {
          id: (data.task_id as string) || s.currentTask?.id || '',
          user_id: s.currentTask?.user_id || '',
          prompt: s.currentTask?.prompt || prompt,
          state: 'running',
          progress: (data.progress as number) || 0,
          progress_message: (data.progress_message as string) || '',
          current_step: (data.current_step as string) || '',
          completed_steps: (data.completed_steps as number) || 0,
          total_steps: (data.total_steps as number) || 0,
          created_at: s.currentTask?.created_at || new Date().toISOString(),
        } as AsyncTask,
      }));
    };
    processor.on('progress', (event) => {
      const data = event.data as any;
      _pendingProgressData = data;
      // streamEvents 仍每次 push（FIFO 200 上限）
      set((s) => ({
        streamEvents: get()._pushStreamEvent(s.streamEvents, {
          id: `progress-${Date.now()}`,
          type: 'progress',
          timestamp: Date.now(),
          data,
        }),
      }));
      // throttle currentTask 更新到 200ms
      const now = Date.now();
      const sinceLast = now - _lastProgressUpdate;
      if (sinceLast >= 200) {
        if (_progressFlushTimer) {
          clearTimeout(_progressFlushTimer);
          _progressFlushTimer = null;
        }
        flushProgress();
      } else if (!_progressFlushTimer) {
        _progressFlushTimer = setTimeout(() => {
          _progressFlushTimer = null;
          flushProgress();
        }, 200 - sinceLast);
      }
    });

    processor.on('result', async (event) => {
      flushChunks();
      // flushReasoning 确保 result 入库时 _reasoningChunks 完整（stage:completed 读它）
      flushReasoning();
      // P21: result 到达时强制 flush updateMsg 的 timer + 残留内容，
      //      否则 50ms throttle 窗口内的最后一段 chunk 会因 timer 没机会触发而丢失。
      flushMsgUpdate();

      // ── v2 schema: SSE 下发的 result 已是收敛后的"业务产物"
      // 不携带运行时缓冲字段（_stages / _thinkingSteps / _llmChunks /
      //     _reasoningChunks / _draftContent / agent_events）。
      // 这些字段由前端 store 运行时自己累积，结果入库时再拼接（spec 2026-07-01） ──
      const frontendResult = event.data as unknown as AgentResult;
      const output = (frontendResult as any)?.output as Record<string, unknown> | undefined;

      // 流式内容优先级：message.content 全程由 llm_chunk 累积，
      // result 只注入 metadata（review_content / draft_content），
      // 不覆盖 message.content（避免 result 先到时占位符覆盖真实内容）。
      const backendReview = (output?.review_content as string | undefined);
      const backendDraft = (output?.draft_content as string | undefined);

      // 渲染用的 result：只含业务字段 + 可能注入 _reviewContent 让 ContentRenderer 工作
      const resultForUi = backendReview
        ? ({ ...frontendResult, _reviewContent: backendReview } as AgentResult)
        : frontendResult;

      // ── timeline 渲染：兼容旧 result（AgentEvents） + 新 result（无 events） ──
      const timelineEvents = resultToTimelineEvents(frontendResult);
      // 注：v2 result 不含 agent_events，所以 timelineEvents 通常为空数组，
      //     前端 fallback 到 stages 即可

      const currentState = useAgentStore.getState();

      // ── 持久化版 result：把 store 累积的运行时缓冲拼回去（仅入库用） ──
      const eventSteps = getResultThinkingSteps(frontendResult);
      const finalSteps = eventSteps.length > 0 ? eventSteps : currentState.thinkingSteps;

      // 第四批修复：保留 stage.reasoning（不再清空）——
      //     reasoning 是 StageTimeline / MessageBubble 展开态的核心数据，
      //     入库后用户刷新页面仍可看到推理摘要。
      //     DB 体积：每个 stage.reasoning 通常 < 500B，几十个 stage 累计 < 10KB，可接受。
      const persistedResult = {
        ...resultForUi,
        _stages: currentState.stages.map((s) => ({ ...s })),
        _thinkingSteps: finalSteps,
        _reasoningChunks: currentState.reasoningChunks,
        _llmChunks: currentState.llmChunks,
        _draftContent: backendDraft,
      };

      // P21: result 事件本身的 content 应该等于最终流式累积（已经过 flushMsgUpdate 写入），
      //      但 result 事件里也带 output.full_text 后端权威值，优先用后端值覆盖以避免
      //      极端情况下流式拼接错位（多 stream / reconnection 后顺序错乱）。
      const fullText = getAccumulated()
        || (output?.full_text as string | undefined)
        || (output?.content as string | undefined)
        || '';
      // 修复 BUG-C3：标记 result 已提交，后续 late text_delta 不再覆盖 message.content
      _resultCommitted = true;
      conversationStore.updateMessage(msgIdRef.current, {
        status: 'completed',
        content: fullText,
        result: resultForUi,
      });
      // 修复 BUG-C2：把完整 text 同步到对应 parts（流式过程 text_delta 走
      //     accumulatedChunks → message.content，但 parts[] 里只写了空 text part 起点；
      //     NewMessageBubble 渲染时若 parts 里有空 text part 会展示空白，
      //     而 fallback content 路径只在 parts.length === 0 时触发。
      //     此处把完整 fullText 写入最后一个 state='streaming' 的 text part，
      //     并把状态切到 done，保证 Parts 渲染与 content 一致。）
      try {
        const cur = useConversationStore.getState();
        const curMsg = cur.messages.find((m) => m.id === msgIdRef.current);
        if (curMsg && Array.isArray(curMsg.parts) && curMsg.parts.length > 0) {
          const syncedParts = curMsg.parts.map((p) =>
            p.type === 'text' && p.state === 'streaming'
              ? { ...p, content: fullText, state: 'done' as const }
              : p
          );
          if (syncedParts !== curMsg.parts) {
            cur.updateMessage(msgIdRef.current, { parts: syncedParts } as Parameters<typeof cur.updateMessage>[1]);
          }
        }
      } catch {
        // 静默：parts 同步失败不影响主流程（content 已写入）
      }
      // store 状态更新：保留运行时缓冲（运行中的 store 仍要持有）
      set((s) => ({
        currentResult: resultForUi,
        isRunning: false,
        currentTaskId: null,
        thinkingSteps: finalSteps,
        error: null,
        streamEvents: timelineEvents.length > 0 ? timelineEvents : s.streamEvents,
      }));

      // ── 前端预览同步：result 事件已包含所有预览数据（title/tags/full_text）
      //    直接在 result handler 里做，替代之前后端 preview_sync_node 的职责 ──
      const store = get();
      const previewTitle = (output?.title as string | undefined) || null;
      const previewTags = Array.isArray(output?.tags) ? (output.tags as string[]) : [];
      const previewBody = fullText || null;
      if (previewBody || previewTitle) {
        store.syncPreview({ content: previewBody, title: previewTitle, tags: previewTags });
      }

      if (conversationId) {
        // D3: 用 safePersist 守门，避免切对话后脏写
        safePersist(msgIdRef.current, {
          status: 'completed',
          content: fullText,
          result: persistedResult as unknown as Record<string, unknown>,
        });
      }
    });

    processor.on('error', (event) => {
      flushChunks();
      // P21: 同 result handler——强制 flush updateMsg 的残留，
      //      保留错误信息前用户已经看到的流式内容（即使后面会覆盖为 errorMessage）。
      flushMsgUpdate();
      // 第四批修复回归：flush reasoning/thinking 残留，避免流结束后 thinkingSteps 少最后几条
      flushReasoning();
      flushThinking();
      errorOccurred = true;
      // P12: 后端 SSE error 事件字段可能漂移（message / detail / error），
      //     code 字段命名也漂移（code / error_code），统一解析
      const errorData = event.data as Record<string, unknown>;
      const errorMessage =
        (errorData.message as string) ||
        (errorData.detail as string) ||
        (errorData.error as string) ||
        '执行出错';
      const errorCode =
        (errorData.code as string | undefined) ||
        (errorData.error_code as string | undefined) ||
        undefined;
      conversationStore.updateMessage(msgIdRef.current, {
        status: 'failed',
        content: errorMessage,
        result: errorCode ? { error: errorMessage, error_code: errorCode } : { error: errorMessage },
      });
      set((s) => ({
        error: errorMessage,
        isRunning: false,
        currentTaskId: null,
        streamEvents: get()._pushStreamEvent(s.streamEvents, {
          id: `error-${Date.now()}`,
          type: 'error',
          timestamp: Date.now(),
          data: event.data,
          content: errorMessage,
          status: 'failed',
        }),
      }));
      if (conversationId) {
        safePersist(msgIdRef.current, {
          status: 'failed',
          content: errorMessage,
          result: errorCode ? { error: errorMessage, error_code: errorCode } : { error: errorMessage },
        });
      }
    });

    // 第四批修复：reasoning 重新启用，累积到 stageReasoning + reasoningChunks + streamEvents。
    //     这是 ManagerAgent 意图分析、规划推理等"决策过程"反馈的核心通道。
    //     注意：reasoning token 频率极高（LLM reasoning 每秒 50-200 个 token），
    //     直接 set() 会打满 React 重渲染队列，阻塞 llm_chunk / result 处理。
    //     用 100ms debounce 合并连发——只取最后一条写入 store，但 streamEvents 仍逐条记。
    processor.on('llm_chunk', (event) => {
      const data = event.data as any;
      const agent = data.agent as string;
      const content = data.content as string;
      const channel = (data.channel as string) || 'body';
      const reviewRound = (data._review_round as number) || 0;

      if (channel === 'review') {
        // 修复：review channel 的内容写 llmChunks（而非 reasoningChunks），
        // 这样 stage:completed 时 stageReasoning 能从 llmChunks 读到审核评分内容
        const key = `${agent}|${reviewRound}`;
        set((s) => {
          const existing = s.llmChunks[key] || [];
          return {
            llmChunks: { ...s.llmChunks, [key]: [...existing, { agent, content, timestamp: Date.now() }] },
            streamEvents: get()._pushStreamEvent(s.streamEvents, {
              id: `review-${Date.now()}-${key}`, type: 'llm_chunk', timestamp: Date.now(),
              data: event.data, agent, content,
            }),
          };
        });
        return;
      }

      if (channel === 'search' || channel === 'reasoning') {
        pendingChunks.push({ agent, content });
        if (!chunkBatchTimer) {
          chunkBatchTimer = setTimeout(() => {
            chunkBatchTimer = null;
            flushChunks();
          }, _CHUNK_UPDATE_INTERVAL);
        }
        return;
      }

      // body channel：让 StageTimeline 折叠预览也能读到 body chunk 的前 120 字符
    // （之前 body 不进 llmChunks，"创作初稿中" 折叠预览为空）。
    // flushChunks 120ms 节流统一写入 s.llmChunks，避免每 chunk 都触发 React 重渲染。
    // message.content 仍由 accumulatedChunks + updateMsg 单独走，不重复存一份字符串。
    const isBodyChannel = channel === 'body' || !channel; // 默认 body
    if (isBodyChannel) {
      // P20: 数组 push 而非字符串拼接，长任务（>10k tokens）O(n) 而非 O(n²)
      accumulatedChunks.push(content);
      updateMsg(getAccumulated());
      // 让 StageTimeline 折叠态也能读到 body 预览（120ms 节流统一写 s.llmChunks）
      pendingChunks.push({ agent, content });
      if (!chunkBatchTimer) {
        chunkBatchTimer = setTimeout(() => {
          chunkBatchTimer = null;
          flushChunks();
        }, _CHUNK_UPDATE_INTERVAL);
      }
      return;
    }

    // reasoning / search / review — 进 llmChunks map（StageTimeline 折叠用）
    pendingChunks.push({ agent, content });
    if (!chunkBatchTimer) {
      chunkBatchTimer = setTimeout(() => {
        chunkBatchTimer = null;
        flushChunks();
      }, _CHUNK_UPDATE_INTERVAL);
    }
    });

    processor.on('done', (event) => {
      flushChunks();
      // P21: 同 result handler——强制 flush updateMsg timer，避免最后一段 chunk 丢失。
      flushMsgUpdate();
      // 第四批修复回归：flush reasoning/thinking 残留，避免流结束后 thinkingSteps 少最后几条
      flushReasoning();
      flushThinking();
      if (errorOccurred) return;
      // P21: 去掉 !alreadySet 短路。原实现依赖 currentResult 作为"已完成"信号，
      //      但 result handler 已经 set 了 currentResult，导致 alreadySet 几乎总是 true，
      //      done 的"最终注入累积内容"分支永远不执行——最后一段 chunk 丢失。
      //      这里只判断"还有未写入的内容"即可。
      if (accumulatedChunks.length > 0) {
        conversationStore.updateMessage(msgIdRef.current, { content: getAccumulated() });
      }

// B3: done 时如果 currentResult 仍为空（中途断网 / 事件丢失），
    //     fallback 到 GET /agent/async/status 兜底拉取
    //
    //     P10 schema 不一致说明：
    //     - 正常路径：result 事件携带 v2 收敛 schema（不含 _stages/_thinkingSteps/agent_events）
    //     - fallback 路径：async/status 返回 task.result 是**后端全量 AgentResult**（含运行时缓冲）
    //     两者字段不同，但都有 output.full_text / output.content——UI 渲染统一从这些字段取，
    //     多余字段（_stages 等）只在 StageTimeline 历史渲染路径里用到，不影响主流程。
    if (!get().currentResult) {
        const taskIdFromDone = (event?.data as any)?.task_id as string | undefined;
        const fallbackTaskId = taskIdFromDone || get().currentTaskId;
        if (fallbackTaskId) {
          // 异步 fetch async/status；不阻塞 done 的清场流程
          agentApi.getAsyncStatus(fallbackTaskId)
            .then((res) => {
              const task = res?.data?.data;
              if (!task) return;
              const status = task.state; // completed / failed / cancelled / running
              if (status === 'completed' && task.result) {
                // async/status 返回的是 AgentResult（业务 schema），直接可用
                const completedResult = task.result as Record<string, unknown>;
                const fullText =
                  ((completedResult as any).output?.full_text as string | undefined) ||
                  ((completedResult as any).output?.content as string | undefined) ||
                  getAccumulated();
                conversationStore.updateMessage(msgIdRef.current, {
                  status: 'completed',
                  content: fullText,
                  result: completedResult,
                });
                set({ currentResult: completedResult as any });
              } else if (status === 'failed') {
                // P11: to_dict() 里只有 error 字段，没有 error_code；别再加 undefined 字段
                const errorMsg = task.error || '执行失败';
                conversationStore.updateMessage(msgIdRef.current, {
                  status: 'failed',
                  content: errorMsg,
                  result: { error: errorMsg },
                });
                set({ error: errorMsg });
              } else if (status === 'cancelled') {
                conversationStore.updateMessage(msgIdRef.current, {
                  status: 'cancelled',
                });
              }
            })
            .catch((err) => {
              console.warn('[useAgentStore] async/status fallback failed:', err);
            });
        }
      }

      set((s) => ({
        isRunning: false,
        currentTaskId: null,
        _abortController: null,
        _streamingProcessor: null,
        streamEvents: get()._pushStreamEvent(s.streamEvents, {
          id: `done-${Date.now()}`,
          type: 'done',
          timestamp: Date.now(),
          data: {},
        }),
      }));
    });

    const appliedSkill = useAgentStore.getState().appliedSkill;
    const bodyPayload: Record<string, unknown> = { prompt };
    if (appliedSkill?.skill_id) bodyPayload.skill_id = appliedSkill.skill_id;
    if (platform) bodyPayload.platform = platform;
    const resolvedParameters = { ...(parameters || {}) };
    if (Object.keys(resolvedParameters).length > 0) bodyPayload.parameters = resolvedParameters;
    if (trigger && typeof trigger === 'object') bodyPayload.trigger = trigger;
    set({ _streamingProcessor: processor });

    // Fire SSE and message creation in parallel
    const [connectError] = await Promise.all([
      (async (): Promise<string | null> => {
        let err: string | null = null;
        await processor.connect(agentApi.streamV3Url(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(bodyPayload),
        }, {
          onError(errorMsg) {
            if (errorOccurred) return;
            err = errorMsg;
          },
        }, controller.signal);
        return err;
      })(),
      messagePromise.then((realId) => { msgIdRef.current = realId; }),
    ]);

    if (connectError && !errorOccurred) {
      // D2: 如果连接失败但 task_id 已拿到（task_created 已下发），fallback 到 async/status
      // 多数情况下后端已经启动任务，只是 SSE 通道断了——async/status 能拿到结果
      const fallbackTaskId = get().currentTaskId;
      if (fallbackTaskId) {
        setTimeout(() => {
          agentApi.getAsyncStatus(fallbackTaskId)
            .then((res) => {
              const task = res?.data?.data;
              if (!task) return;
              if (task.state === 'completed' && task.result) {
                const completedResult = task.result as Record<string, unknown>;
                const fullText =
                  ((completedResult as any).output?.full_text as string | undefined) ||
                  ((completedResult as any).output?.content as string | undefined) ||
                  '';
                conversationStore.updateMessage(msgIdRef.current, {
                  status: 'completed',
                  content: fullText,
                  result: completedResult,
                });
                set({ currentResult: completedResult as any, error: null });
              } else if (task.state === 'failed') {
                conversationStore.updateMessage(msgIdRef.current, {
                  status: 'failed',
                  content: task.error || '执行失败',
                  result: { error: task.error || '执行失败' },
                });
                set({ error: task.error || '执行失败' });
              }
            })
            .catch(() => { /* 静默失败，UI 已是 failed 状态 */ });
        }, 1500); // 给后端 1.5s 缓冲
      } else {
        conversationStore.updateMessage(msgIdRef.current, {
          status: 'failed',
          content: connectError,
        });
      }
      set({
        error: connectError,
        isRunning: false,
        currentTaskId: null,
        currentResult: null,
        _abortController: null,
        _streamingProcessor: null,
      });
    }
    set({ _abortController: null, _streamingProcessor: null });
  },

  loadTaskStatus: async (taskId: string) => {
    try {
      const response = await agentApi.getAsyncStatus(taskId);
      if (response.data.success && response.data.data) {
        const task = response.data.data as unknown as AsyncTask;
        set({
          currentTask: task,
          isRunning: task.state === 'running' || task.state === 'pending',
        });
        if (task.state === 'completed' && task.result) {
          set({ currentResult: task.result as unknown as AgentResult });
        }
      }
    } catch (e) {
      set({ error: String(e) });
    }
  },

  setCurrentResult: (result) => set({ currentResult: result }),
  setCurrentTask: (task) => set({ currentTask: task }),

  cancelTask: async (taskId: string) => {
    const { _abortController, _streamingProcessor } = useAgentStore.getState();
    if (_abortController) {
      _abortController.abort();
    }
    if (_streamingProcessor) {
      _streamingProcessor.abort();
    }
    set({
      isRunning: false,
      currentTaskId: null,
      _abortController: null,
      _streamingProcessor: null,
    });
    if (!taskId) return true;
    try {
      const response = await agentApi.cancelTask(taskId);
      return response.data.success;
    } catch (e) {
      console.error('cancelTask failed:', e);
      return false;
    }
  },

  clearCurrent: () => {
    const s = useAgentStore.getState();
    if (s._abortController) s._abortController.abort();
    if (s._streamingProcessor) s._streamingProcessor.abort();
    set({
      currentTaskId: null,
      currentTask: null,
      currentResult: null,
      currentPlan: null,
      isRunning: false,
      error: null,
      thinkingSteps: [],
      llmChunks: {},
      reasoningChunks: {},
      stages: [],
      currentStage: null,
      intentConflicts: [],
      streamEvents: [],
      _abortController: null,
      _streamingProcessor: null,
      streamingMessageId: null,
      previewContent: null,
      previewTitle: null,
      previewTags: [],
    });
  },

  reset: () => {
    const s = useAgentStore.getState();
    // 1. 关闭所有活动连接
    if (s._abortController) s._abortController.abort();
    if (s._streamingProcessor) s._streamingProcessor.abort();
    if (typeof s.disconnectWebSocket === 'function') {
      s.disconnectWebSocket();
    }
    // P6: _ws / _reconnectTimer / wsConnectionState 已从 state 移除，无需清理

    // 2. 修复 BUG-12：清空所有属于本 store 的状态。
    // 注意：对话管理（messages / conversationId / conversationList 等）已迁移到
    // useConversationStore，本 store 类型里也没声明这些字段。如果把它们写进
    // set()，在 zustand 默认的浅合并下会被静默丢弃，造成"看上去清了实际没清"的隐患。
    // 这里只重置本 store 实际持有的字段。
    set({
      currentTaskId: null,
      currentTask: null,
      currentResult: null,
      currentPlan: null,
      isRunning: false,
      error: null,
      thinkingSteps: [],
      streamEvents: [],
      llmChunks: {},
      reasoningChunks: {},
      stages: [],
      currentStage: null,
      intentConflicts: [],
      hasFirstEventReceived: false,
      _abortController: null,
      _streamingProcessor: null,
      streamingMessageId: null,
      // 预览相关：本 store 持有 previewContent/previewTitle/previewTags/previewPlatform/previewContentType
      // 用户切换账号时也应清空，避免上一个用户的内容泄露
      previewContent: null,
      previewTitle: null,
      previewTags: [],
      previewPlatform: null,
      previewContentType: null,
      // 技能选择：跨账号不应该保留（不同用户的技能库可能不同）
      appliedSkill: null,
      appliedSkillFull: null,
    });

    // 3. 清 localStorage
    try {
      localStorage.removeItem('autopublish-conversations');
    } catch {}
  },

  // 辅助方法：获取 _pushStreamEvent
  _pushStreamEvent: (events: StreamEvent[], event: StreamEvent): StreamEvent[] => {
    const arr = [...events, event];
    return arr.length > _MAX_STREAM_EVENTS ? arr.slice(-_MAX_STREAM_EVENTS) : arr;
  },
}));
