import { useGeneratorStore } from '../../stores/useGeneratorStore';
import { cn } from '../../utils/helpers';
import type { GenerateParams } from '../../types';

const LANGUAGE_OPTIONS: Array<{ value: GenerateParams['language_style']; label: string }> = [
  { value: 'formal', label: '正式' },
  { value: 'neutral', label: '中性' },
  { value: 'casual', label: '随意' },
];

const CTA_OPTIONS: Array<{ value: GenerateParams['call_to_action']; label: string }> = [
  { value: 'ask-follow', label: '引导关注' },
  { value: 'ask-share', label: '引导分享' },
  { value: 'ask-save', label: '引导收藏' },
  { value: 'none', label: '无' },
];

export function AdvancedParams({ disabled }: { disabled?: boolean }) {
  const { parameters, setParameters } = useGeneratorStore();

  return (
    <div className="space-y-3">
      {/* Language Style */}
      <div className="space-y-1">
        <span className="text-[9px] text-app-text-tertiary">语言风格</span>
        <div className="flex gap-1">
          {LANGUAGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setParameters({ language_style: opt.value })}
              disabled={disabled}
              className={cn(
                'flex-1 py-1.5 rounded-lg border text-[10px] font-medium transition-all',
                (parameters.language_style || 'neutral') === opt.value
                  ? 'border-primary-500/50 bg-primary-600/15 text-primary-400'
                  : 'border-app-border bg-app-surface text-app-text-tertiary hover:text-app-text-secondary'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Call to Action */}
      <div className="space-y-1">
        <span className="text-[9px] text-app-text-tertiary">结尾引导</span>
        <div className="flex gap-1">
          {CTA_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setParameters({ call_to_action: opt.value })}
              disabled={disabled}
              className={cn(
                'flex-1 py-1.5 rounded-lg border text-[10px] font-medium transition-all',
                (parameters.call_to_action || 'ask-follow') === opt.value
                  ? 'border-primary-500/50 bg-primary-600/15 text-primary-400'
                  : 'border-app-border bg-app-surface text-app-text-tertiary hover:text-app-text-secondary'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Brand Voice */}
      <div className="space-y-1">
        <span className="text-[9px] text-app-text-tertiary">品牌声音</span>
        <input
          value={parameters.brand_voice_name || ''}
          onChange={(e) => setParameters({ brand_voice_name: e.target.value })}
          disabled={disabled}
          placeholder="例如：青春活泼、专业权威、温暖治愈..."
          className="w-full h-7 rounded-lg border border-app-border bg-app-surface px-2 text-[10px] text-app-text placeholder:text-app-text-tertiary outline-none focus:border-primary-500/50 transition-colors"
        />
      </div>
    </div>
  );
}
