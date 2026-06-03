import { useGeneratorStore } from '../../stores/useGeneratorStore';
import { OptionChip } from '../ui/option-chip';

const LANGUAGE_OPTIONS = [
  { value: 'formal' as const, label: '正式' },
  { value: 'neutral' as const, label: '中性' },
  { value: 'casual' as const, label: '随意' },
] as const;

const CTA_OPTIONS = [
  { value: 'ask-follow' as const, label: '引导关注' },
  { value: 'ask-share' as const, label: '引导分享' },
  { value: 'ask-save' as const, label: '引导收藏' },
  { value: 'none' as const, label: '无' },
] as const;

export function AdvancedParams({ disabled }: { disabled?: boolean }) {
  const { draft, setParameters } = useGeneratorStore();
  const parameters = draft.parameters;

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <span className="text-[9px] text-app-text-tertiary">语言风格</span>
        <OptionChip
          options={LANGUAGE_OPTIONS}
          value={parameters.language_style || 'neutral'}
          onChange={(v) => setParameters({ language_style: v })}
          disabled={disabled}
        />
      </div>

      <div className="space-y-1">
        <span className="text-[9px] text-app-text-tertiary">结尾引导</span>
        <OptionChip
          options={CTA_OPTIONS}
          value={parameters.call_to_action || 'ask-follow'}
          onChange={(v) => setParameters({ call_to_action: v })}
          disabled={disabled}
        />
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
