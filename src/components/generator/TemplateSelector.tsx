import { useEffect, useState, useCallback } from 'react';
import { useGeneratorStore } from '../../stores/useGeneratorStore';
import { templatesApi, platformsApi } from '../../services/api';
import { cn } from '../../utils/helpers';
import type { PromptTemplate, Platform } from '../../types';

interface Props {
  disabled?: boolean;
}

// Helper: group templates by platform and render
function PlatformGroups({
  platforms,
  templates,
  draft,
  onSelect,
}: {
  platforms: Platform[];
  templates: PromptTemplate[];
  draft: { template_id: string | null };
  onSelect: (id: string) => void;
}) {
  const platformNameMap: Record<string, string> = {};
  for (const p of platforms) {
    platformNameMap[p.code] = p.name;
  }

  const codes = [...new Set(templates.map((t) => t.platform_code || null))];
  codes.sort((a, b) => {
    if (a === null) return 1;
    if (b === null) return -1;
    return (platformNameMap[a] || a).localeCompare(platformNameMap[b] || b);
  });

  return (
    <>
      {codes.map((platform) => {
        const group = templates.filter((t) => (t.platform_code || null) === platform);
        if (group.length === 0) return null;
        const platformName = platform ? (platformNameMap[platform] || platform) : '通用';
        return (
          <div key={platform || '通用'}>
            <div className="px-2.5 py-1 text-[8px] text-app-text-tertiary uppercase tracking-wider bg-app-surface/50">
              {platformName}
            </div>
            {group.map((t) => (
              <button
                key={t.id}
                onClick={() => onSelect(t.id)}
                className={cn(
                  'w-full px-2.5 py-2 text-[10px] text-left hover:bg-white/[0.06] transition-colors flex items-center justify-between',
                  draft.template_id === t.id && 'text-primary-400 bg-primary-600/10'
                )}
              >
                <div>
                  <div className="font-medium">{t.name}</div>
                  {t.description && (
                    <div className="text-[8px] text-app-text-tertiary truncate max-w-[200px]">{t.description}</div>
                  )}
                </div>
                <span className="text-[8px] text-app-text-tertiary ml-2">使用 {t.use_count} 次</span>
              </button>
            ))}
          </div>
        );
      })}
    </>
  );
}

export function TemplateSelector({ disabled }: Props) {
  const { draft, setTemplateId } = useGeneratorStore();
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [open, setOpen] = useState(false);

  const fetchTemplates = useCallback(async () => {
    try {
      const [tRes, pRes] = await Promise.all([
        templatesApi.list({ platform_code: draft.platform_code }),
        platformsApi.list(),
      ]);
      if (tRes.data.success && tRes.data.data) {
        setTemplates(tRes.data.data);
      }
      if (pRes.data.success && pRes.data.data) {
        setPlatforms(pRes.data.data);
      }
    } catch { /* ignore */ }
  }, [draft.platform_code]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const selected = templates.find((t) => t.id === draft.template_id);

  return (
    <div className="space-y-1.5">
      <span className="text-[9px] text-app-text-tertiary uppercase tracking-wider font-medium">生成模板</span>
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          disabled={disabled}
          className={cn(
            'w-full h-7 rounded-lg border border-app-border bg-app-surface px-2 text-[10px] text-left flex items-center justify-between transition-colors',
            'focus:outline-none focus:border-primary-500/50 disabled:opacity-50'
          )}
        >
          <span className={selected ? 'text-app-text' : 'text-app-text-tertiary'}>
            {selected ? selected.name : '默认（自动选择）'}
          </span>
          <span className="text-app-text-tertiary text-[8px]">{open ? '▲' : '▼'}</span>
        </button>

        {open && (
          <>
            {/* Backdrop for closing */}
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-app-elevated border border-white/[0.08] rounded-lg shadow-xl overflow-hidden">
              {/* Default option */}
              <button
                onClick={() => { setTemplateId(null); setOpen(false); }}
                className={cn(
                  'w-full px-2.5 py-2 text-[10px] text-left hover:bg-white/[0.06] transition-colors',
                  !draft.template_id && 'text-primary-400 bg-primary-600/10'
                )}
              >
                <div className="font-medium">默认（自动选择）</div>
                <div className="text-[8px] text-app-text-tertiary">由系统自动匹配最优模板</div>
              </button>

              {templates.length === 0 && (
                <div className="px-2.5 py-3 text-[10px] text-app-text-tertiary text-center">
                  暂无可用模板
                </div>
              )}

              {/* Group by platform */}
              <PlatformGroups platforms={platforms} templates={templates} draft={draft} onSelect={(id) => { setTemplateId(id); setOpen(false); }} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}