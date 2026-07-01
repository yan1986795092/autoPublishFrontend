import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Send, CheckCircle2, XCircle, Timer, AlertTriangle, Globe, ExternalLink } from 'lucide-react';
import { operationsApi } from '../../services/api';
import { StatCard } from './StatCard';
import { PlatformHealthCard } from './PlatformHealthCard';
import type { PublishingMetrics } from '../../types/operations';

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fmtViews(n: number) {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  return String(n);
}

const STATUS_ICON = {
  success: <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />,
  failed:  <XCircle    className="w-3.5 h-3.5 text-red-400" />,
  pending: <Timer      className="w-3.5 h-3.5 text-yellow-400" />,
} as const;

const POLL_INTERVAL = 60_000;

export function PublishingTab() {
  const [data, setData] = useState<PublishingMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetch = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const res = await operationsApi.getPublishingMetrics();
      if (res.data.success && res.data.data) setData(res.data.data);
      else setError('获取数据失败');
    } catch { setError('网络错误'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetch();
    const t = setInterval(() => fetch(true), POLL_INTERVAL);
    return () => clearInterval(t);
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
  const rateColor = summary.success_rate >= 0.98 ? 'text-green-400'
                  : summary.success_rate >= 0.95 ? 'text-yellow-400' : 'text-red-400';
  const failColor = summary.fail_count > 0 ? 'text-red-400' : 'text-app-text-tertiary';
  const delayColor = summary.avg_publish_delay_seconds < 30  ? 'text-green-400'
                   : summary.avg_publish_delay_seconds < 120 ? 'text-yellow-400' : 'text-red-400';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

      {/* KPI 横幅 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={Send} label="今日发布总数"
          value={summary.total_today} color="text-blue-400"
          sub={`成功 ${summary.success_count}`} />
        <StatCard icon={CheckCircle2} label="成功率"
          value={`${(summary.success_rate * 100).toFixed(1)}%`}
          color={rateColor} />
        <StatCard icon={XCircle} label="发布失败"
          value={summary.fail_count} color={failColor}
          sub={summary.fail_count > 0 ? '需关注' : undefined} />
        <StatCard icon={Timer} label="平均发布延迟"
          value={`${summary.avg_publish_delay_seconds}s`} color={delayColor}
          sub={summary.avg_publish_delay_seconds < 30 ? '正常' : '偏慢'} />
      </div>

      {/* 平台健康状态 */}
      <div>
        <h3 className="text-xs font-medium text-app-text mb-3">平台健康状态</h3>
        {data.platforms.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.platforms.map(p => (
              <PlatformHealthCard key={p.platform_code} {...p} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-app-border/50 bg-app-surface p-6 text-center">
            <Globe className="w-6 h-6 text-app-text-tertiary mx-auto mb-2" />
            <p className="text-xs text-app-text-tertiary">暂无发布数据</p>
          </div>
        )}
      </div>

      {/* 最近发布记录 */}
      <div>
        <h3 className="text-xs font-medium text-app-text mb-3">最近发布</h3>
        {data.recent_records.length > 0 ? (
          <div className="rounded-lg border border-app-border/50 bg-app-surface overflow-hidden shadow-sm">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-app-border/30 text-app-text-tertiary">
                  <th className="text-left py-2 px-3 font-medium">时间</th>
                  <th className="text-left py-2 px-3 font-medium">内容</th>
                  <th className="text-left py-2 px-3 font-medium">平台</th>
                  <th className="text-left py-2 px-3 font-medium">状态</th>
                  <th className="text-right py-2 px-3 font-medium">阅读</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_records.map((r, i) => (
                  <tr key={`${r.time}|${r.platform_code}|${i}`}
                    className="border-b border-app-border/20 hover:bg-app-elevated/30 transition-colors">
                    <td className="py-2 px-3 text-app-text-secondary whitespace-nowrap">{formatTime(r.time)}</td>
                    <td className="py-2 px-3 text-app-text max-w-[200px] truncate" title={r.title}>
                      {r.title.length > 40 ? r.title.slice(0, 40) + '...' : r.title}
                    </td>
                    <td className="py-2 px-3 text-app-text-secondary">{r.platform_name}</td>
                    <td className="py-2 px-3">
                      <span className="inline-flex items-center gap-1">
                        {STATUS_ICON[r.status] ?? STATUS_ICON.pending}
                        <span className={`text-[10px] ${
                          r.status === 'success' ? 'text-green-400'
                          : r.status === 'failed' ? 'text-red-400' : 'text-yellow-400'
                        }`}>
                          {r.status === 'success' ? '成功' : r.status === 'failed' ? '失败' : '进行中'}
                        </span>
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right text-app-text-secondary">
                      {r.view_count > 0 ? fmtViews(r.view_count) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg border border-app-border/50 bg-app-surface p-6 text-center">
            <p className="text-xs text-app-text-tertiary">暂无发布记录</p>
          </div>
        )}
      </div>

      {/* 刷新提示 */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-app-border/50 bg-app-surface">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-[10px] text-app-text-tertiary">每 {POLL_INTERVAL / 1000} 秒自动刷新</span>
      </div>
    </motion.div>
  );
}
