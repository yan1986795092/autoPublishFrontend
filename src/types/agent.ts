// ===================== Agent System Types =====================

/** 已知事件类型的 data payload shapes */
export interface PlanEventData {
  goal: string;
  reasoning: string;
  estimated_steps: number;
  tasks: Array<{ id: string; agent_type: string; input: Record<string, unknown>; dependencies: number[] }>;
}

export interface ThinkingStepEventData {
  step_number: number;
  agent: string;
  action: string;
  reasoning: string;
  input_summary: string;
  output_summary: string;
  tokens_used: number;
  time_elapsed: number;
  status: string;
  [key: string]: unknown;
}

export interface ProgressEventData {
  task_id?: string;
  progress: number;
  progress_message: string;
  current_step: string;
  completed_steps: number;
  total_steps: number;
}

export interface ResultEventData {
  status?: string;
  output?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ErrorEventData {
  message: string;
}

export interface LLMToolEventData {
  agent: string;
  content: string;
}

export interface DecisionRequiredData {
  task_id: string;
  decision_id: string;
  question: string;
  options: Array<{ value: string; label: string }>;
  context?: Record<string, unknown>;
}

export interface AgentTask {
  id: string;
  agent_type: string;
  input: Record<string, unknown>;
  dependencies: number[];
}

export interface ExecutionPlan {
  goal: string;
  reasoning: string;
  estimated_steps: number;
  tasks: AgentTask[];
}

export interface ThinkingStep {
  step_number: number;
  agent: string;
  action: string;
  reasoning: string;
  input_summary: string;
  output_summary: string;
  tokens_used: number;
  time_elapsed: number;
  status: 'running' | 'done' | 'failed';
  prompt_used?: string;
  response_used?: string;
  intermediate_output?: string; // P2.4: show partial results during execution
}

export interface AgentUsage {
  tokens_used: number;
  estimated_cost: number;
  time_elapsed: number;
  model: string;
}

export interface AgentResult {
  task_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'partial';
  agent_type: string;
  output: Record<string, unknown>;
  error?: string;
  usage: AgentUsage;
  thinking_trace: {
    task_id: string;
    total_elapsed: number;
    steps: ThinkingStep[];
  };
}

export interface AsyncTask {
  id: string;
  user_id: string;
  prompt: string;
  state: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'awaiting_input';
  progress: number;
  progress_message: string;
  current_step: string;
  total_steps: number;
  completed_steps: number;
  error?: string;
  created_at: string;
  completed_at?: string;
  result?: unknown;
  pending_decision?: PendingDecision;
}

export interface DecisionOption {
  value: string;
  label: string;
}

export interface PendingDecision {
  decision_id: string;
  task_id: string;
  question: string;
  options: DecisionOption[];
  context?: Record<string, unknown>;
}

export interface DecisionSubmitRequest {
  decision_id: string;
  choice: string;
  text?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  status?: 'sending' | 'running' | 'completed' | 'failed' | 'partial';
  result?: AgentResult;
  taskId?: string;
  plan?: ExecutionPlan;
}

// P2.6: Tool use event types
export interface StreamToolUse {
  name: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  tool_call_id: string;
}

// === Stream Event (for real-time agent thinking display) ===
export interface StreamEvent {
  id: string;
  type: 'user_message' | 'plan' | 'thinking_step' | 'progress' | 'decision_required' | 'result' | 'error' | 'done' | 'llm_chunk' | 'reasoning' | 'tool_use' | 'tool_result';
  timestamp: number;
  /** Event payload — always a flat Record. Use typed accessors below. */
  data: Record<string, unknown>;
  // thinking step 快捷字段
  agent?: string;
  agent_type?: string;
  action?: string;
  reasoning?: string;
  status?: string;
  output_summary?: string;
  // llm_chunk / reasoning 快捷字段
  content?: string;
}

/** Typed accessors — use these instead of casting data. */
export function asPlanEventData(data: Record<string, unknown>): PlanEventData {
  return data as unknown as PlanEventData;
}
export function asThinkingStepData(data: Record<string, unknown>): ThinkingStepEventData {
  return data as unknown as ThinkingStepEventData;
}
export function asProgressData(data: Record<string, unknown>): ProgressEventData {
  return data as unknown as ProgressEventData;
}
export function asResultData(data: Record<string, unknown>): ResultEventData {
  return data as unknown as ResultEventData;
}
export function asErrorData(data: Record<string, unknown>): ErrorEventData {
  return data as unknown as ErrorEventData;
}
export function asLLMToolData(data: Record<string, unknown>): LLMToolEventData {
  return data as unknown as LLMToolEventData;
}
export function asDecisionRequired(data: Record<string, unknown>): DecisionRequiredData {
  return data as unknown as DecisionRequiredData;
}

// LLM 流式 token（用于打字机效果）
export interface LLMChunk {
  agent: string;
  content: string;
  timestamp: number;
}

// Reasoning chain（LLM 思考过程）
export interface ReasoningChunk {
  agent: string;
  content: string;
  timestamp: number;
}

/** 一次完整的生成会话记录 */
export interface PreviousGeneration {
  id: string;
  prompt: string;
  result: AgentResult | null;
  events: StreamEvent[];
  timestamp: number;
  plan?: ExecutionPlan;
}

export type ContentType = 'blog' | 'social_post' | 'copywriting' | 'script' | 'newsletter' | 'report' | 'auto';
export type ContentStyle = '技术' | '种草' | '干货' | '幽默' | '深度' | '教程' | '';

/** 步骤执行失败后的恢复选项 */
export type RecoveryAction = 'retry' | 'skip' | 'cancel';

export interface RecoveryState {
  failedStepIndex: number;
  failedStep: ThinkingStep | null;
  retryCount: number;
  errorMessage: string;
  planSnapshot: ExecutionPlan | null;
}

/** 系统监控指标 from GET /agent/metrics */
export interface AgentMetrics {
  cache: {
    agent_cache: {
      entries: number;
      max_entries: number;
      hits: number;
      misses: number;
      hit_rate: number;
    };
    llm_cache: {
      size: number;
      max_size: number;
      hits: number;
      misses: number;
      hit_rate: number;
    };
  };
  tasks: {
    active: number;
    dlq_size: number;
  };
  worker: {
    running: boolean;
  };
  config: {
    debug: boolean;
    log_level: string;
    default_llm_provider: string;
    enable_reflection: boolean;
    enable_message_bus: boolean;
    enable_hitl: boolean;
    worker_max_retries: number;
  };
}
