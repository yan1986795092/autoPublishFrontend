import type { AgentEvent, AgentResult, ThinkingStep } from '../types/agent';

function toThinkingStep(event: AgentEvent, fallbackIndex: number): ThinkingStep | null {
  if (event.event_type !== 'thought') return null;
  return {
    step_number: event.step_index ?? fallbackIndex + 1,
    agent: event.agent_name || 'ManagerAgent',
    action: event.message || 'thought',
    reasoning: event.thought || '',
    input_summary: '',
    output_summary: event.tool_output || '',
    tokens_used: event.token_usage?.total_tokens || 0,
    time_elapsed: event.duration_ms ? event.duration_ms / 1000 : 0,
    status: 'done',
    prompt_used: undefined,
    response_used: undefined,
  };
}

export function getResultThinkingSteps(result?: AgentResult | null): ThinkingStep[] {
  const events = result?.agent_events?.events ?? [];
  return events
    .map((event, index) => toThinkingStep(event, index))
    .filter((step): step is ThinkingStep => step !== null);
}

export function getResultTotalElapsed(result?: AgentResult | null): number {
  const events = result?.agent_events?.events ?? [];
  const durationFromEvents = events.reduce((sum, event) => sum + ((event.duration_ms || 0) / 1000), 0);
  return durationFromEvents > 0 ? durationFromEvents : (result?.usage?.time_elapsed || 0);
}

export function getAgentEventSummary(result?: AgentResult | null): Array<{ label: string; value: string }> {
  const events = result?.agent_events?.events ?? [];
  const thoughtCount = events.filter((e) => e.event_type === 'thought').length;
  const toolCallCount = events.filter((e) => e.event_type === 'tool_call').length;
  const errorCount = events.filter((e) => e.event_type === 'error').length;
  return [
    { label: '事件', value: String(events.length) },
    { label: '思考', value: String(thoughtCount) },
    { label: '工具', value: String(toolCallCount) },
    { label: '错误', value: String(errorCount) },
  ];
}
