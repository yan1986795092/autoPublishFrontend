import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Send, CheckCircle2, XCircle, Timer, AlertTriangle } from 'lucide-react';
import { operationsApi } from '../../services/api';
import { StatCard } from './StatCard';
import { PlatformHealthCard } from './PlatformHealthCard';
import { FailureList } from './FailureList';
import type { PublishingMetrics } from '../../types/operations';

export function PublishingTab() {
  const [data, setData] = useState<PublishingMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetch = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const res = await operationsApi.getPublishingMetrics();
      if (res.data.success && res.data.data) {
        setData(res.data.data);
      } else {
        setError('获取数据失败');
      }
    } catch {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    const timer = setInterval(() => fetch(true), 15_000);
    return () => clearInterval(timer);
  }, [fetch]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="flex items-center gap-2 text-sm text-app-text-secondary">
          <div className="w-4 h-4 rounded-full border-2 border-primary-400 border-t-transparent animate-spin" />
          加载中...
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
          <p className="text-sm text-red-400">{error}</p>
          <button onClick={fetch} className="text-xs text-primary-400 hover:underline">重试</button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { summary } = data;
  const rateColor = summary.success_rate >= 0.98 ? 'text-green-400' : summary.success_rate >= 0.95 ? 'text-yellow-400' : 'text-red-400';
  const failColor = summary.fail_count > 0 ? 'text-red-400' : 'text-app-text-tertiary';
  const delayColor = summary.avg_publish_delay_seconds < 30 ? 'text-green-400' : summary.avg_publish_delay_seconds < 120 ? 'text-yellow-400' : 'text-red-400';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* KPI 横幅 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={Send} label="今日发布总数" value={summary.total_today} color="text-blue-400" />
        <StatCard icon={CheckCircle2} label="成功率" value={`${(summary.success_rate * 100).toFixed(1)}%`} color={rateColor} />
        <StatCard icon={XCircle} label="失败数" value={summary.fail_count} color={failColor}
          sub={summary.fail_count > 0 ? '需关注' : undefined} />
        <StatCard icon={Timer} label="平均发布延迟" value={`${summary.avg_publish_delay_seconds}s`} color={delayColor}
          sub={summary.avg_publish_delay_seconds < 30 ? '正常' : '偏慢'} />
      </div>

      {/* 平台健康状态 */}
      <div>
        <h3 className="text-xs font-medium text-app-text mb-3">平台健康状态</h3>
        {data.platforms.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.platforms.map((p) => (
              <PlatformHealthCard key={p.platform_code} {...p} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-app-border/50 bg-app-surface p-6 text-center">
            <p className="text-xs text-app-text-tertiary">暂无平台数据</p>
          </div>
        )}
      </div>

      {/* 失败归因 */}
      <div>
        <h3 className="text-xs font-medium text-app-text mb-3">失败归因</h3>
        <FailureList failures={data.failures} />
      </div>

      {/* 自动刷新 */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-app-border/50 bg-app-surface">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-[10px] text-app-text-tertiary">每 15 秒自动刷新</span>
      </div>
    </motion.div>
  );
}
