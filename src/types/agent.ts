// ===================== Agent System Types =====================

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

// === Stream Event (for real-time agent thinking display) ===
export interface StreamEvent {
  id: string;
  type: 'user_message' | 'plan' | 'thinking_step' | 'progress' | 'decision_required' | 'result' | 'error' | 'done' | 'llm_chunk' | 'reasoning';
  timestamp: number;
  data: any;
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

export type ContentType = 'blog' | 'social_post' | 'copywriting' | 'script' | 'newsletter' | 'report' | 'auto';
export type ContentStyle = '技术' | '种草' | '干货' | '幽默' | '深度' | '教程' | '';
