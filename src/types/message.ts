/**
 * Parts Model — Core type definitions
 * @see docs/superpowers/specs/2026-07-02-chat-parts-model.md §3.1
 */

export type PartState = 'streaming' | 'done' | 'error' | 'cancelled';

export type PartType =
  | 'text'
  | 'reasoning'
  | 'tool_call'
  | 'artifact'
  | 'plan'
  | 'error';

/** Part 基础字段 */
export interface PartBase {
  id: string;
  type: PartType;
  state: PartState;
  /** 服务端分配的 part 标识（用于重连时去重），可选 */
  server_id?: string;
  created_at: number;
  completed_at?: number;
}

/** 文本 part（body 流式） */
export interface TextPart extends PartBase {
  type: 'text';
  content: string;
  cursor?: boolean;
}

/** Reasoning part（决策推理，可折叠） */
export interface ReasoningPart extends PartBase {
  type: 'reasoning';
  content: string;
  /** Agent 来源（必填，Task 1 schema 对齐） */
  agent: string;
  collapsed_by_default: boolean;
  round?: number;
}

/** Tool call part（核心：取代 StageTimeline + substeps） */
export interface ToolCallPart extends PartBase {
  type: 'tool_call';
  tool_name: string;
  display_name: string;
  icon: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  duration_ms?: number;
  round?: number;
  error_message?: string;
}

/** Platform-specific structured data（封面/标签/metrics 等） */
export interface PlatformStructuredData {
  cover_image?: string;
  tags?: string[];
  metrics?: Record<string, unknown>;
  [key: string]: unknown;
}

/** 最终产物 part（取代 result.output） */
export interface ArtifactPart extends PartBase {
  type: 'artifact';
  artifact_type: 'blog' | 'code' | 'image' | 'tutorial' | 'social_post' | 'copywriting';
  body: string;
  title?: string;
  platform?: string;
  preview_text?: string;
  structured?: PlatformStructuredData;
}

/** 计划 part（执行规划） */
export interface PlanTask {
  id: string;
  agent_type: string;
  input: Record<string, unknown>;
}

export interface PlanPart extends PartBase {
  type: 'plan';
  goal: string;
  reasoning: string;
  tasks: PlanTask[];
}

/** 错误 part */
export interface ErrorPart extends PartBase {
  type: 'error';
  code?: string;
  message: string;
  details?: string;
  retry_supported: boolean;
}

export type MessagePart =
  | TextPart
  | ReasoningPart
  | ToolCallPart
  | ArtifactPart
  | PlanPart
  | ErrorPart;

// ===================== Type Guards =====================
// 对应后端 message_part_schema.py 的 from_dict() discriminator
// Task 1: 前后端 schema 统一，前端用 type guard 做运行时判别

export function isTextPart(p: MessagePart): p is TextPart {
  return p.type === 'text';
}
export function isReasoningPart(p: MessagePart): p is ReasoningPart {
  return p.type === 'reasoning';
}
export function isToolCallPart(p: MessagePart): p is ToolCallPart {
  return p.type === 'tool_call';
}
export function isArtifactPart(p: MessagePart): p is ArtifactPart {
  return p.type === 'artifact';
}
export function isPlanPart(p: MessagePart): p is PlanPart {
  return p.type === 'plan';
}
export function isErrorPart(p: MessagePart): p is ErrorPart {
  return p.type === 'error';
}

export type MessageRole = 'user' | 'assistant';

export type MessageStatus = 'sending' | 'streaming' | 'completed' | 'failed' | 'cancelled';

/** 消息主表（前端 store 用） */
export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  status: MessageStatus;
  /** 给 UI 的派生：parts 渲染出的"最终正文文本"（产物 + 工具摘要） */
  preview: string;
  /** User 消息正文 */
  user_content?: string;
  parts: MessagePart[];
  created_at: number;
  completed_at?: number;
  task_id?: string;
  /** 兼容字段：旧 result_json，新 UI 不再读 */
  legacy_result?: unknown;
}