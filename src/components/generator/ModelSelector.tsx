import { useEffect, useState } from 'react';
import { useGeneratorStore } from '../../stores/useGeneratorStore';
import { platformsApi } from '../../services/api';
import { cn } from '../../utils/helpers';
import type { ModelInfo } from '../../types';

export function ModelSelector({ disabled }: { disabled?: boolean }) {
  const { draft, setModel } = useGeneratorStore();
  const [providers, setProviders] = useState<ModelInfo[]>([]);

  useEffect(() => {
    platformsApi.listModels().then((res) => {
      if (res.data.success && res.data.data) {
        setProviders(res.data.data.providers);
        // Auto-select first available model if none selected
        if (!draft.model) {
          const firstAvail = res.data.data.providers.find((p) => p.available);
          if (firstAvail) setModel(firstAvail.models[0]);
        }
      }
    }).catch(() => {});
  }, []);

  const currentProvider = providers.find((p) => p.models.includes(draft.model || ''));

  return (
    <div className="space-y-1.5">
      <span className="text-[9px] text-app-text-tertiary uppercase tracking-wider font-medium">AI 模型</span>
      <div className="flex gap-1.5">
        <select
          value={currentProvider?.provider || ''}
          onChange={(e) => {
            const p = providers.find((pr) => pr.provider === e.target.value);
            if (p && p.models.length > 0) setModel(p.models[0]);
          }}
          disabled={disabled}
          className="flex-1 h-7 rounded-lg border border-app-border bg-app-surface text-[10px] text-app-text px-2 outline-none focus:border-primary-500/50 disabled:opacity-50"
        >
          <option value="" disabled>选择 Provider</option>
          {providers.map((p) => (
            <option key={p.provider} value={p.provider} disabled={!p.available}>
              {p.name} {p.available ? '' : '(未配置)'}
            </option>
          ))}
        </select>
        <select
          value={draft.model || ''}
          onChange={(e) => setModel(e.target.value)}
          disabled={disabled || !currentProvider}
          className="flex-[2] h-7 rounded-lg border border-app-border bg-app-surface text-[10px] text-app-text px-2 outline-none focus:border-primary-500/50 disabled:opacity-50"
        >
          {currentProvider?.models.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
