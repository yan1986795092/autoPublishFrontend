import type { AgentEvent, AgentResult, StreamEvent } from '../types';

function normalizeEventType(eventType: string): StreamEvent['type'] | null {
  switch (eventType) {
    case 'agent_start':
      return 'thinking_step';
    case 'thought':
      return 'thinking_step';
    case 'tool_call':
      return 'tool_use';
    case 'tool_result':
      return 'tool_result';
    case 'agent_finish':
      return 'result';
    case 'error':
      return 'error';
    default:
      return null;
  }
}

export function agentEventToStreamEvent(event: AgentEvent, index: number, result?: AgentResult | null): StreamEvent | null {
  const type = normalizeEventType(event.event_type);
  if (!type) return null;

  if (type === 'tool_use') {
    return {
      id: `${event.run_id || 'run'}-tool-${index}`,
      type,
      timestamp: Date.parse(event.timestamp || '') || Date.now(),
      data: {
        name: event.tool_name || 'unknown_tool',
        input: event.tool_input || {},
        tool_call_id: event.parent_span_id || `${event.run_id || 'run'}-${index}`,
      },
      agent: event.agent_name,
      agent_type: event.agent_name,
      content: event.message,
    };
  }

  if (type === 'tool_result') {
    return {
      id: `${event.run_id || 'run'}-tool-result-${index}`,
      type,
      timestamp: Date.parse(event.timestamp || '') || Date.now(),
      data: {
        name: event.tool_name || 'unknown_tool',
        input: {},
        output: { text: event.tool_output || '' },
        tool_call_id: event.parent_span_id || `${event.run_id || 'run'}-${index}`,
      },
      agent: event.agent_name,
      agent_type: event.agent_name,
      content: event.tool_output,
    };
  }

  if (type === 'result') {
    return {
      id: `${event.run_id || 'run'}-result-${index}`,
      type,
      timestamp: Date.parse(event.timestamp || '') || Date.now(),
      data: result ? (result as unknown as Record<string, unknown>) : {
        status: 'completed',
        output: { content: event.message },
      },
      agent: event.agent_name,
      agent_type: event.agent_name,
      content: event.message,
      status: 'completed',
    };
  }

  if (type === 'error') {
    return {
      id: `${event.run_id || 'run'}-error-${index}`,
      type,
      timestamp: Date.parse(event.timestamp || '') || Date.now(),
      data: {
        message: event.error_message || event.message || '未知错误',
      },
      agent: event.agent_name,
      agent_type: event.agent_name,
      content: event.error_message || event.message,
      status: 'failed',
    };
  }

  const isStart = event.event_type === 'agent_start';
  const isThought = event.event_type === 'thought';
  return {
    id: `${event.run_id || 'run'}-${event.event_type}-${index}`,
    type,
    timestamp: Date.parse(event.timestamp || '') || Date.now(),
    data: {
      step_number: event.step_index || index + 1,
      agent: event.agent_name,
      action: isStart ? '开始执行' : (event.message || event.event_type),
      reasoning: event.thought || event.message || '',
      input_summary: isStart ? String(event.tool_output || '') : '',
      output_summary: event.tool_output || '',
      tokens_used: event.token_usage?.total_tokens || 0,
      time_elapsed: event.duration_ms ? event.duration_ms / 1000 : 0,
      status: isStart ? 'running' : (isThought ? 'done' : 'running'),
    },
    agent: event.agent_name,
    agent_type: event.agent_name,
    action: isStart ? '开始执行' : event.message,
    reasoning: event.thought || event.message,
    status: isStart ? 'running' : (isThought ? 'done' : 'running'),
    output_summary: event.tool_output,
    content: event.message,
  };
}

export function resultToTimelineEvents(result?: AgentResult | null): StreamEvent[] {
  const events = result?.agent_events?.events ?? [];
  return events
    .map((event, index) => agentEventToStreamEvent(event, index, result))
    .filter((event): event is StreamEvent => event !== null);
}
