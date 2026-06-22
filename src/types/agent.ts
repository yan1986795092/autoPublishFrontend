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

export interface AgentEventTokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
}

export interface AgentEvent {
  timestamp?: string;
  session_id?: string;
  run_id?: string;
  step_index: number;
  parent_span_id?: string;
  agent_name: string;
  event_type: string;
  level: string;
  message: string;
  thought?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_output?: string;
  duration_ms?: number;
  token_usage?: AgentEventTokenUsage;
  error_type?: string;
  error_message?: string;
  llm_model?: string;
  llm_provider?: string;
  trace_id?: string;
}

export interface AgentResult {
  task_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'partial';
  agent_type: string;
  output: Record<string, unknown>;
  error?: string;
  usage: AgentUsage;
  agent_events?: {
    events: AgentEvent[];
  };
}

export interface AsyncTask {
  id: string;
  user_id: string;
  prompt: string;
  state: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  progress_message: string;
  current_step: string;
  total_steps: number;
  completed_steps: number;
  error?: string;
  created_at: string;
  completed_at?: string;
  result?: unknown;
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
  /** 标记为纯对话回复（非生成结果），渲染时不显示 stages */
  isConversationReply?: boolean;
}

/** 对话 LLM 触发生成的指令 */
export interface ConversationTrigger {
  action: 'create' | 'revise' | 'expand';
  topic?: string;
  platform?: string;
  style?: string;
  length?: string;
  tone?: string;
  audience?: string;
  keywords?: string[];
  revision_focus?: string;
  /** 完整的 prompt，可直接传给 runStreaming */
  _prompt?: string;
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
  type: 'user_message' | 'plan' | 'thinking_step' | 'progress' | 'result' | 'error' | 'done'
    | 'llm_chunk' | 'reasoning' | 'tool_use' | 'tool_result' | 'stage';
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

// === Stage event types (dynamic, from backend agent dispatch) ===

export interface StageInfo {
  agent: string;         // "WritingAgent"
  label: string;         // "创作初稿中"
  icon: string;          // "✍️"
  status: 'running' | 'completed' | 'failed';
  duration?: number;
  reasoning?: string;    // accumulated reasoning content for this stage
  substeps?: ThinkingStepEventData[];
  conflicts?: IntentConflict[];
  reviewRound?: number;  // review-fix 循环的轮次（>0 表示是第几轮复审/再润色）
}

export interface IntentConflict {
  type: string;
  message: string;
  suggestion: string;
}

// Agent → Stage mapping (frontend side, synced with backend STAGE_MAP)
export const AGENT_STAGE_MAP: Record<string, { label: string; icon: string }> = {
  ManagerAgent:  { label: '思考分析中', icon: '🧠' },
  PlanningAgent: { label: '任务规划中', icon: '📋' },
  WebSearch:     { label: '搜索资料中', icon: '🔍' },
  URLCrawler:    { label: '搜索资料中', icon: '🔍' },
  WritingAgent:  { label: '创作初稿中', icon: '✍️' },
  ReviewAgent:   { label: '评审优化中', icon: '📋' },
  FixAgent:      { label: '润色优化中', icon: '✨' },
  CodeAgent:     { label: '代码生成中', icon: '💻' },
  DiagramAgent:  { label: '图表生成中', icon: '📊' },
};

export type ContentType = 'blog' | 'social_post' | 'copywriting' | 'script' | 'newsletter' | 'report' | 'auto';
export type ContentStyle = '技术' | '种草' | '干货' | '幽默' | '深度' | '教程' | '';

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
    mcp_enabled: boolean;
    llm_gateway_url?: string;
    providers?: Record<string, boolean>;
  };
  /** Agent 运行统计（当前进程实时） */
  agent_runs: {
    total: number;
    success: number;
    failed: number;
    timeout: number;
    success_rate: number;
    p95_duration_ms: number;
  };
  /** LLM 调用统计（当前进程实时 + 模型/供应商细分） */
  llm_calls: {
    total: number;
    errors: number;
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    p95_duration_ms: number;
    /** 按模型细分 */
    by_model?: Record<string, {
      calls: number;
      errors: number;
      prompt_tokens: number;
      completion_tokens: number;
    }>;
    /** 按供应商细分 */
    by_provider?: Record<string, {
      calls: number;
      errors: number;
      tokens: number;
    }>;
  };
  /** 工具调用统计 */
  tool_calls: Record<string, {
    total: number;
    errors: number;
  }>;
  /** DB 持久化历史累计 */
  history?: {
    agent_runs_total: number;
    llm_tokens_total: number;
    llm_cost_total: number;
    by_model?: Array<{ name: string; calls: number; tokens: number }>;
    by_provider?: Array<{ name: string; calls: number; tokens: number }>;
    agents: Array<{
      name: string;
      calls: number;
      tokens: number;
      avg_time_s: number;
    }>;
  };
}
