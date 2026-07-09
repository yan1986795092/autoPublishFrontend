export interface SSEEvent {
  type: string;
  data: Record<string, unknown>;
}

type SSEHandler = (event: SSEEvent) => void;

export class SSEProcessor {
  private handlers = new Map<string, SSEHandler[]>();
  private _heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  on(eventType: string, handler: SSEHandler) {
    const existing = this.handlers.get(eventType) || [];
    existing.push(handler);
    this.handlers.set(eventType, existing);
  }

  off(eventType: string) {
    this.handlers.delete(eventType);
  }

  /** Parse a single SSE block into events */
  parseSSE(block: string): SSEEvent[] {
    const events: SSEEvent[] = [];
    const lines = block.split('\n');
    let eventType = '';
    const dataLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith('event:')) {
        // New event type starts — emit the previous event if valid
        if (eventType && dataLines.length > 0) {
          const rawData = dataLines.join('\n');
          try {
            const parsed = JSON.parse(rawData);
            console.log('[DEBUG SSE parseSSE]', eventType, 'parsed OK', Object.keys(parsed));
            events.push({
              type: eventType,
              data: parsed as Record<string, unknown>,
            });
          } catch (e) {
            console.log('[DEBUG SSE parseSSE]', eventType, 'PARSE ERROR', rawData.slice(0, 100));
          }
        }
        eventType = line.slice(line.indexOf(':') + 1).trim();
        dataLines.length = 0;
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(line.indexOf(':') + 1));
      }
    }

    // Emit the last event in the block
    if (eventType && dataLines.length > 0) {
      const rawData = dataLines.join('\n');
      try {
        const parsed = JSON.parse(rawData);
        console.log('[DEBUG SSE parseSSE LAST]', eventType, Object.keys(parsed));
        events.push({
          type: eventType,
          data: parsed as Record<string, unknown>,
        });
      } catch (e) {
        console.log('[DEBUG SSE parseSSE LAST]', eventType, 'PARSE ERROR', rawData.slice(0, 100));
      }
    }

    return events;
  }

  async connect(
    url: string,
    options: RequestInit,
    callbacks?: {
      onHeartbeat?: () => void;
      onError?: (error: string) => void;
    },
    externalSignal?: AbortSignal,
    connectTimeoutMs: number = 45_000,
  ): Promise<void> {
    const controller = new AbortController();
    let externalAbortHandler: (() => void) | null = null;

    // Proxy external abort → internal controller, so either signal stops the stream
    if (externalSignal) {
      externalAbortHandler = () => { if (!controller.signal.aborted) controller.abort(); };
      externalSignal.addEventListener('abort', externalAbortHandler);
      if (externalSignal.aborted) controller.abort();
    }

    // Connection timeout: abort if fetch doesn't get a response within the timeout
    const connectTimer = setTimeout(() => {
      if (!controller.signal.aborted) {
        controller.abort();
        callbacks?.onError?.(`连接超时（超过 ${connectTimeoutMs / 1000}s 未收到响应）`);
      }
    }, connectTimeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(connectTimer);

      if (!response.ok) {
        let errorMsg = `请求失败 (${response.status})`;
        try {
          const errBody = await response.text();
          const parsed = JSON.parse(errBody);
          errorMsg = parsed.detail || errorMsg;
        } catch { /* ignore */ }
        callbacks?.onError?.(errorMsg);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      // Heartbeat: abort if no data for 90s
      // P23: 长 body 流（5000 字文章单段生成）或多个 agent 切换的间隙都可能
      //      超过 30s 没新数据；调高到 90s 避免误杀，但 heartbeat 检查间隔仍保持 5s。
      const HEARTBEAT_TIMEOUT = 90_000;
      let lastDataTime = Date.now();
      this._heartbeatTimer = setInterval(() => {
        if (controller.signal.aborted) return;
        if (Date.now() - lastDataTime > HEARTBEAT_TIMEOUT) {
          controller.abort();
          callbacks?.onError?.('连接超时，服务器长时间无响应');
          this.cleanup();
        }
      }, 5000);

      while (true) {
        if (controller.signal.aborted) break;
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        lastDataTime = Date.now();
        callbacks?.onHeartbeat?.();

        // 按 SSE 规范切分事件块：事件由空行（连续换行）分隔。
        // 块内首字符必须是合法的 SSE 字段（event:/data:/id:/retry:），否则丢弃。
        // 保留 buffer 末尾未结束的部分。
        const normalized = buffer.replace(/\r\n/g, '\n');
        const parts = normalized.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          const trimmed = part.trim();
          if (!trimmed) continue;
          // 仅当块以合法 SSE 字段开头时才解析，避免误把内嵌 \n\n 字符串当作事件边界
          if (!/^(event|data|id|retry):/m.test(trimmed)) continue;
          const events = this.parseSSE(part);
          for (const event of events) {
            this.dispatch(event);
          }
        }
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        // intentional abort — cleanup is handled below
      } else {
        callbacks?.onError?.(String(e));
      }
    } finally {
      clearTimeout(connectTimer);
      // Remove the externalSignal listener we registered, so it can be GC'd.
      if (externalSignal && externalAbortHandler) {
        externalSignal.removeEventListener('abort', externalAbortHandler);
      }
      this.cleanup();
    }
  }

  private dispatch(event: SSEEvent) {
    // 全量日志：任何 SSE 事件都不漏，帮助定位 stage/reasoning_delta 是否到达前端
    if (event.type !== 'heartbeat') {
      console.log('[DEBUG SSE dispatch]', event.type, event.data);
    }
    const handlers = this.handlers.get(event.type) || [];
    for (const handler of handlers) {
      handler(event);
    }
  }

  private cleanup() {
    if (this._heartbeatTimer !== null) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }
  }

  abort() {
    this.cleanup();
  }

  /** Returns true if there's an active fetch running */
  get isRunning() {
    return this._heartbeatTimer !== null;
  }
}
