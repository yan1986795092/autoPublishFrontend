import { useSettingsStore } from '../../stores/useSettingsStore';
import { Switch } from '../ui/switch';
import { Accordion, AccordionItem } from '../ui/accordion';
import { SettingsSection } from './SettingsSection';
import { CardAccent } from './SettingsSection';
import { cn } from '../../utils/helpers';
import type { Theme, FontSize, ViewDensity } from '../../types/settings';
import { Check } from 'lucide-react';

const themes: Array<{ id: Theme; label: string; desc: string; preview: React.ReactNode }> = [
  {
    id: 'light',
    label: '浅色',
    desc: '明亮的浅色主题',
    preview: (
      <svg width="40" height="30" viewBox="0 0 40 30" className="mx-auto">
        <rect width="40" height="30" rx="5" fill="#f4f4f5" />
        <circle cx="20" cy="15" r="5" fill="#d4d4d8" />
        <circle cx="20" cy="15" r="3" fill="#fafafa" />
        <circle cx="20" cy="15" r="1.5" fill="#a1a1aa" />
      </svg>
    ),
  },
  {
    id: 'dark',
    label: '深色',
    desc: '护眼的深色主题',
    preview: (
      <svg width="40" height="30" viewBox="0 0 40 30" className="mx-auto">
        <rect width="40" height="30" rx="5" fill="#141416" />
        <circle cx="20" cy="15" r="5" fill="#2a2a2e" />
        <path d="M20 11 A4 4 0 1 0 20 19 A3 3 0 1 1 20 11" fill="#3b82f6" />
      </svg>
    ),
  },
  {
    id: 'system',
    label: '跟随系统',
    desc: '自动匹配系统设置',
    preview: (
      <svg width="40" height="30" viewBox="0 0 40 30" className="mx-auto">
        <rect width="40" height="30" rx="5" fill="#141416" />
        <rect x="3" y="3" width="15" height="11" rx="2.5" fill="#1c1c1e" />
        <rect x="22" y="3" width="15" height="11" rx="2.5" fill="#f4f4f5" />
        <rect x="3" y="17" width="15" height="10" rx="2.5" fill="#f4f4f5" />
        <rect x="22" y="17" width="15" height="10" rx="2.5" fill="#1c1c1e" />
      </svg>
    ),
  },
];

const fontSizes: Array<{ id: FontSize; label: string; preview: string }> = [
  { id: 'small', label: '小', preview: 'A' },
  { id: 'medium', label: '中', preview: 'A' },
  { id: 'large', label: '大', preview: 'A' },
];

const fontSizeMap = {
  small: 'text-[11px]',
  medium: 'text-sm',
  large: 'text-base',
};

const densities: Array<{ id: ViewDensity; label: string; desc: string }> = [
  { id: 'compact', label: '紧凑', desc: '更多内容，更少留白' },
  { id: 'standard', label: '标准', desc: '平衡的界面密度' },
  { id: 'comfortable', label: '舒适', desc: '宽松留白，易于阅读' },
];

export function AppearanceTab() {
  const {
    theme, fontSize, viewDensity, reduceMotion, transparency,
    setTheme, setFontSize, setViewDensity, setReduceMotion, setTransparency,
  } = useSettingsStore();

  return (
    <div className="space-y-8">
      <SettingsSection title="主题" description="选择界面的整体色调">
        <div className="grid grid-cols-3 gap-3">
          {themes.map((t) => {
            const selected = theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={cn(
                  'relative flex flex-col items-center gap-3 rounded-xl border p-4 transition-all duration-200',
                  selected
                    ? 'border-primary-500/60 bg-primary-500/[0.06]'
                    : 'border-app-border/80 bg-app-surface hover:border-app-border-light hover:bg-app-elevated'
                )}
              >
                {selected && (
                  <span className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-primary-500 flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </span>
                )}
                <div className="rounded-lg overflow-hidden ring-1 ring-black/5">
                  {t.preview}
                </div>
                <span className={cn('text-xs font-semibold', selected ? 'text-primary-400' : 'text-app-text')}>
                  {t.label}
                </span>
                <span className="text-[10px] text-app-text-tertiary text-center leading-tight">{t.desc}</span>
              </button>
            );
          })}
        </div>
      </SettingsSection>

      <SettingsSection title="字体大小" description="调整界面文字的大小">
        <div className="grid grid-cols-3 gap-3">
          {fontSizes.map((f) => {
            const selected = fontSize === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFontSize(f.id)}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-xl border py-5 transition-all duration-200',
                  selected
                    ? 'border-primary-500/60 bg-primary-500/[0.06]'
                    : 'border-app-border/80 bg-app-surface hover:border-app-border-light hover:bg-app-elevated'
                )}
              >
                <span className={cn('font-bold text-white leading-none', fontSizeMap[f.id])}>{f.preview}</span>
                <span className={cn('text-xs font-semibold', selected ? 'text-primary-400' : 'text-app-text-secondary')}>
                  {f.label}
                </span>
              </button>
            );
          })}
        </div>
      </SettingsSection>

      <SettingsSection title="内容密度" description="调整界面的信息密度">
        <div className="grid grid-cols-3 gap-3">
          {densities.map((d) => {
            const selected = viewDensity === d.id;
            return (
              <button
                key={d.id}
                onClick={() => setViewDensity(d.id)}
                className={cn(
                  'flex flex-col items-start gap-1 rounded-xl border py-3 px-4 transition-all duration-200 text-left',
                  selected
                    ? 'border-primary-500/60 bg-primary-500/[0.06]'
                    : 'border-app-border/80 bg-app-surface hover:border-app-border-light hover:bg-app-elevated'
                )}
              >
                <span className={cn('text-xs font-semibold', selected ? 'text-primary-400' : 'text-app-text')}>
                  {d.label}
                </span>
                <span className="text-[10px] text-app-text-tertiary leading-tight">{d.desc}</span>
              </button>
            );
          })}
        </div>
      </SettingsSection>

      <SettingsSection title="高级选项" description="动画和其他显示偏好">
        <div className="rounded-xl border border-app-border/80 bg-app-surface overflow-hidden">
          <CardAccent />
          {[
            {
              label: '减少动画',
              description: '尊重系统级减少动画偏好',
              checked: reduceMotion,
              onChange: setReduceMotion,
            },
            {
              label: '透明效果',
              description: '窗口和面板使用半透明背景',
              checked: transparency,
              onChange: setTransparency,
            },
          ].map((item, i, arr) => (
            <div key={item.label}>
              <div className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors">
                <div>
                  <p className="text-sm text-app-text font-medium">{item.label}</p>
                  <p className="text-[11px] text-app-text-tertiary mt-0.5">{item.description}</p>
                </div>
                <Switch checked={item.checked} onCheckedChange={item.onChange} />
              </div>
              {i < arr.length - 1 && <div className="h-px bg-app-border/50 mx-5" />}
            </div>
          ))}
        </div>
      </SettingsSection>
    </div>
  );
}
