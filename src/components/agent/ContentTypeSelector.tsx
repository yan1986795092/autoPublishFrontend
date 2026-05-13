import { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { cn } from '../../utils/helpers';
import type { ContentType, ContentStyle } from '../../types';

interface ContentTypeOption {
  value: ContentType;
  label: string;
  icon: string;
  description: string;
}

const CONTENT_TYPES: ContentTypeOption[] = [
  { value: 'blog', label: '技术博客', icon: '📝', description: '长文 + 代码块 + 架构图' },
  { value: 'social_post', label: '社媒帖子', icon: '📱', description: '小红书/微博/即刻等短内容' },
  { value: 'copywriting', label: '营销文案', icon: '✍️', description: 'Landing Page / PR稿' },
  { value: 'script', label: '视频脚本', icon: '🎬', description: '口播稿 + 分镜描述' },
  { value: 'newsletter', label: '邮件订阅', icon: '📧', description: '系列邮件 + 排版' },
  { value: 'report', label: '分析报告', icon: '📊', description: '数据驱动 + 图表' },
];

const STYLE_OPTIONS: { value: ContentStyle; label: string }[] = [
  { value: '技术', label: '技术' },
  { value: '种草', label: '种草' },
  { value: '干货', label: '干货' },
  { value: '幽默', label: '幽默' },
  { value: '深度', label: '深度' },
  { value: '教程', label: '教程' },
];

const LENGTH_OPTIONS = [
  { value: 'short', label: '短篇', desc: '~500字' },
  { value: 'medium', label: '中篇', desc: '~2000字' },
  { value: 'long', label: '长篇', desc: '~5000字' },
];

interface FeatureToggle {
  key: string;
  label: string;
  defaultOn: boolean;
}

const FEATURES: FeatureToggle[] = [
  { key: 'auto_image', label: '自动配图', defaultOn: false },
  { key: 'seo_optimize', label: 'SEO优化', defaultOn: true },
  { key: 'multi_platform', label: '多平台适配', defaultOn: false },
  { key: 'diagram', label: '生成架构图', defaultOn: false },
];

export interface ContentTypeConfig {
  type: ContentType;
  style: ContentStyle;
  length: string;
  features: Record<string, boolean>;
}

interface ContentTypeSelectorProps {
  onChange?: (config: ContentTypeConfig) => void;
  className?: string;
}

export function ContentTypeSelector({ onChange, className }: ContentTypeSelectorProps) {
  const [type, setType] = useState<ContentType>('blog');
  const [style, setStyle] = useState<ContentStyle>('技术');
  const [length, setLength] = useState('medium');
  const [features, setFeatures] = useState<Record<string, boolean>>(
    Object.fromEntries(FEATURES.map(f => [f.key, f.defaultOn]))
  );

  const notifyChange = (newType: ContentType, newStyle: ContentStyle, newLength: string, newFeatures: Record<string, boolean>) => {
    onChange?.({ type: newType, style: newStyle, length: newLength, features: newFeatures });
  };

  const handleTypeChange = (newType: ContentType) => {
    setType(newType);
    notifyChange(newType, style, length, features);
  };

  const handleStyleChange = (newStyle: ContentStyle) => {
    setStyle(newStyle);
    notifyChange(type, newStyle, length, features);
  };

  const handleFeatureToggle = (key: string) => {
    const updated = { ...features, [key]: !features[key] };
    setFeatures(updated);
    notifyChange(type, style, length, updated);
  };

  return (
    <Card variant="glass" className={cn('w-full', className)}>
      <CardContent className="space-y-4 p-4">
        {/* 内容类型 */}
        <div>
          <label className="mb-2 block text-xs font-medium text-app-text-secondary">内容类型</label>
          <div className="grid grid-cols-3 gap-2">
            {CONTENT_TYPES.map((item) => (
              <button
                key={item.value}
                onClick={() => handleTypeChange(item.value)}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-lg border p-3 text-xs transition-colors',
                  type === item.value
                    ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                    : 'border-app-border text-app-text-secondary hover:border-app-border/50 hover:text-app-text'
                )}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
                <span className="text-[10px] opacity-70">{item.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 风格 */}
        <div>
          <label className="mb-2 block text-xs font-medium text-app-text-secondary">写作风格</label>
          <div className="flex flex-wrap gap-2">
            {STYLE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleStyleChange(opt.value)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  style === opt.value
                    ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30'
                    : 'bg-app-surface text-app-text-secondary hover:text-app-text'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 长度 */}
        <div>
          <label className="mb-2 block text-xs font-medium text-app-text-secondary">篇幅</label>
          <div className="flex gap-2">
            {LENGTH_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setLength(opt.value);
                  notifyChange(type, style, opt.value, features);
                }}
                className={cn(
                  'flex-1 rounded-lg border px-3 py-2 text-xs transition-colors',
                  length === opt.value
                    ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                    : 'border-app-border text-app-text-secondary hover:border-app-border/50'
                )}
              >
                <div className="font-medium">{opt.label}</div>
                <div className="text-[10px] opacity-70">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 功能开关 */}
        <div>
          <label className="mb-2 block text-xs font-medium text-app-text-secondary">附加功能</label>
          <div className="flex flex-wrap gap-2">
            {FEATURES.map((feature) => (
              <button
                key={feature.key}
                onClick={() => handleFeatureToggle(feature.key)}
                className={cn(
                  'rounded-lg border px-3 py-1.5 text-xs transition-colors',
                  features[feature.key]
                    ? 'border-green-500/30 bg-green-500/10 text-green-400'
                    : 'border-app-border text-app-text-secondary hover:border-app-border/50'
                )}
              >
                {features[feature.key] ? '✓ ' : ''}{feature.label}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
