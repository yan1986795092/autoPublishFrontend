/**
 * eventToPartOp — SSE event → PartOp converter
 *
 * Pure function: no side effects, no store/API dependencies.
 * Handles partial JSON parsing for tool_input_delta with fallback to raw string.
 *
 * Spec reference: §4.2 pseudo-code
 */

import type { MessagePart } from '../types/message';
import type { PartOp, StreamEventV3 } from '../types/partReducer';

// ---------------------------------------------------------------------------
// Partial JSON merge utility
// ---------------------------------------------------------------------------

/** Merge a JSON fragment string into a partial input object.
 *  Returns the merged object on success, or null on parse failure. */
function mergeDeltaJson(
  current: Record<string, unknown>,
  deltaJson: string
): Record<string, unknown> | null {
  try {
    const delta = JSON.parse(deltaJson);
    return { ...current, ...delta };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main converter
// ---------------------------------------------------------------------------

/**
 * Convert a StreamEventV3 SSE event into a PartOp for the given messageId.
 *
 * Returns `null` for `message_end` (handled by message-level reducer).
 *
 * Event → PartOp mapping (spec §4.2):
 * - `plan`             → append   PlanPart
 * - `stage:started`    → append   ToolCallPart (streaming)
 * - `stage:completed`  → state_transition → done/error
 * - `tool_input_delta` → update   tool_call.input (partial JSON merge)
 * - `tool_result`      → update   tool_call.state / output / duration_ms
 * - `reasoning_delta`  → append if no matching part, else update
 * - `text_delta`       → append if no matching part, else update
 * - `artifact`         → append   ArtifactPart
 * - `message_end`      → null     (close handled at message level)
 * - `error`            → append   ErrorPart
 *
 * NOTE: `currentParts` is used only by `text_delta` and `reasoning_delta`
 *       to distinguish first-chunk (append) from subsequent-chunk (update).
 *       The reducer is safe to call even when no change occurs — it always
 *       returns a new array reference.
 */
export function eventToPartOp(
  event: StreamEventV3,
  _messageId: string,
  currentParts?: MessagePart[],
): PartOp | null {
  const now = Date.now();

  switch (event.type) {
    case 'plan': {
      const e = event as Extract<StreamEventV3, { type: 'plan' }>;
      return {
        op: 'append',
        part: {
          id: crypto.randomUUID(),
          server_id: e.data.part_id,
          type: 'plan',
          state: 'done',
          created_at: now,
          goal: e.data.goal,
          reasoning: e.data.reasoning,
          tasks: e.data.tasks,
        } as MessagePart,
      };
    }

    case 'stage': {
      const e = event as Extract<StreamEventV3, { type: 'stage' }>;
      if (e.data.status !== 'started') {
        // completed → state_transition
        return {
          op: 'state_transition',
          id: e.data.part_id,
          state: e.data.error ? 'error' : 'done',
        };
      }
      return {
        op: 'append',
        part: {
          id: crypto.randomUUID(),
          server_id: e.data.part_id,
          type: 'tool_call',
          state: 'streaming',
          created_at: now,
          tool_name: e.data.agent,
          display_name: e.data.label,
          icon: e.data.icon,
          input: {},
          round: e.data.round,
        } as MessagePart,
      };
    }

    case 'tool_input_delta': {
      const e = event as Extract<StreamEventV3, { type: 'tool_input_delta' }>;
      const existing = currentParts?.find(
        (p) => p.id === e.data.part_id || p.server_id === e.data.part_id,
      );
      const targetId = existing ? existing.id : e.data.part_id;
      const merged = mergeDeltaJson({}, e.data.delta_json);
      return {
        op: 'update',
        id: targetId,
        patch: {
          input: merged ?? e.data.delta_json,
        },
      };
    }

    case 'tool_result': {
      const e = event as Extract<StreamEventV3, { type: 'tool_result' }>;
      const existing = currentParts?.find(
        (p) => p.id === e.data.part_id || p.server_id === e.data.part_id,
      );
      return {
        op: 'update',
        id: existing ? existing.id : e.data.part_id,
        patch: {
          state: e.data.error ? 'error' : 'done',
          output: e.data.output,
          duration_ms: e.data.duration_ms,
          error_message: e.data.error,
        },
      };
    }

    case 'reasoning_delta': {
      const e = event as Extract<StreamEventV3, { type: 'reasoning_delta' }>;
      // Append if this is the first chunk for this part_id, otherwise update.
      // Backend generates a new part_id per reasoning segment, so the first
      // chunk always gets an append. The check covers re-renders / out-of-order.
      const existing = currentParts?.find(
        (p) => p.id === e.data.part_id || p.server_id === e.data.part_id,
      );
      if (!existing) {
        return {
          op: 'append',
          part: {
            id: crypto.randomUUID(),
            server_id: e.data.part_id,
            type: 'reasoning',
            state: 'streaming',
            created_at: now,
            content: e.data.delta,
            collapsed_by_default: true,
            agent: e.data.agent,
            round: e.data.round,
          } as MessagePart,
        };
      }
      return {
        op: 'update',
        id: existing.id,
        patch: { content: e.data.delta },
      };
    }

    case 'text_delta': {
      const e = event as Extract<StreamEventV3, { type: 'text_delta' }>;
      // Append if this is the first chunk for this part_id, otherwise update.
      // Backend always uses "text_main" as part_id, so we rely on the append
      // path to create the part on the very first delta. Subsequent deltas
      // (after re-renders) fall through to update the existing part.
      const existing = currentParts?.find(
        (p) => p.id === e.data.part_id || p.server_id === e.data.part_id,
      );
      if (!existing) {
        return {
          op: 'append',
          part: {
            id: crypto.randomUUID(),
            server_id: e.data.part_id,
            type: 'text',
            state: 'streaming',
            created_at: now,
            content: e.data.delta,
          } as MessagePart,
        };
      }
      return {
        op: 'update',
        id: existing.id,
        patch: { content: e.data.delta },
      };
    }

    case 'artifact': {
      const e = event as Extract<StreamEventV3, { type: 'artifact' }>;
      return {
        op: 'append',
        part: {
          id: crypto.randomUUID(),
          server_id: e.data.part_id,
          type: 'artifact',
          state: 'done',
          created_at: now,
          artifact_type: e.data.artifact_type,
          body: e.data.body,
          title: e.data.title,
          platform: e.data.platform,
          structured: e.data.structured,
        } as MessagePart,
      };
    }

    case 'message_end':
      // Close is handled by message-level reducer
      return null;

    case 'error': {
      const e = event as Extract<StreamEventV3, { type: 'error' }>;
      return {
        op: 'append',
        part: {
          id: crypto.randomUUID(),
          type: 'error',
          state: 'done',
          created_at: now,
          code: e.data.code,
          message: e.data.message,
          details: e.data.details,
          retry_supported: Boolean(e.data.retry_supported),
        } as MessagePart,
      };
    }

    default:
      return null;
  }
}
