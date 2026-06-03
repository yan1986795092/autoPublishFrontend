import { useGeneratorStore } from '../../stores/useGeneratorStore';
import { OptionChip } from '../ui/option-chip';
import type { GenerateParams } from '../../types';

const LENGTH_OPTIONS = [
  { value: 'short' as const, label: '短篇' },
  { value: 'medium' as const, label: '中篇' },
  { value: 'long' as const, label: '长篇' },
];

const TONE_OPTIONS = [
  { value: 'friendly' as const, label: '友好' },
  { value: 'professional' as const, label: '专业' },
  { value: 'humorous' as const, label: '幽默' },
];

export function BasicParams({ disabled }: { disabled?: boolean }) {
  const { draft, setParameters } = useGeneratorStore();
  const parameters = draft.parameters;

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <span className="text-[9px] text-app-text-tertiary">长度</span>
        <OptionChip
          options={LENGTH_OPTIONS}
          value={parameters.length || 'short'}
          onChange={(v) => setParameters({ length: v })}
          disabled={disabled}
        />
      </div>

      <div className="space-y-1">
        <span className="text-[9px] text-app-text-tertiary">风格</span>
        <OptionChip
          options={TONE_OPTIONS}
          value={parameters.tone || 'friendly'}
          onChange={(v) => setParameters({ tone: v })}
          disabled={disabled}
        />
      </div>

      {/* Creativity */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-app-text-tertiary">创造力</span>
          <span className="text-[9px] text-primary-400">{Math.round(parameters.creativity * 100)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={parameters.creativity}
          onChange={(e) => setParameters({ creativity: parseFloat(e.target.value) })}
          disabled={disabled}
          className="w-full h-1 rounded-full appearance-none bg-gray-800 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary-500 [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(59,130,246,0.4)]"
        />
      </div>
    </div>
  );
}
