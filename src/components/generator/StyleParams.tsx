import { useGeneratorStore } from '../../stores/useGeneratorStore';
import { cn } from '../../utils/helpers';
import type { GenerateParams } from '../../types';

const STYLE_OPTIONS: Array<{ value: GenerateParams['reference_style']; label: string }> = [
  { value: 'informative', label: '信息干货' },
  { value: 'storytelling', label: '故事叙述' },
  { value: 'case-study', label: '案例分析' },
  { value: 'guide', label: '操作指南' },
  // 小红书专有风格
  { value: 'collection', label: '合集类' },
  { value: 'immersive', label: '沉浸式' },
  { value: 'advice-seeking', label: '听劝体' },
  { value: 'challenge', label: '挑战体' },
];

const STRUCTURE_OPTIONS: Array<{ value: GenerateParams['content_structure']; label: string }> = [
  { value: 'flexible', label: '自由式' },
  { value: 'intro-body-conclusion', label: '引言-正文-总结' },
  { value: 'problem-solution', label: '问题-解决方案' },
  { value: 'listicle', label: '清单/列举' },
];

const POV_OPTIONS: Array<{ value: GenerateParams['point_of_view']; label: string }> = [
  { value: 'first-person', label: '第一人称' },
  { value: 'third-person', label: '第三人称' },
  { value: 'brand', label: '品牌视角' },
];

export function StyleParams({ disabled }: { disabled?: boolean }) {
  const { draft, setParameters } = useGeneratorStore();
  const parameters = draft.parameters;

  return (
    <div className="space-y-3">
      {/* Reference Style */}
      <div className="space-y-1">
        <span className="text-[9px] text-app-text-tertiary">参考风格</span>
        <div className="grid grid-cols-2 gap-1">
          {STYLE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setParameters({ reference_style: opt.value })}
              disabled={disabled}
              className={cn(
                'py-1.5 rounded-lg border text-[10px] font-medium transition-all',
                (parameters.reference_style || 'informative') === opt.value
                  ? 'border-primary-500/50 bg-primary-600/15 text-primary-400'
                  : 'border-app-border bg-app-surface text-app-text-tertiary hover:text-app-text-secondary'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Structure */}
      <div className="space-y-1">
        <span className="text-[9px] text-app-text-tertiary">文章结构</span>
        <div className="grid grid-cols-2 gap-1">
          {STRUCTURE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setParameters({ content_structure: opt.value })}
              disabled={disabled}
              className={cn(
                'py-1.5 rounded-lg border text-[10px] font-medium transition-all',
                (parameters.content_structure || 'flexible') === opt.value
                  ? 'border-primary-500/50 bg-primary-600/15 text-primary-400'
                  : 'border-app-border bg-app-surface text-app-text-tertiary hover:text-app-text-secondary'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Point of View */}
      <div className="space-y-1">
        <span className="text-[9px] text-app-text-tertiary">写作视角</span>
        <div className="flex gap-1">
          {POV_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setParameters({ point_of_view: opt.value })}
              disabled={disabled}
              className={cn(
                'flex-1 py-1.5 rounded-lg border text-[10px] font-medium transition-all',
                (parameters.point_of_view || 'first-person') === opt.value
                  ? 'border-primary-500/50 bg-primary-600/15 text-primary-400'
                  : 'border-app-border bg-app-surface text-app-text-tertiary hover:text-app-text-secondary'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
