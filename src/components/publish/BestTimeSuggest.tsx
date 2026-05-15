import { useState, useEffect } from 'react';
import { publishApi } from '../../services/api';
import { useUIStore } from '../../stores/useUIStore';
import { cn } from '../../utils/helpers';
import { Clock, Loader2, TrendingUp } from 'lucide-react';

interface Props {
  platformCode: string;
}

interface TimeSuggestion {
  best: string;
  time_slots: string[];
  weekdays: string[];
  reason: string;
}

export function BestTimeSuggest({ platformCode }: Props) {
  const { showToast } = useUIStore();
  const [suggestion, setSuggestion] = useState<TimeSuggestion | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await publishApi.getBestTime(platformCode);
        const data = res.data.data;
        if (data) {
          setSuggestion(data as TimeSuggestion);
        }
      } catch {
        showToast('获取发布时间建议失败', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [platformCode]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[10px] text-app-text-tertiary py-2">
        <Loader2 className="w-3 h-3 animate-spin" />
        分析最佳发布时间...
      </div>
    );
  }

  if (!suggestion) return null;

  return (
    <div className="rounded-xl bg-primary-500/5 border border-primary-500/10 p-3 space-y-2">
      <div className="flex items-center gap-1.5">
        <TrendingUp className="w-3 h-3 text-primary-400" />
        <span className="text-[10px] font-medium text-primary-400">最佳发布时间建议</span>
      </div>

      <div className="flex items-center gap-2">
        <Clock className="w-3.5 h-3.5 text-green-400" />
        <span className="text-[11px] font-semibold text-green-400">{suggestion.best}</span>
      </div>

      <div className="flex flex-wrap gap-1">
        {suggestion.time_slots.map((slot) => (
          <span
            key={slot}
            className={cn(
              'text-[9px] px-1.5 py-0.5 rounded border',
              slot === suggestion.best
                ? 'border-green-500/30 text-green-400 bg-green-500/10'
                : 'border-white/[0.06] text-app-text-tertiary'
            )}
          >
            {slot}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-1">
        <span className="text-[9px] text-app-text-tertiary">推荐周几：</span>
        {suggestion.weekdays.map((day) => (
          <span key={day} className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.04] text-app-text-secondary">
            {day}
          </span>
        ))}
      </div>

      <p className="text-[9px] text-app-text-tertiary leading-relaxed">{suggestion.reason}</p>
    </div>
  );
}
