import { useGeneratorStore } from '../../stores/useGeneratorStore';
import { cn } from '../../utils/helpers';
import type { GenerateParams } from '../../types';

const LENGTH_OPTIONS: Array<{ value: GenerateParams['length']; label: string }> = [
  { value: 'short', label: '短篇' },
  { value: 'medium', label: '中篇' },
  { value: 'long', label: '长篇' },
];

const TONE_OPTIONS: Array<{ value: GenerateParams['tone']; label: string }> = [
  { value: 'friendly', label: '友好' },
  { value: 'professional', label: '专业' },
  { value: 'humorous', label: '幽默' },
];

export function BasicParams({ disabled }: { disabled?: boolean }) {
  const { parameters, setParameters } = useGeneratorStore();

  return (
    <div className="space-y-3">
      {/* Length */}
      <div className="space-y-1">
        <span className="text-[9px] text-app-text-tertiary">长度</span>
        <div className="flex gap-1">
          {LENGTH_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setParameters({ length: opt.value })}
              disabled={disabled}
              className={cn(
                'flex-1 py-1.5 rounded-lg border text-[10px] font-medium transition-all',
                parameters.length === opt.value
                  ? 'border-primary-500/50 bg-primary-600/15 text-primary-400'
                  : 'border-app-border bg-app-surface text-app-text-tertiary hover:text-app-text-secondary'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tone */}
      <div className="space-y-1">
        <span className="text-[9px] text-app-text-tertiary">风格</span>
        <div className="flex gap-1">
          {TONE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setParameters({ tone: opt.value })}
              disabled={disabled}
              className={cn(
                'flex-1 py-1.5 rounded-lg border text-[10px] font-medium transition-all',
                parameters.tone === opt.value
                  ? 'border-primary-500/50 bg-primary-600/15 text-primary-400'
                  : 'border-app-border bg-app-surface text-app-text-tertiary hover:text-app-text-secondary'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
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
