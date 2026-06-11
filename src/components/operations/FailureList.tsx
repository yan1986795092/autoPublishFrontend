import { motion } from 'framer-motion';
import type { PublishFailure } from '../../types/operations';

interface FailureListProps {
  failures: PublishFailure[];
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + '...' : s;
}

const statusIcon: Record<string, string> = {
  retrying: '⏳',
  manual: '❌',
  auto_fixed: '🔧',
};

const statusLabel: Record<string, string> = {
  retrying: '重试中',
  manual: '需人工',
  auto_fixed: '自动修复',
};

export function FailureList({ failures }: FailureListProps) {
  if (failures.length === 0) {
    return (
      <div className="rounded-lg border border-app-border/50 bg-app-surface p-6 text-center">
        <p className="text-xs text-app-text-tertiary">暂无失败记录</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-app-border/50 bg-app-surface overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-app-border/30 text-app-text-tertiary">
              <th className="text-left py-2 px-3 font-medium">时间</th>
              <th className="text-left py-2 px-3 font-medium">内容标题</th>
              <th className="text-left py-2 px-3 font-medium">目标平台</th>
              <th className="text-left py-2 px-3 font-medium">失败原因</th>
              <th className="text-left py-2 px-3 font-medium">状态</th>
            </tr>
          </thead>
          <tbody>
            {failures.map((f, i) => (
              <motion.tr
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="border-b border-app-border/20 hover:bg-app-elevated/30 transition-colors"
              >
                <td className="py-2 px-3 text-app-text-secondary whitespace-nowrap">{formatTime(f.time)}</td>
                <td className="py-2 px-3 text-app-text max-w-[200px] truncate" title={f.content_title}>
                  {truncate(f.content_title, 50)}
                </td>
                <td className="py-2 px-3 text-app-text-secondary">{f.platform_name}</td>
                <td className="py-2 px-3 text-app-text-secondary" title={f.reason}>
                  {truncate(f.reason, 40)}
                </td>
                <td className="py-2 px-3 whitespace-nowrap">
                  <span className="text-xs">{statusIcon[f.status]} {statusLabel[f.status]}</span>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
