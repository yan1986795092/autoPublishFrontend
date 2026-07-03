/**
 * Migration Shim — Legacy result_json → Parts
 *
 * Converts old result_json blobs into MessagePart[] for backward compatibility.
 * This shim is used when reading historical messages that still use the old
 * result_json format. It does NOT modify the original data.
 *
 * Reference: spec §6.1 "旧数据兼容"
 */
import type { MessagePart } from '../types/message';
import type { PlatformStructuredData } from '../components/chat/parts/types';

/** Legacy result_json structure as stored in the database */
export interface LegacyResult {
  _stages?: Array<{
    agent: string;
    label: string;
    icon: string;
    duration?: number;
    reviewRound?: number;
    reasoning?: string;
    substeps?: unknown[];
  }>;
  _thinkingSteps?: Array<{
    agent?: string;
    _review_round?: number;
    reasoning?: string;
  }>;
  _reasoningChunks?: Record<
    string,
    Array<{ content: string; agent: string; review_round?: number }>
  >;
  _llmChunks?: Record<string, Array<{ content: string }>>;
  _draftContent?: string;
  output?: {
    full_text?: string;
    content?: string;
    title?: string;
    platform?: string;
    structured?: PlatformStructuredData;
    review_content?: string;
  };
  /** Legacy plan field (pre-parts era) */
  plan_json?: {
    goal: string;
    reasoning: string;
    tasks: Array<{
      id: string;
      agent_type: string;
      input: Record<string, unknown>;
    }>;
  };
}

/** Infer artifact_type from output content */
function inferArtifactType(output: LegacyResult['output']): MessagePart['type'] extends infer T ? T extends 'artifact' ? Extract<MessagePart, { type: 'artifact' }>['artifact_type'] : never : never {
  const body = output?.full_text || output?.content || '';
  const platform = output?.platform?.toLowerCase() ?? '';

  if (platform.includes('xiaohongshu') || platform.includes('小红书')) return 'social_post';
  if (platform.includes('douyin') || platform.includes('抖音')) return 'social_post';
  if (platform.includes('weibo') || platform.includes('微博')) return 'social_post';
  if (platform.includes('bilibili') || platform.includes('b站')) return 'tutorial';
  if (body.includes('```')) return 'code';
  return 'blog';
}

type ArtifactType = 'blog' | 'code' | 'image' | 'tutorial' | 'social_post';

/** Generate a stable-ish client-side id for migrated parts */
function generatePartId(prefix: string, index: number): string {
  // Use a deterministic prefix so same data always produces same id (good for tests)
  return `migrated-${prefix}-${index}`;
}

/**
 * Convert a legacy result_json blob into a parts array.
 *
 * Strategy (per spec §6.1):
 * 1. Extract reasoning parts from _reasoningChunks
 * 2. Extract tool_call parts from _stages
 * 3. Extract artifact part from output
 * 4. Extract plan part from plan_json (if present)
 */
export function migrateLegacyResultToParts(legacy: LegacyResult): MessagePart[] {
  const parts: MessagePart[] = [];
  const now = Date.now();

  // ── 1. Reasoning parts from _reasoningChunks ──────────────────────────────
  const reasoningChunks = legacy._reasoningChunks ?? {};
  for (const [key, chunks] of Object.entries(reasoningChunks)) {
    const content = (chunks ?? [])
      .map((c) => c.content ?? '')
      .join('');
    if (!content) continue;

    const segments = key.split('|');
    const agent = segments[0] ?? undefined;
    const round = segments[1] != null ? parseInt(segments[1], 10) : undefined;

    const reasoningPart: MessagePart = {
      id: generatePartId('reasoning', parts.length),
      type: 'reasoning',
      state: 'done',
      created_at: now,
      completed_at: now,
      content,
      collapsed_by_default: true,
      agent,
      round,
    };
    parts.push(reasoningPart);
  }

  // ── 2. Tool call parts from _stages ───────────────────────────────────────
  const stages = legacy._stages ?? [];
  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    const toolCallPart: MessagePart = {
      id: generatePartId('tool-call', parts.length),
      type: 'tool_call',
      state: 'done',
      created_at: now,
      completed_at: now,
      tool_name: stage.agent ?? 'UnknownAgent',
      display_name: stage.label ?? stage.agent ?? '执行中',
      icon: stage.icon ?? '⚙️',
      input: {},
      output: {},
      duration_ms: stage.duration != null ? Math.round(stage.duration * 1000) : undefined,
      round: stage.reviewRound ?? undefined,
    };
    parts.push(toolCallPart);
  }

  // ── 3. Artifact part from output ──────────────────────────────────────────
  const output = legacy.output;
  if (output) {
    const body = output.full_text ?? output.content ?? '';
    const artifactType: ArtifactType = inferArtifactType(output) as ArtifactType;

    const artifactPart: MessagePart = {
      id: generatePartId('artifact', parts.length),
      type: 'artifact',
      state: 'done',
      created_at: now,
      completed_at: now,
      artifact_type: artifactType,
      body,
      title: output.title,
      platform: output.platform,
      structured: output.structured,
    };
    parts.push(artifactPart);
  }

  // ── 4. Plan part from plan_json (legacy field) ───────────────────────────
  const planJson = legacy.plan_json;
  if (planJson) {
    const planPart: MessagePart = {
      id: generatePartId('plan', parts.length),
      type: 'plan',
      state: 'done',
      created_at: now,
      completed_at: now,
      goal: planJson.goal ?? '',
      reasoning: planJson.reasoning ?? '',
      tasks: (planJson.tasks ?? []).map((t) => ({
        id: t.id,
        agent_type: t.agent_type,
        input: t.input ?? {},
      })),
    };
    parts.push(planPart);
  }

  return parts;
}
