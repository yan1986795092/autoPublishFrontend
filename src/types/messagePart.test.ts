/**
 * MessagePart 类型守卫单测 — Task 1 Step 3
 *
 * 对应 docs/superpowers/plans/2026-07-13-message-parts-schema-driven-rendering.md §Task 1.
 * 与后端 backend/tests/test_message_part_schema.py 一一对应。
 */
import { describe, test, expect } from 'vitest';
import {
  isArtifactPart,
  isReasoningPart,
  isTextPart,
  isToolCallPart,
  isPlanPart,
  isErrorPart,
  type MessagePart,
  type ArtifactPart,
  type ReasoningPart,
} from './message';

describe('MessagePart type guards', () => {
  const artifact: MessagePart = {
    id: 'p1',
    type: 'artifact',
    state: 'done',
    artifact_type: 'blog',
    body: 'hello',
    created_at: Date.now(),
  };
  const reasoning: MessagePart = {
    id: 'p2',
    type: 'reasoning',
    state: 'done',
    content: 'thinking...',
    agent: 'ManagerAgent',
    collapsed_by_default: true,
    created_at: Date.now(),
  };
  const text: MessagePart = {
    id: 'p3',
    type: 'text',
    state: 'streaming',
    content: 'partial',
    created_at: Date.now(),
  };
  const tool: MessagePart = {
    id: 'p4',
    type: 'tool_call',
    state: 'done',
    tool_name: 'search',
    display_name: 'Search',
    icon: '🔍',
    input: {},
    created_at: Date.now(),
  };
  const plan: MessagePart = {
    id: 'p5',
    type: 'plan',
    state: 'done',
    goal: '写博客',
    reasoning: '因为用户要',
    tasks: [],
    created_at: Date.now(),
  };
  const error: MessagePart = {
    id: 'p6',
    type: 'error',
    state: 'error',
    message: 'fail',
    retry_supported: false,
    created_at: Date.now(),
  };

  test('isArtifactPart', () => {
    expect(isArtifactPart(artifact)).toBe(true);
    expect(isArtifactPart(reasoning)).toBe(false);
    expect(isArtifactPart(text)).toBe(false);
  });

  test('isReasoningPart', () => {
    expect(isReasoningPart(reasoning)).toBe(true);
    expect(isReasoningPart(artifact)).toBe(false);
    expect(isReasoningPart(tool)).toBe(false);
  });

  test('isTextPart', () => {
    expect(isTextPart(text)).toBe(true);
    expect(isTextPart(reasoning)).toBe(false);
  });

  test('isToolCallPart', () => {
    expect(isToolCallPart(tool)).toBe(true);
    expect(isToolCallPart(plan)).toBe(false);
  });

  test('isPlanPart', () => {
    expect(isPlanPart(plan)).toBe(true);
    expect(isPlanPart(tool)).toBe(false);
  });

  test('isErrorPart', () => {
    expect(isErrorPart(error)).toBe(true);
    expect(isErrorPart(artifact)).toBe(false);
  });

  test('ArtifactPart 必填字段', () => {
    const p: ArtifactPart = {
      id: 'p1',
      type: 'artifact',
      state: 'done',
      artifact_type: 'blog',
      body: 'hello',
      created_at: Date.now(),
    };
    expect(p.body).toBe('hello');
    expect(p.artifact_type).toBe('blog');
  });

  test('ReasoningPart.agent 必填（Task 1 schema 对齐）', () => {
    const p: ReasoningPart = {
      id: 'p1',
      type: 'reasoning',
      state: 'done',
      content: '...',
      agent: 'WritingAgent',
      collapsed_by_default: true,
      created_at: Date.now(),
    };
    expect(p.agent).toBe('WritingAgent');
  });

  test('ArtifactType 包含 copywriting（spec §3.1）', () => {
    const p: ArtifactPart = {
      id: 'p1',
      type: 'artifact',
      state: 'done',
      artifact_type: 'copywriting',
      body: '...',
      created_at: Date.now(),
    };
    expect(p.artifact_type).toBe('copywriting');
  });
});
