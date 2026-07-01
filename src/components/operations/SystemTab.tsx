import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Activity, Cpu, AlertTriangle, Zap, CheckCircle2, XCircle } from 'lucide-react';
import { operationsApi } from '../../services/api';
import { StatCard } from './StatCard';
import type { SystemMetrics } from '../../types/operations';

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60)   return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  return `${Math.floor(diff / 86400)} 天前`;
}

const POLL_INTERVAL = 30_000;

export function SystemTab() {
  const [data, setData] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetch = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const res = await operationsApi.getSystemMetrics();
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

  const { worker, tasks, llm, recent_failures } = data;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

      {/* KPI 横幅 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          icon={Cpu} label="Worker"
          value={worker.running ? '运行中' : '已停止'}
          color={worker.running ? 'text-green-400' : 'text-red-400'}
        />
        <StatCard
          icon={Activity} label="活跃任务"
          value={tasks.active}
          color="text-blue-400"
          sub="排队 / 执行中"
        />
        <StatCard
          icon={AlertTriangle} label="异常任务"
          value={tasks.failed}
          color={tasks.failed > 0 ? 'text-yellow-400' : 'text-green-400'}
          sub="本月失败"
        />
        <StatCard
          icon={Zap} label="LLM 可用性"
          value={llm.available ? '正常' : '异常'}
          color={llm.available ? 'text-green-400' : 'text-red-400'}
        />
      </div>

      {/* 最近异常 */}
      <div className="rounded-lg border border-app-border/50 bg-app-surface p-4 shadow-sm">
        <h3 className="text-xs font-medium text-app-text mb-4 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
          最近异常
        </h3>
        {recent_failures.length > 0 ? (
          <div className="space-y-2">
            {recent_failures.map((f) => (
              <div key={f.task_id}
                className="flex items-start gap-3 p-3 rounded-lg border border-app-border/50 bg-app-elevated/30 hover:bg-app-elevated/50 transition-colors">
                <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[11px] font-medium text-app-text">{f.task_type}</span>
                    <span className="text-[10px] text-app-text-tertiary">{formatTime(f.time)}</span>
                  </div>
                  <p className="text-[10px] text-app-text-secondary truncate">{f.error}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 py-4 text-xs text-app-text-tertiary">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            近期无异常，一切正常
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
