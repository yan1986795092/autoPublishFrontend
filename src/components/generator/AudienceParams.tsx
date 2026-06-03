import { useState, useCallback } from 'react';
import { useGeneratorStore } from '../../stores/useGeneratorStore';
import { OptionChip } from '../ui/option-chip';
import { X } from 'lucide-react';

const AUDIENCE_OPTIONS = [
  { value: 'beginner' as const, label: '入门' },
  { value: 'intermediate' as const, label: '进阶' },
  { value: 'expert' as const, label: '专家' },
] as const;

export function AudienceParams({ disabled }: { disabled?: boolean }) {
  const { draft, setParameters } = useGeneratorStore();
  const parameters = draft.parameters;
  const [keywordInput, setKeywordInput] = useState('');

  const keywords = (parameters.keywords || '').split(',').filter(Boolean) as string[];

  const addKeyword = useCallback((tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || keywords.includes(trimmed)) return;
    const next = [...keywords, trimmed].join(',');
    setParameters({ keywords: next });
    setKeywordInput('');
  }, [keywords, setParameters]);

  const removeKeyword = useCallback((tag: string) => {
    const next = keywords.filter((k: string) => k !== tag).join(',');
    setParameters({ keywords: next });
  }, [keywords, setParameters]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addKeyword(keywordInput);
    }
  };

  return (
    <div className="space-y-3">
      {/* Target Audience */}
      <div className="space-y-1">
        <span className="text-[9px] text-app-text-tertiary">目标受众</span>
        <OptionChip
          options={AUDIENCE_OPTIONS}
          value={parameters.target_audience || 'beginner'}
          onChange={(v) => setParameters({ target_audience: v })}
          disabled={disabled}
        />
      </div>

      {/* Keywords */}
      <div className="space-y-1">
        <span className="text-[9px] text-app-text-tertiary">关键词（Enter 添加）</span>
        <div className="flex flex-wrap gap-1 mb-1.5">
          {keywords.map((kw) => (
            <span
              key={kw}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-primary-600/15 border border-primary-500/30 text-[9px] text-primary-400"
            >
              {kw}
              <button
                onClick={() => removeKeyword(kw)}
                className="hover:text-primary-200 transition-colors"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
        <input
          value={keywordInput}
          onChange={(e) => setKeywordInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="输入关键词，回车添加..."
          className="w-full h-7 rounded-lg border border-app-border bg-app-surface px-2 text-[10px] text-app-text placeholder:text-app-text-tertiary outline-none focus:border-primary-500/50 transition-colors"
        />
      </div>
    </div>
  );
}
