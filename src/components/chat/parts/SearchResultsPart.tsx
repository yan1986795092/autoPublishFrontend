import React, { memo, useState } from 'react';
import { Search, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import type { PlatformStructuredData } from '../../types/message';

interface SearchResultItem {
  title: string;
  url: string;
  snippet?: string;
  [key: string]: unknown;
}

interface SearchResultsPartProps {
  searchData: NonNullable<PlatformStructuredData['search_results']>;
}

function SearchResultsPartInner({ searchData }: SearchResultsPartProps) {
  const [expanded, setExpanded] = useState(true);
  const { query, source, results, count } = searchData;

  if (!results || results.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 rounded-lg border border-app-border/50 bg-app-elevated overflow-hidden">
      {/* Header */}
      <div 
        className="flex items-center justify-between px-3 py-2 border-b border-app-border/30 cursor-pointer hover:bg-app-surface/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="text-xs font-medium text-app-text">
            搜索结果 · {count} 条
          </span>
          <span className="text-[10px] text-app-text-tertiary/70">
            来源: {source}
          </span>
        </div>
        <button className="p-1 hover:bg-app-border/20 rounded transition-colors">
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-app-text-tertiary" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-app-text-tertiary" />
          )}
        </button>
      </div>

      {/* Results List */}
      {expanded && (
        <div className="divide-y divide-app-border/20">
          {results.map((result, index) => (
            <SearchResultItem 
              key={`${result.url}-${index}`} 
              result={result} 
              index={index}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SearchResultItem({ result, index }: { result: SearchResultItem; index: number }) {
  const [expanded, setExpanded] = useState(index < 3);

  const handleClick = () => {
    if (result.url) {
      window.open(result.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="px-3 py-2 hover:bg-app-surface/30 transition-colors group">
      <div className="flex items-start gap-2">
        <span className="text-[10px] text-app-text-tertiary/50 w-4 pt-0.5 shrink-0">
          {index + 1}.
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <button 
              onClick={handleClick}
              className="text-sm font-medium text-blue-400 hover:text-blue-300 hover:underline text-left truncate transition-colors"
            >
              {result.title}
            </button>
            <ExternalLink className="w-3 h-3 text-app-text-tertiary/40 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </div>
          {result.snippet && (
            <p className="text-xs text-app-text-secondary mt-0.5 line-clamp-2">
              {result.snippet}
            </p>
          )}
          {result.url && (
            <p className="text-[10px] text-app-text-tertiary/60 mt-0.5 truncate">
              {result.url.replace(/^https?:\/\//, '').split('/')[0]}
            </p>
          )}
        </div>
        {result.snippet && (
          <button 
            onClick={() => setExpanded(!expanded)}
            className="p-1 hover:bg-app-border/20 rounded shrink-0"
          >
            {expanded ? (
              <ChevronUp className="w-3 h-3 text-app-text-tertiary" />
            ) : (
              <ChevronDown className="w-3 h-3 text-app-text-tertiary" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export const SearchResultsPart = memo(SearchResultsPartInner, (prev, next) => {
  return prev.searchData === next.searchData;
});

SearchResultsPart.displayName = 'SearchResultsPart';
