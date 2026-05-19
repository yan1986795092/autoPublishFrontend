export interface SSEEvent {
  type: string;
  data: Record<string, unknown>;
}

type SSEHandler = (event: SSEEvent) => void;

export class SSEProcessor {
  private handlers = new Map<string, SSEHandler[]>();
  private _abortController: AbortController | null = null;
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
    const eventMatch = block.match(/^event: (\w+)/m);
    const dataMatch = block.match(/^data: (.+)$/m);
    if (!eventMatch || !dataMatch) return events;

    try {
      events.push({
        type: eventMatch[1],
        data: JSON.parse(dataMatch[1]) as Record<string, unknown>,
      });
    } catch {
      // skip malformed data
    }

    return events;
  }

  async connect(
    url: string,
    options: RequestInit,
    callbacks?: {
      onHeartbeat?: () => void;
      onError?: (error: string) => void;
    }
  ): Promise<void> {
    this._abortController = new AbortController();

    try {
      const response = await fetch(url, {
        ...options,
        signal: this._abortController.signal,
      });

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

      // Heartbeat: abort if no data for 30s
      const HEARTBEAT_TIMEOUT = 30_000;
      let lastDataTime = Date.now();
      this._heartbeatTimer = setInterval(() => {
        if (Date.now() - lastDataTime > HEARTBEAT_TIMEOUT) {
          this.abort();
          callbacks?.onError?.('连接超时，服务器长时间无响应');
          this.cleanup();
        }
      }, 5000);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        lastDataTime = Date.now();
        callbacks?.onHeartbeat?.();

        // Split buffer into complete events (by double newline), keep remainder
        const parts = buffer.replace(/\r\n/g, '\n').split('\n\n');
        buffer = parts.pop() || '';

        for (const block of parts) {
          if (!block.trim()) continue;
          const events = this.parseSSE(block);
          for (const event of events) {
            this.dispatch(event);
          }
        }
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        return; // intentional abort
      }
      callbacks?.onError?.(String(e));
    } finally {
      this.cleanup();
    }
  }

  private dispatch(event: SSEEvent) {
    const handlers = this.handlers.get(event.type) || [];
    for (const handler of handlers) {
      handler(event);
    }
  }

  abort() {
    this._abortController?.abort();
  }

  private cleanup() {
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }
    this._abortController = null;
  }

  get isRunning() {
    return this._abortController !== null;
  }
}
