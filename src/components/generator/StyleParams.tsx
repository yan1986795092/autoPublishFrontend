import { useGeneratorStore } from '../../stores/useGeneratorStore';
import { OptionChip } from '../ui/option-chip';

const STYLE_OPTIONS = [
  { value: 'informative' as const, label: '信息干货' },
  { value: 'storytelling' as const, label: '故事叙述' },
  { value: 'case-study' as const, label: '案例分析' },
  { value: 'guide' as const, label: '操作指南' },
  { value: 'collection' as const, label: '合集类' },
  { value: 'immersive' as const, label: '沉浸式' },
  { value: 'advice-seeking' as const, label: '听劝体' },
  { value: 'challenge' as const, label: '挑战体' },
] as const;

const STRUCTURE_OPTIONS = [
  { value: 'flexible' as const, label: '自由式' },
  { value: 'intro-body-conclusion' as const, label: '引言-正文-总结' },
  { value: 'problem-solution' as const, label: '问题-解决方案' },
  { value: 'listicle' as const, label: '清单/列举' },
] as const;

const POV_OPTIONS = [
  { value: 'first-person' as const, label: '第一人称' },
  { value: 'third-person' as const, label: '第三人称' },
  { value: 'brand' as const, label: '品牌视角' },
] as const;

export function StyleParams({ disabled }: { disabled?: boolean }) {
  const { draft, setParameters } = useGeneratorStore();
  const parameters = draft.parameters;

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <span className="text-[9px] text-app-text-tertiary">参考风格</span>
        <OptionChip
          options={STYLE_OPTIONS}
          value={parameters.reference_style || 'informative'}
          onChange={(v) => setParameters({ reference_style: v })}
          disabled={disabled}
          layout="grid-cols-2"
        />
      </div>

      <div className="space-y-1">
        <span className="text-[9px] text-app-text-tertiary">文章结构</span>
        <OptionChip
          options={STRUCTURE_OPTIONS}
          value={parameters.content_structure || 'flexible'}
          onChange={(v) => setParameters({ content_structure: v })}
          disabled={disabled}
          layout="grid-cols-2"
        />
      </div>

      <div className="space-y-1">
        <span className="text-[9px] text-app-text-tertiary">写作视角</span>
        <OptionChip
          options={POV_OPTIONS}
          value={parameters.point_of_view || 'first-person'}
          onChange={(v) => setParameters({ point_of_view: v })}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
