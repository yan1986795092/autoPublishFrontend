/**
 * 统一清理所有业务 store
 *
 * 解决的核心问题：
 *   用户 A 退出后，用户 B 登录，前端 useAgentStore 中残留的对话/任务状态
 *   会导致 B 看到 A 的对话上下文。
 *
 * 触发时机：
 *   1. useAuthStore.logout() 调用
 *   2. App.tsx 检测到 user.id 变化
 *   3. 任何手动调用
 *
 * 保留：
 *   - useSettingsStore（个人偏好跨账号保留，例如主题/字号）
 *   - 浏览器 localStorage 中的非用户数据
 */

import { useAgentStore } from './useAgentStore';
import { useAuthStore } from './useAuthStore';
import { useConversationStore } from './useConversationStore';
import { useUIStore } from './useUIStore';
import type { QueryClient } from '@tanstack/react-query';

// 所有 zustand persist 的 key
const STORE_KEYS_TO_CLEAR = [
  'autopublish-auth',          // useAuthStore
  'autopublish-agent',         // 任何 zustand persist on agent store（备用）
  'autopublish-conversations', // useAgentStore 手动 localStorage key
  'conversation-state',        // useConversationStore 手动 localStorage key
];

/**
 * 获取 React Query 实例（由 main.tsx 挂到 window 上）
 * 返回 null 时表示 React Query 未启用或 main.tsx 还没执行
 */
function getQueryClient(): QueryClient | null {
  if (typeof window === 'undefined') return null;
  return ((window as unknown as { __queryClient?: QueryClient }).__queryClient) ?? null;
}

export function clearAllUserStores(): void {
  console.log('[clearAllUserStores] 开始清理用户数据');

  // 1. 清理 conversation store（专用的对话历史 store，含撤销计时器）
  try {
    const convState = useConversationStore.getState() as any;
    if (typeof convState.reset === 'function') {
      convState.reset();
      console.log('[clearAllUserStores] conversation store 已 reset');
    }
  } catch (e) {
    console.error('[clearAllUserStores] conversation store cleanup failed:', e);
  }

  // 2. 清理 agent store（对话/任务）— 使用 reset() 一次性清空
  try {
    const agentState = useAgentStore.getState() as any;
    if (typeof agentState.reset === 'function') {
      agentState.reset();
      console.log('[clearAllUserStores] agent store 已 reset');
    } else {
      // 兜底：旧版本没有 reset 方法时使用手动清理
      if (typeof agentState.disconnectWebSocket === 'function') {
        agentState.disconnectWebSocket();
      }
      if (typeof agentState.stopStreaming === 'function') {
        agentState.stopStreaming();
      }
      if (typeof agentState.clearCurrent === 'function') {
        agentState.clearCurrent();
      }
      if (typeof agentState.clearMessages === 'function') {
        agentState.clearMessages();
      }
      useAgentStore.setState({
        conversationId: null,
        conversationList: [],
        conversationListTotal: 0,
      });
    }
  } catch (e) {
    console.error('[clearAllUserStores] agent store cleanup failed:', e);
  }

  // 3. 清理 React Query 缓存（所有 useQuery 数据 + useMutation 状态）
  // 这是真正的"组件/数据缓存"！staleTime=5min 会跨账号残留
  try {
    const qc = getQueryClient();
    if (qc) {
      qc.clear();
      console.log('[clearAllUserStores] React Query 缓存已清空');
    }
  } catch (e) {
    console.error('[clearAllUserStores] React Query cleanup failed:', e);
  }

  // 4. 清理 UI store（打开的对话框）
  try {
    useUIStore.setState({
      publishDialogOpen: false,
      publishDialogContentId: null,
      topicDialogOpen: false,
    });
    if (typeof useUIStore.getState().clearToast === 'function') {
      useUIStore.getState().clearToast();
    }
  } catch (e) {
    console.error('[clearAllUserStores] UI store cleanup failed:', e);
  }

  // 5. 清理 localStorage 中所有用户数据
  try {
    STORE_KEYS_TO_CLEAR.forEach((key) => {
      localStorage.removeItem(key);
    });
    console.log('[clearAllUserStores] localStorage keys 已清空:', STORE_KEYS_TO_CLEAR);
  } catch (e) {
    console.error('[clearAllUserStores] localStorage cleanup failed:', e);
  }

  console.log('[clearAllUserStores] 清理完成');
  // 6. 最后清 auth 自己的状态（logout 会触发上面的调用方 chain）
  // 注意：如果是被 logout 调用，这里不要再次调用 logout 避免循环
}

export function clearAllIncludingAuth(): void {
  clearAllUserStores();
  useAuthStore.getState().logout();
}