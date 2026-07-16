import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Sparkles } from 'lucide-react';
import type { ArtifactPart } from './types';
import { SearchResultsPart } from './SearchResultsPart';

interface ArtifactPartProps {
  part: ArtifactPart;
}

function ArtifactPartInner({ part }: ArtifactPartProps) {
  const hasSearchResults = part.structured?.search_results?.results?.length > 0;

  return (
    <div className="mt-3 rounded-lg border border-app-border/50 bg-app-elevated overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-app-border/30">
        <Sparkles className="w-3.5 h-3.5 text-primary-400 shrink-0" />
        <span className="text-xs font-medium text-app-text">
          {part.title || '生成结果'}
        </span>
        {part.artifact_type && (
          <span className="text-[10px] text-app-text-tertiary/70">
            · {part.artifact_type}
          </span>
        )}
      </div>

      {/* Body — markdown rendered */}
      {part.body && (
        <div className="px-3 py-2 text-sm text-app-text whitespace-pre-wrap leading-relaxed max-h-[60vh] overflow-y-auto">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {part.body}
          </ReactMarkdown>
        </div>
      )}

      {/* Search Results — formatted display */}
      {hasSearchResults && (
        <SearchResultsPart searchData={part.structured!.search_results!} />
      )}
    </div>
  );
}

export const ArtifactPart = memo(ArtifactPartInner, (prev, next) => {
  return (
    prev.part.id === next.part.id &&
    prev.part.body === next.part.body &&
    prev.part.title === next.part.title &&
    prev.part.state === next.part.state &&
    prev.part.artifact_type === next.part.artifact_type &&
    prev.part.platform === next.part.platform &&
    JSON.stringify(prev.part.structured) === JSON.stringify(next.part.structured)
  );
});

ArtifactPart.displayName = 'ArtifactPart';
