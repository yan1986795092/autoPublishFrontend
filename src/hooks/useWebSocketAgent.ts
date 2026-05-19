import { useEffect, useRef } from 'react';
import { useAgentStore } from '../stores/useAgentStore';

interface UseWebSocketAgentOptions {
  /** 跳过连接（如 AgentStudioPage 用 SSE 时） */
  enabled?: boolean;
  /** 最大重试次数，默认 5 */
  maxRetries?: number;
  /** 收到消息时的回调（通过 ref 调用，不会触发重连） */
  onMessage?: (data: Record<string, unknown>) => void;
}

/**
 * 共享 WebSocket Agent Hook
 *
 * 抽取 AgentStudioPage 和 AgentPage 中重复的指数退避重连逻辑。
 * 特性：
 * - 指数退避重连（2^n，上限 30s）
 * - mounted guard 防止 unmount 后 setState
 * - onMessage 通过 ref 持有，不会因回调变化触发重连
 * - 自动清理
 */
export function useWebSocketAgent(taskId: string | null, options: UseWebSocketAgentOptions = {}) {
  const {
    enabled = true,
    maxRetries = 5,
    onMessage,
  } = options;

  // 用 ref 持有 onMessage，避免回调引用变化导致重连
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const connectWebSocket = useAgentStore((s) => s.connectWebSocket);
  const disconnectWebSocket = useAgentStore((s) => s.disconnectWebSocket);
  const isRunning = useAgentStore((s) => s.isRunning);

  useEffect(() => {
    if (!taskId || !isRunning || !enabled) return;

    let mounted = true;
    let retries = 0;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      ws = connectWebSocket(taskId);
      if (!ws) return;

      ws.onopen = () => { retries = 0; };

      ws.onclose = () => {
        if (!mounted) return;
        if (retries < maxRetries && useAgentStore.getState().isRunning) {
          const delay = Math.min(1000 * 2 ** retries, 30000);
          reconnectTimer = setTimeout(() => {
            retries++;
            connect();
          }, delay);
        }
      };

      ws.onerror = () => { ws?.close(); };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessageRef.current?.(data as Record<string, unknown>);
        } catch { /* ignore parse errors */ }
      };
    };

    connect();

    return () => {
      mounted = false;
      clearTimeout(reconnectTimer);
      disconnectWebSocket();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, isRunning, enabled, maxRetries, connectWebSocket, disconnectWebSocket]);
}
