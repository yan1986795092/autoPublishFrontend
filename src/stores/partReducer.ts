/**
 * PartReducer — Immutable parts array reducer
 *
 * Implements the 4 atomic PartOps defined in spec §4.2.
 * Pure function: no side effects, no React dependencies.
 */

import type { MessagePart } from '../types/message';
import type { PartOp } from '../types/partReducer';

/**
 * Apply a single PartOp to a parts array, returning a new array (immutable).
 *
 * - `append`   — push a new part to the end
 * - `update`  — shallow-merge `patch` into the part with matching id
 * - `state_transition` — set state + fill `completed_at` on matching id
 * - `close`   — transition only `streaming` parts to `done` (no-op on others)
 */
export function reduceParts(parts: MessagePart[], op: PartOp): MessagePart[] {
  switch (op.op) {
    case 'append':
      return [...parts, op.part];

    case 'update':
      return parts.map(p =>
        p.id === op.id ? ({ ...p, ...op.patch } as MessagePart) : p
      );

    case 'state_transition':
      return parts.map(p =>
        p.id === op.id
          ? ({ ...p, state: op.state, completed_at: Date.now() } as MessagePart)
          : p
      );

    case 'close':
      return parts.map(p =>
        p.id === op.id && p.state === 'streaming'
          ? ({ ...p, state: 'done', completed_at: Date.now() } as MessagePart)
          : p
      );

    default:
      return parts;
  }
}
