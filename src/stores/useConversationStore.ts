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

// ============ 类型定义 ============

export interface DeletedConversation {
  conversation: ChatConversationSummary;
  messages: ChatMessage[];
  deletedAt: number;
}

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
  
  // 删除撤销
  lastDeleted: DeletedConversation | null;
  undoTimer: ReturnType<typeof setTimeout> | null;
  
  // 请求追踪（用于竞态处理）
  _inflightLoadId: string | null;
  _requestId: number;

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
  
  // Actions - 删除（含撤销）
  deleteConversation: (id: string, options?: {
    showErrorToast?: (msg: string) => void;
    showUndoToast?: (deleted: DeletedConversation, undo: () => void) => void;
  }) => Promise<boolean>;
  undoDelete: () => Promise<boolean>;
  clearUndoTimer: () => void;
  
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

const UNDO_TIMEOUT = 5000; // 5秒撤销窗口

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
      lastDeleted: null,
      undoTimer: null,
      _inflightLoadId: null,
      _requestId: 0,

      // ============ 对话列表加载 ============
      loadConversations: async (options) => {
        const { searchQuery } = get();
        // 请求 ID 竞态防护：每次新请求前递增，处理"切换账号时旧请求污染 store"的问题
        // 注意：immer 包装下 state 是只读的，必须通过 set() 修改
        let myRequestId = 0;
        set((s) => {
          s._requestId += 1;
          myRequestId = s._requestId;
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

        set((s) => { s.isLoadingMore = true; });

        try {
          const response = await chatApi.listConversations({
            limit,
            offset: conversations.length,
            q: searchQuery || undefined,
          });

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
        // 清除之前的撤销计时器
        get().clearUndoTimer();

        // 更新当前对话 ID（乐观更新）
        set((s) => {
          s.conversationId = id;
          s.messages = [];
          s._inflightLoadId = id;
        });

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
            saveToStorage({ currentId: conv.id });
            return conv.id;
          }
          return null;
        } catch (e) {
          console.error('[createConversation] failed:', e);
          return null;
        }
      },

      // ============ 删除对话（含撤销） ============
      deleteConversation: async (id, options) => {
        const state = get();
        const conversation = state.conversations.find(c => c.id === id);
        if (!conversation) return false;

        // 乐观更新：立即从列表移除
        set((s) => {
          s.conversations = s.conversations.filter(c => c.id !== id);
          s.conversationsTotal -= 1;
          
          // 如果删除的是当前对话，切换到下一个
          if (s.conversationId === id) {
            const remaining = s.conversations.filter(c => c.id !== id);
            s.conversationId = remaining[0]?.id ?? null;
            s.messages = [];
            saveToStorage({ currentId: s.conversationId });
          }
        });

        // 保存删除记录（用于撤销）
        const deletedRecord: DeletedConversation = {
          conversation,
          messages: state.conversationId === id ? [...state.messages] : [],
          deletedAt: Date.now(),
        };

        try {
          const response = await chatApi.deleteConversation(id);
          if (response.data.success) {
            // 保存撤销信息并启动计时器
            set((s) => {
              s.lastDeleted = deletedRecord;
            });

            const undo = () => get().undoDelete();
            const timer = setTimeout(() => {
              set((s) => {
                s.lastDeleted = null;
                s.undoTimer = null;
              });
            }, UNDO_TIMEOUT);

            set((s) => { s.undoTimer = timer; });
            options?.showUndoToast?.(deletedRecord, undo);
            return true;
          }
          return false;
        } catch (e) {
          console.error('[deleteConversation] failed:', e);
          // 网络失败时回滚
          set((s) => {
            s.conversations = [conversation, ...s.conversations];
            s.conversationsTotal += 1;
            if (s.conversationId === null && id !== conversation.id) {
              s.conversationId = id;
              s.messages = deletedRecord.messages;
            }
          });
          options?.showErrorToast?.('删除失败，请重试');
          return false;
        }
      },

      // ============ 撤销删除 ============
      undoDelete: async () => {
        const { lastDeleted } = get();
        if (!lastDeleted) return false;

        get().clearUndoTimer();

        try {
          const response = await chatApi.createConversation({
            title: lastDeleted.conversation.title,
          });

          if (response.data.success && response.data.data) {
            const restoredConv = response.data.data;
            
            // 更新为原 ID
            set((s) => {
              // 找到恢复的对话并更新为原 ID
              const idx = s.conversations.findIndex(c => c.id === restoredConv.id);
              if (idx >= 0) {
                s.conversations[idx] = {
                  ...s.conversations[idx],
                  id: lastDeleted.conversation.id,
                  title: lastDeleted.conversation.title,
                  is_pinned: lastDeleted.conversation.is_pinned,
                  created_at: lastDeleted.conversation.created_at,
                  updated_at: new Date().toISOString(),
                  message_count: lastDeleted.conversation.message_count,
                  last_message: lastDeleted.conversation.last_message,
                };
                // 重新排序
                s.conversations.sort((a, b) => {
                  if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
                  return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
                });
              }
              s.lastDeleted = null;
            });

            // 如果删除的是当前对话，恢复消息
            if ((lastDeleted.messages ?? []).length > 0) {
              // 重新加载消息以确保同步
              await get().switchConversation(lastDeleted.conversation.id);
            }

            return true;
          }
          return false;
        } catch (e) {
          console.error('[undoDelete] failed:', e);
          return false;
        }
      },

      // ============ 清除撤销计时器 ============
      clearUndoTimer: () => {
        const { undoTimer } = get();
        if (undoTimer) {
          clearTimeout(undoTimer);
        }
        set((s) => {
          s.undoTimer = null;
          // 只在撤销超时后清除 lastDeleted
          // 如果用户主动撤销，会在 undoDelete 中清除
        });
      },

      // ============ 置顶/取消置顶 ============
      pinConversation: async (id, pinned, options) => {
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
          return response.data.success;
        } catch (e) {
          console.error('[pinConversation] failed:', e);
          // 回滚
          set((s) => {
            const conv = s.conversations.find(c => c.id === id);
            if (conv) {
              conv.is_pinned = !pinned;
            }
          });
          options?.showErrorToast?.(pinned ? '置顶失败' : '取消置顶失败');
          return false;
        }
      },

      // ============ 更新标题 ============
      updateTitle: async (id, title, options) => {
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
          return response.data.success;
        } catch (e) {
          console.error('[updateTitle] failed:', e);
          options?.showErrorToast?.('更新标题失败');
          return false;
        }
      },

      // ============ 消息操作 ============
      addMessage: (msg) => set((s) => {
        s.messages.push(msg);
      }),

      updateMessage: (id, updates) => set((s) => {
        const idx = s.messages.findIndex(m => m.id === id);
        if (idx >= 0) {
          Object.assign(s.messages[idx], updates);
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
        get().clearUndoTimer();
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
          lastDeleted: null,
          undoTimer: null,
          _inflightLoadId: null,
          _requestId: 0,
        });
        saveToStorage({ currentId: null });
      },
    };
  })
);
