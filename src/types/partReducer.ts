/**
 * Part Reducer — Operational types
 *
 * TODO(Phase 0.1): Replace PartOp/StreamEventV3 with full type definitions from spec §3.3/§4.2
 */

import type { MessagePart, PartState } from './message';

// ---------------------------------------------------------------------------
// PartOp — the four atomic operations on a parts array
// ---------------------------------------------------------------------------

export type PartOp =
  | { op: 'append'; part: MessagePart }
  | { op: 'update'; id: string; patch: Partial<MessagePart> }
  | { op: 'state_transition'; id: string; state: PartState }
  | { op: 'close'; id: string };

// ---------------------------------------------------------------------------
// StreamEventV3 — SSE v3 business-track event types
// ---------------------------------------------------------------------------

export type SSEEventType =
  | 'message_start'
  | 'plan'
  | 'stage'
  | 'tool_input_delta'
  | 'tool_result'
  | 'agent_event'   // [修复] WritingAgent 等中间产物日志
  | 'reasoning_delta'
  | 'text_delta'
  | 'artifact'
  | 'message_end'
  | 'error';

export type StreamEventV3 =
  | { type: 'message_start'; data: { message_id: string; role: string } }
  | { type: 'plan'; data: { part_id: string; goal: string; reasoning: string; tasks: Array<{ id: string; agent_type: string; input: Record<string, unknown> }> } }
  | { type: 'stage'; data: { part_id: string; agent: string; label: string; icon: string; status: 'started' | 'completed'; duration_ms?: number; round?: number; _reasoning?: string; error?: string } }
  | { type: 'tool_input_delta'; data: { part_id: string; delta_json: string } }
  | { type: 'tool_result'; data: { part_id: string; output?: Record<string, unknown>; duration_ms?: number; error?: string } }
  | { type: 'agent_event'; data: { part_id: string; agent: string; content: string } }  // [修复] 中间产物日志
  | { type: 'reasoning_delta'; data: { part_id: string; agent: string; round?: number; delta: string } }
  | { type: 'text_delta'; data: { part_id: string; delta: string } }
  | { type: 'artifact'; data: { part_id: string; artifact_type: 'blog' | 'code' | 'image' | 'tutorial' | 'social_post'; body: string; title?: string; tags?: string[]; platform?: string; structured?: Record<string, unknown> } }
  | { type: 'message_end'; data: { message_id: string; status: string; usage?: Record<string, unknown> } }
  | { type: 'error'; data: { code: string; message: string; details?: string; part_id?: string; retry_supported?: boolean } };
