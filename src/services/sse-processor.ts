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
    let dataLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        eventType = line.slice(7).trim();
      } else if (line.startsWith('data: ')) {
        dataLines.push(line.slice(6));
      }
    }

    if (!eventType || dataLines.length === 0) return events;

    const rawData = dataLines.join('\n');
    try {
      events.push({
        type: eventType,
        data: JSON.parse(rawData) as Record<string, unknown>,
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
    },
    externalSignal?: AbortSignal,
  ): Promise<void> {
    const controller = new AbortController();

    // Proxy external abort → internal controller, so either signal stops the stream
    if (externalSignal) {
      const h = () => { if (!controller.signal.aborted) controller.abort(); };
      externalSignal.addEventListener('abort', h);
      if (externalSignal.aborted) controller.abort();
    }

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
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

        // Split buffer into complete events (by double newline), keep remainder
        const parts = buffer.replace(/\r\n/g, '\n').split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          if (!part.trim()) continue;
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
      this.cleanup();
    }
  }

  private dispatch(event: SSEEvent) {
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
