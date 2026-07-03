/**
 * Re-exports from canonical types/message.ts (spec §3.1).
 * Parts components import from here to avoid coupling to absolute paths.
 */
export type {
  PartBase,
  PartType,
  PartState,
  TextPart,
  ReasoningPart,
  ToolCallPart,
  PlatformStructuredData,
  ArtifactPart,
  PlanTask,
  PlanPart,
  ErrorPart,
  MessagePart,
  MessageRole,
  MessageStatus,
  Message,
} from '../../types/message';