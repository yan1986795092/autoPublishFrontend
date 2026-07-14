/**
 * useConversationStore - 对话管理专用 Store
 * 
 * 职责：
 * - 对话列表 CRUD
 * - 消息列表管理
 * - 加载状态、错误处理
 * - 分页、搜索
 * - 置顶/取消置顶
 * - 删除（含撤销机制）
 */
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { chatApi } from '../services/api';
import { useAgentStore } from './useAgentStore';
import type { ChatMessage } from '../types/agent';
import type { ChatConversationSummary } from '../services/api';

const STORAGE_KEY = 'conversation-state';

/** 本地存储结构 */
interface PersistedState {
  currentId: string | null;
}

function loadFromStorage(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { currentId: null };
}

function saveToStorage(state: PersistedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

/**
 * 修复 BUG-16：切换/创建对话时清空 useAgentStore 的预览相关字段，
 * 防止上一条消息的 previewPlatform/previewContent/previewContentType 污染新对话。
 * 不会清空 useAgentStore 的其他状态（任务执行、stages 等），让用户在切换后还能看到对应任务的运行。
 */
function clearAgentPreviewFields() {
  try {
    useAgentStore.setState({
      previewContent: null,
      previewPlatform: null,
      previewContentType: null,
    });
  } catch {
    // useAgentStore 未初始化（极少数边界），忽略
  }
}

/**
 * 修复会话切换一致性问题：清空 useAgentStore 中所有与"生成过程"相关的状态。
 *
 * 问题根因：switchConversation 时没有清理 stages/llmChunks/reasoningChunks/think
 * ingSteps/streamEvents，
 * 导致切到历史会话后 Workspace 仍可能读到上一个会话的残留状态，造成：
 *   1. 生成流程卡片内容与实际会话不匹配（中间过程显示的是旧会话的 stages）
 *   2. 切换后 stages 为空或显示错误的 agent 阶段
 *
 * 包含字段：isRunning, streamingMessageId, thinkingSteps, streamEvents,
 * llmChunks, reasoningChunks, stages, currentStage, intentConflicts,
 * hasFirstEventReceived
 *
 * 注意：不重置 currentTaskId / currentResult / currentTask —— 这些是任务级别的，
 * 不属于会话级别的生成流状态。
 */
function clearAgentGenerationState() {
  try {
    useAgentStore.setState({
      isRunning: false,
      streamingMessageId: null,
      thinkingSteps: [],
      streamEvents: [],
      llmChunks: {},
      reasoningChunks: {},
      stages: [],
      currentStage: null,
      intentConflicts: [],
      hasFirstEventReceived: false,
    });
  } catch {
    // useAgentStore 未初始化，忽略
  }
}

// ============ 类型定义 ============

interface ConversationState {
  // 核心状态
  conversationId: string | null;
  conversations: ChatConversationSummary[];
  conversationsTotal: number;
  messages: ChatMessage[];

  // 加载状态
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  isLoadingMore: boolean;

  // 错误状态
  error: string | null;

  // 分页
  hasMore: boolean;
  limit: number;

  // 搜索
  searchQuery: string;

  // 请求追踪（用于竞态处理）
  _inflightLoadId: string | null;
  _requestId: number;
  _loadConvRequestKey: string | null; // 请求级去重：'{offset}-{q}'

  // Actions - 对话列表
  loadConversations: (options?: {
    showErrorToast?: (msg: string) => void;
    searchQuery?: string;
  }) => Promise<void>;
  loadMoreConversations: (options?: {
    showErrorToast?: (msg: string) => void;
  }) => Promise<void>;

  // Actions - 对话切换
  switchConversation: (id: string | null) => Promise<void>;

  // Actions - 创建
  createConversation: (title?: string) => Promise<string | null>;

  // Actions - 删除（不再提供撤销功能）
  deleteConversation: (id: string, options?: {
    showErrorToast?: (msg: string) => void;
  }) => Promise<boolean>;

  // Actions - 置顶
  pinConversation: (id: string, pinned: boolean, options?: {
    showErrorToast?: (msg: string) => void;
  }) => Promise<boolean>;

  // Actions - 标题
  updateTitle: (id: string, title: string, options?: {
    showErrorToast?: (msg: string) => void;
  }) => Promise<boolean>;

  // Actions - 消息
  addMessage: (msg: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  clearMessages: () => void;

  // Actions - 搜索
  setSearchQuery: (query: string) => void;

  // Actions - 清理
  clearError: () => void;
  reset: () => void;
}

export const useConversationStore = create<ConversationState>()(
  immer((set, get) => {
    // 初始化从本地存储恢复
    const persisted = loadFromStorage();
    
    return {
      // 初始状态
      conversationId: persisted.currentId,
      conversations: [],
      conversationsTotal: 0,
      messages: [],
      isLoadingConversations: false,
      isLoadingMessages: false,
      isLoadingMore: false,
      error: null,
      hasMore: false,
      limit: 50,
      searchQuery: '',
      _inflightLoadId: null,
      _requestId: 0,
      _loadConvRequestKey: null,

      // ============ 对话列表加载 ============
      loadConversations: async (options) => {
        const { searchQuery } = get();
        // 请求级去重：如果已有相同 offset+q 的请求在飞，直接跳过
        const requestKey = `0-${searchQuery || ''}`;
        if (get()._loadConvRequestKey === requestKey) return;
        // 请求 ID 竞态防护：每次新请求前递增，处理"切换账号时旧请求污染 store"的问题
        // 注意：immer 包装下 state 是只读的，必须通过 set() 修改
        let myRequestId = 0;
        set((s) => {
          s._requestId += 1;
          myRequestId = s._requestId;
          s._loadConvRequestKey = requestKey;
          s.isLoadingConversations = true;
          s.error = null;
        });

        try {
          const response = await chatApi.listConversations({
            limit: get().limit,
            offset: 0,
            q: searchQuery || undefined,
          });

          // 如果此期间有更新请求（用户切换/重新搜索），丢弃当前响应
          if (get()._requestId !== myRequestId) {
            return;
          }

          if (response.data.success && response.data.data) {
            const data = response.data.data;
            set((s) => {
              s.conversations = data.conversations;
              s.conversationsTotal = data.total ?? data.conversations.length;
              s.hasMore = (data.offset ?? 0) + data.conversations.length < data.total;
              s.isLoadingConversations = false;
            });

            // 持久化当前对话 ID
            const currentId = get().conversationId;
            saveToStorage({ currentId });
          }
        } catch (e) {
          // 过期请求的错误也不展示
          if (get()._requestId !== myRequestId) return;

          console.error('[loadConversations] failed:', e);
          set((s) => {
            s.error = '加载对话历史失败，请检查网络连接';
            s.isLoadingConversations = false;
          });
          options?.showErrorToast?.('加载对话历史失败，请检查网络连接');
        }
      },

      // ============ 加载更多（分页） ============
      loadMoreConversations: async (options) => {
        const { conversations, limit, searchQuery, hasMore, isLoadingMore } = get();
        if (!hasMore || isLoadingMore) return;

        // 修复 BUG-18：快照当前搜索词 / 列表长度，用于响应回来时校验是否过期
        const snapshotSearchQuery = searchQuery;
        const snapshotConversationsLen = conversations.length;

        set((s) => { s.isLoadingMore = true; });

        try {
          const response = await chatApi.listConversations({
            limit,
            offset: conversations.length,
            q: searchQuery || undefined,
          });

          // 修复 BUG-18：如果期间用户改了搜索词 / 调用了 reset / 列表已重置，
          // 丢弃此分页响应（避免 append 到错误的列表上）
          const now = get();
          if (
            now.searchQuery !== snapshotSearchQuery ||
            now.conversations.length < snapshotConversationsLen
          ) {
            set((s) => { s.isLoadingMore = false; });
            return;
          }

          if (response.data.success && response.data.data) {
            const data = response.data.data;
            set((s) => {
              // 合并，避免重复
              const existingIds = new Set(s.conversations.map(c => c.id));
              const newItems = data.conversations.filter(
                (c: ChatConversationSummary) => !existingIds.has(c.id)
              );
              s.conversations = [...s.conversations, ...newItems];
              s.hasMore = (data.offset ?? 0) + data.conversations.length < data.total;
              s.isLoadingMore = false;
            });
          }
        } catch (e) {
          console.error('[loadMoreConversations] failed:', e);
          set((s) => { s.isLoadingMore = false; });
          options?.showErrorToast?.('加载更多失败');
        }
      },

      // ============ 切换对话 ============
      switchConversation: async (id) => {
        // 修复 #5：切对话前先停掉所有进行中的流
        // 否则 SSE 还在跑，agent stream 还在跑，切过去后 store 里的 isRunning
        // 还是 true，且新消息会被写到错误的 conversationId
        // P23: 用 try/finally 把"停流 + 清预览 + 切 ID"打包成原子序列——
        //     任何一步 throw 都不让 store 处于半残状态（preview 残留 / ID 不一致）。
        try {
          const { useAgentStore } = await import('./useAgentStore');
          // stopStreaming 内部已经 abort SSE + 重置 _abortController/_streamingProcessor
          useAgentStore.getState().stopStreaming();
          useAgentStore.getState().disconnectWebSocket();
          // 同步清预览（保证下一行 set 之前 preview 字段已 null）
          clearAgentPreviewFields();
          // 修复会话切换一致性问题：清空所有生成流状态（stages/llmChunks/reasoningChunks 等），
          // 避免切到历史会话后 Workspace 仍显示上一个会话的残留 stages
          clearAgentGenerationState();
        } catch {
          // 即便 useAgentStore 未初始化或抛错，也保证清预览和生成状态
          clearAgentPreviewFields();
          clearAgentGenerationState();
        }
        // 注意：useConversationChat 的 abort 必须在 useConversationChat 的 hook 内调用
        // 这里通过全局事件广播，让 hook 监听后自停
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('app:conversation-switching'));
        }

        // 更新当前对话 ID（乐观更新）
        set((s) => {
          s.conversationId = id;
          s.messages = [];
          s._inflightLoadId = id;
        });

        // P23: clearAgentPreviewFields 已在前面 try/finally 内同步调用过（保证停流与清预览原子），
        //     此处不再重复调用。

        // 持久化
        saveToStorage({ currentId: id });

        if (!id) return;

        set((s) => { s.isLoadingMessages = true; });

        try {
          const response = await chatApi.getConversation(id);
          const state = get();

          // 竞态检查：如果在加载期间用户切换到了其他对话，丢弃结果
          if (state._inflightLoadId !== id) {
            return;
          }

          if (response.data.success && response.data.data) {
            const messages = response.data.data.messages ?? [];
            const chatMessages: ChatMessage[] = messages.map((m: any) => ({
              id: m.id,
              role: m.role as 'user' | 'assistant' | 'system',
              content: m.content,
              timestamp: new Date(m.created_at).getTime(),
              status: (m.status || 'completed') as ChatMessage['status'],
              result: m.result,
              taskId: m.task_id,
              plan: m.plan,
              kind: m.kind,
              renderMode: m.render_mode,
              renderPayload: m.render_payload,
              generationMeta: m.generation_meta,
              parts: m.parts,
              is_generation: m.is_generation,
            }));

            set((s) => {
              s.messages = chatMessages;
              s.isLoadingMessages = false;
            });
          }
        } catch (e) {
          console.error('[loadConversationMessages] failed:', e);
          const state = get();
          if (state._inflightLoadId === id) {
            set((s) => {
              s.error = '加载对话内容失败';
              s.isLoadingMessages = false;
            });
          }
        }
      },

      // ============ 创建对话 ============
      createConversation: async (title) => {
        try {
          const response = await chatApi.createConversation({ title });
          if (response.data.success && response.data.data) {
            const conv = response.data.data;
            set((s) => {
              s.conversations = [conv, ...s.conversations];
              s.conversationId = conv.id;
              s.messages = [];
              s.conversationsTotal += 1;
            });
            // 修复 BUG-16：新对话开始时清空预览字段
            clearAgentPreviewFields();
            saveToStorage({ currentId: conv.id });
            return conv.id;
          }
          return null;
        } catch (e) {
          console.error('[createConversation] failed:', e);
          return null;
        }
      },

      // ============ 删除对话（不再提供撤销功能） ============
      deleteConversation: async (id, options) => {
        const state = get();
        const conversation = state.conversations.find(c => c.id === id);
        if (!conversation) return false;

        // 修复 BUG-5 + BUG-7：捕获回滚所需的原始 state（messages / conversationId）
        const originalMessages = state.messages;
        const originalConversationId = state.conversationId;

        // 乐观更新：立即从列表移除
        let switchedTo: string | null = null;
        set((s) => {
          s.conversations = s.conversations.filter(c => c.id !== id);
          s.conversationsTotal -= 1;

          // 如果删除的是当前对话，切换到下一个
          if (s.conversationId === id) {
            const remaining = s.conversations;
            switchedTo = remaining[0]?.id ?? null;
            s.conversationId = switchedTo;
            s.messages = [];
            saveToStorage({ currentId: switchedTo });
          }
        });

        // 修复 BUG-B：如果切换到了另一个对话，重新加载其消息（否则 messages = []
        // 导致看到空白内容，直到下次手动切换才触发 switchConversation）
        let switchedPromise: Promise<void> | null = null;
        if (switchedTo !== null) {
          switchedPromise = get().switchConversation(switchedTo);
        } else if (state.conversationId === id) {
          // 没有其他对话可切换，清空预览字段
          clearAgentPreviewFields();
        }

        try {
          const response = await chatApi.deleteConversation(id);
          // 等切换完成（如果存在）
          if (switchedPromise) await switchedPromise;
          return response.data.success;
        } catch (e) {
          console.error('[deleteConversation] failed:', e);
          // 取消正在进行的 switchConversation 切换（如果已发起），把消息恢复原状
          // 否则会出现"服务端删除失败 + 前端切换到另一对话 + 看到空白"的复合错误
          if (switchedPromise) {
            // 取消切换：把 conversationId 和 messages 还原
            set((s) => {
              s.conversationId = originalConversationId;
              s.messages = originalMessages;
            });
          }

          // 网络失败时回滚：恢复对话到列表头部
          set((s) => {
            s.conversations = [conversation, ...s.conversations];
            s.conversationsTotal += 1;
            // 如果当前在某个对话上（不论是不是被回滚的），不动 conversationId
            if (s.conversationId === null) {
              // 用户当时在已删对话上，回滚后回到该对话（消息用户会重新加载）
              s.conversationId = id;
              s.messages = originalMessages; // 修复 BUG-5：恢复原始消息
            }
          });

          // 修复 BUG-7：同步 localStorage（乐观更新阶段已经改过 currentId）
          saveToStorage({ currentId: get().conversationId });

          options?.showErrorToast?.('删除失败，请重试');
          return false;
        }
      },

      // ============ 置顶/取消置顶 ============
      pinConversation: async (id, pinned, options) => {
        // 修复 BUG-2：记录原始 updated_at 用于失败回滚
        const original = get().conversations.find(c => c.id === id);
        const originalUpdatedAt = original?.updated_at;

        // 乐观更新
        set((s) => {
          const conv = s.conversations.find(c => c.id === id);
          if (conv) {
            conv.is_pinned = pinned;
            conv.updated_at = new Date().toISOString();
          }
          // 重新排序：置顶的在前
          s.conversations.sort((a, b) => {
            if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
            return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
          });
        });

        try {
          const response = await chatApi.pinConversation(id, pinned);
          // 修复 BUG-13：用服务端返回值校准本地状态
          if (response.data.success && response.data.data) {
            const serverConv = response.data.data;
            set((s) => {
              const conv = s.conversations.find(c => c.id === id);
              if (conv) {
                conv.is_pinned = serverConv.is_pinned;
                conv.updated_at = serverConv.updated_at;
              }
              s.conversations.sort((a, b) => {
                if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
                return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
              });
            });
            return true;
          }
          throw new Error('pinConversation server success=false');
        } catch (e) {
          console.error('[pinConversation] failed:', e);
          // 修复 BUG-2：回滚 is_pinned 和 updated_at
          set((s) => {
            const conv = s.conversations.find(c => c.id === id);
            if (conv) {
              conv.is_pinned = !pinned;
              if (originalUpdatedAt !== undefined) {
                conv.updated_at = originalUpdatedAt;
              }
            }
            s.conversations.sort((a, b) => {
              if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
              return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
            });
          });
          options?.showErrorToast?.(pinned ? '置顶失败' : '取消置顶失败');
          return false;
        }
      },

      // ============ 更新标题 ============
      updateTitle: async (id, title, options) => {
        // 修复 BUG-1：捕获原始 title/updated_at 用于失败回滚
        const original = get().conversations.find(c => c.id === id);
        const originalTitle = original?.title;
        const originalUpdatedAt = original?.updated_at;

        // 乐观更新
        set((s) => {
          const conv = s.conversations.find(c => c.id === id);
          if (conv) {
            conv.title = title;
            conv.updated_at = new Date().toISOString();
          }
        });

        try {
          const response = await chatApi.updateConversation(id, { title });
          // 修复 BUG-13：用服务端返回值校准本地状态（避免与服务端时间漂移）
          if (response.data.success && response.data.data) {
            const serverConv = response.data.data;
            set((s) => {
              const conv = s.conversations.find(c => c.id === id);
              if (conv) {
                conv.title = serverConv.title;
                conv.updated_at = serverConv.updated_at;
              }
            });
            return true;
          }
          // success: false 走回滚路径
          throw new Error('updateTitle server success=false');
        } catch (e) {
          console.error('[updateTitle] failed:', e);
          // 修复 BUG-1：回滚 title / updated_at
          if (originalTitle !== undefined && originalUpdatedAt !== undefined) {
            set((s) => {
              const conv = s.conversations.find(c => c.id === id);
              if (conv) {
                conv.title = originalTitle;
                conv.updated_at = originalUpdatedAt;
              }
            });
          }
          options?.showErrorToast?.('更新标题失败');
          return false;
        }
      },

      // ============ 消息操作 ============
      addMessage: (msg) => set((s) => {
        s.messages.push(msg);
        // 同步更新 conversations 列表中当前对话的 message_count / updated_at
        // 避免"列表里的 count 与实际 messages 长度不一致"导致 UI 误判
        // （例如：加号按钮误把已发送消息的对话当成空对话，仍然切换回去而不是新建）
        // 注意：last_message 不在此处更新——它依赖服务端 _build_message_response 的 UI 字段
        // （kind/render_mode/parts 等），本地重建不准确。下次 loadConversations 时会刷新。
        const conv = s.conversations.find(c => c.id === s.conversationId);
        if (conv) {
          conv.message_count = s.messages.length;
          conv.updated_at = new Date(msg.timestamp).toISOString();
        }
      }),

  updateMessage: (id, updates) => set((s) => {
    const idx = s.messages.findIndex(m => m.id === id);
    if (idx >= 0) {
      // 强制返回新对象：React.memo 依赖引用比较，原地修改会导致流式更新不重渲染
      s.messages[idx] = { ...s.messages[idx], ...updates };
    }
  }),

      clearMessages: () => set((s) => {
        s.messages = [];
      }),

      // ============ 搜索 ============
      setSearchQuery: (query) => set((s) => {
        s.searchQuery = query;
      }),

      // ============ 清理 ============
      clearError: () => set((s) => {
        s.error = null;
      }),

      reset: () => {
        set({
          conversationId: null,
          conversations: [],
          conversationsTotal: 0,
          messages: [],
          isLoadingConversations: false,
          isLoadingMessages: false,
          isLoadingMore: false,
          error: null,
          hasMore: false,
          searchQuery: '',
          _inflightLoadId: null,
          _requestId: 0,
          _loadConvRequestKey: null,
        });
        saveToStorage({ currentId: null });
      },
    };
  })
);
