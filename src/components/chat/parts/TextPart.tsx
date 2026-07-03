import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion } from 'framer-motion';
import type { TextPart as TextPartType } from './types';

interface TextPartProps {
  part: TextPartType;
  isStreaming?: boolean;
}

function TextPartInner({ part, isStreaming }: TextPartProps) {
  const isDone = part.state === 'done' || part.state === 'error' || part.state === 'cancelled';

  return (
    <div className="text-sm text-app-text whitespace-pre-wrap leading-relaxed">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {part.content}
      </ReactMarkdown>
      {isStreaming && !isDone && (
        <motion.span
          key="cursor"
          className="inline-block w-2 h-4 bg-primary-400 ml-0.5 align-middle"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </div>
  );
}

export const TextPart = memo(TextPartInner, (prev, next) => {
  return (
    prev.part.id === next.part.id &&
    prev.part.content === next.part.content &&
    prev.part.state === next.part.state &&
    prev.isStreaming === next.isStreaming
  );
});

TextPart.displayName = 'TextPart';
