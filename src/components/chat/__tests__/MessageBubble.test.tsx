import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { MessageBubble } from '../MessageBubble';
import type { Message } from '../../types/message';

// Silence ReactMarkdown / framer-motion console noise in tests
vi.mock('react-markdown', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('remark-gfm', () => ({ default: () => {} }));
vi.mock('framer-motion', () => ({
  motion: {
    div: 'div',
    span: 'span',
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

/** Helper to build a minimal Message with parts */
function makeMessage(overrides: Partial<Message>): Message {
  return {
    id: 'msg-1',
    role: 'assistant',
    status: 'completed',
    timestamp: Date.now(),
    content: '',
    parts: [],
    ...overrides,
  } as Message;
}

/** Helper to build a minimal text part */
function textPart(content: string, overrides: Partial<import('../../types/message').TextPart> = {}): import('../../types/message').TextPart {
  return {
    id: `text-${Math.random()}`,
    type: 'text',
    state: 'done',
    created_at: Date.now(),
    content,
    ...overrides,
  } as import('../../types/message').TextPart;
}

/** Helper to build a reasoning part */
function reasoningPart(
  content: string,
  overrides: Partial<import('../../types/message').ReasoningPart> = {},
): import('../../types/message').ReasoningPart {
  return {
    id: `reasoning-${Math.random()}`,
    type: 'reasoning',
    state: 'done',
    created_at: Date.now(),
    content,
    collapsed_by_default: true,
    ...overrides,
  } as import('../../types/message').ReasoningPart;
}

/** Helper to build a tool_call part */
function toolCallPart(
  toolName: string,
  displayName: string,
  icon: string,
  overrides: Partial<import('../../types/message').ToolCallPart> = {},
): import('../../types/message').ToolCallPart {
  return {
    id: `tool-${Math.random()}`,
    type: 'tool_call',
    state: 'done',
    created_at: Date.now(),
    tool_name: toolName,
    display_name: displayName,
    icon,
    input: {},
    ...overrides,
  } as import('../../types/message').ToolCallPart;
}

/** Helper to build an artifact part */
function artifactPart(
  body: string,
  overrides: Partial<import('../../types/message').ArtifactPart> = {},
): import('../../types/message').ArtifactPart {
  return {
    id: `artifact-${Math.random()}`,
    type: 'artifact',
    state: 'done',
    created_at: Date.now(),
    artifact_type: 'blog',
    body,
    ...overrides,
  } as import('../../types/message').ArtifactPart;
}

describe('MessageBubble snapshot tests', () => {
  it('snapshot 1: pure text message → renders text part', () => {
    const msg = makeMessage({
      id: 'text-only',
      parts: [
        textPart('Hello, this is a plain text response.'),
      ],
    });

    const { container } = render(<MessageBubble message={msg} />);
    expect(container).toMatchSnapshot();
  });

  it('snapshot 2: message with reasoning → renders reasoning part', () => {
    const msg = makeMessage({
      id: 'with-reasoning',
      parts: [
        reasoningPart('This is my thought process about the topic.', {
          agent: 'ManagerAgent',
          round: 0,
        }),
        textPart('And here is the final answer.'),
      ],
    });

    const { container } = render(<MessageBubble message={msg} />);
    expect(container).toMatchSnapshot();
  });

  it('snapshot 3: message with tool calls → renders ToolCallGroup', () => {
    const msg = makeMessage({
      id: 'with-tools',
      parts: [
        textPart('I will search for relevant information.'),
        toolCallPart('WebSearch', '搜索资料中', '🔍', {
          duration_ms: 2500,
          input: { query: 'AI 编程趋势', top_n: 5 },
        }),
        toolCallPart('WritingAgent', '创作初稿中', '✍️', {
          duration_ms: 8400,
          input: { topic: 'AI 编程' },
        }),
        artifactPart('The final generated content.', {
          title: 'AI 编程趋势',
          platform: 'xiaohongshu',
        }),
      ],
    });

    const { container } = render(<MessageBubble message={msg} />);
    expect(container).toMatchSnapshot();
  });

  it('snapshot 4: user message → renders user bubble', () => {
    const msg = makeMessage({
      id: 'user-msg',
      role: 'user',
      content: '请帮我写一篇关于 AI 的文章',
      parts: [],
    });

    const { container } = render(<MessageBubble message={msg} />);
    expect(container).toMatchSnapshot();
  });

  it('snapshot 5: empty assistant message → shows thinking placeholder', () => {
    const msg = makeMessage({
      id: 'empty-streaming',
      status: 'streaming',
      parts: [],
      content: '',
    });

    const { container } = render(<MessageBubble message={msg} />);
    expect(container).toMatchSnapshot();
  });

  it('snapshot 6: message with error part → renders ErrorPart', () => {
    const msg = makeMessage({
      id: 'error-msg',
      status: 'failed',
      parts: [
        {
          id: 'error-1',
          type: 'error' as const,
          state: 'done' as const,
          created_at: Date.now(),
          code: 'LLM_ERROR',
          message: '模型调用失败',
          details: 'Connection timeout after 30s',
          retry_supported: true,
        },
      ],
    });

    const { container } = render(<MessageBubble message={msg} />);
    expect(container).toMatchSnapshot();
  });

  it('snapshot 7: message with plan part → renders PlanPart', () => {
    const msg = makeMessage({
      id: 'plan-msg',
      parts: [
        {
          id: 'plan-1',
          type: 'plan' as const,
          state: 'done' as const,
          created_at: Date.now(),
          goal: 'Write a tech blog post',
          reasoning: 'Need to research and draft',
          tasks: [
            { id: 't1', agent_type: 'WebSearch', input: { query: 'AI trends' } },
            { id: 't2', agent_type: 'WritingAgent', input: { topic: 'AI trends' } },
          ],
        },
        artifactPart('Final content.'),
      ],
    });

    const { container } = render(<MessageBubble message={msg} />);
    expect(container).toMatchSnapshot();
  });

  it('renders tool calls AFTER text/artifact parts (not interleaved)', () => {
    const msg = makeMessage({
      id: 'tool-order',
      parts: [
        textPart('Introduction.'),
        toolCallPart('A', 'A tool', '🔧'),
        textPart('Middle.'),
        toolCallPart('B', 'B tool', '🔧'),
        artifactPart('Conclusion.'),
      ],
    });

    const { container } = render(<MessageBubble message={msg} />);
    // ToolCallGroup should be the last child in the assistant bubble
    const toolCallGroup = container.querySelectorAll('[class*="my-2"]');
    // The ToolCallGroup is rendered after all non-tool_call parts
    expect(container).toMatchSnapshot();
  });
});
