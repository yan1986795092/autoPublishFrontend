import { motion } from 'framer-motion';
import { useAuthStore } from '../../stores/useAuthStore';
import { Avatar } from '../ui/avatar';
import { cn } from '../../utils/helpers';

interface AccountCardProps {
  onAvatarClick?: () => void;
}

export function AccountCard({ onAvatarClick }: AccountCardProps) {
  const { user } = useAuthStore();

  const usedPercent =
    ((user?.quota_used_today ?? 0) / (user?.quota_daily ?? 10)) * 100;
  const isNearLimit = usedPercent >= 80;

  return (
    <div className="rounded-xl border border-app-border/80 bg-app-surface overflow-hidden">
      {/* Gradient top border accent */}
      <div className="h-px bg-gradient-to-r from-transparent via-primary-500/50 to-transparent" />

      <div className="p-4">
        {/* Avatar + identity row */}
        <div className="flex items-center gap-3 mb-4">
          <Avatar
            name={user?.nickname}
            email={user?.email}
            size="md"
            editable
            onClick={onAvatarClick}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-app-text truncate">
                {user?.nickname || user?.email?.split('@')[0] || '未设置昵称'}
              </h2>
              {/* Online indicator */}
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
            </div>
            <p className="text-xs text-app-text-tertiary truncate mt-0.5">
              {user?.email || ''}
            </p>
          </div>
        </div>

        {/* Quota */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-app-text-tertiary">今日配额</span>
              {isNearLimit && (
                <span className="inline-flex items-center gap-0.5 text-[9px] text-yellow-400 font-medium">
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 9v4m0 4h.01M12 2L2 22h20L12 2z" />
                  </svg>
                  快用完
                </span>
              )}
            </div>
            <span className="text-[11px] font-semibold text-app-text tabular-nums">
              <span className={cn(isNearLimit && 'text-yellow-400')}>
                {user?.quota_used_today ?? 0}
              </span>
              <span className="text-app-text-tertiary font-normal">
                {' / '}{user?.quota_daily ?? 10}
              </span>
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 rounded-full bg-app-border overflow-hidden">
            <motion.div
              className={cn(
                'h-full rounded-full transition-colors',
                usedPercent >= 90
                  ? 'bg-red-500'
                  : usedPercent >= 70
                  ? 'bg-yellow-500'
                  : 'bg-gradient-to-r from-primary-500 to-primary-400'
              )}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, usedPercent)}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.15 }}
            />
          </div>

          {/* Percent label */}
          <div className="flex justify-end">
            <span className={cn(
              'text-[9px] tabular-nums',
              isNearLimit ? 'text-yellow-400/80' : 'text-app-text-tertiary/60'
            )}>
              {Math.round(usedPercent)}% 已使用
            </span>
          </div>
        </div>
      </div>

      {/* Bottom stats row */}
      <div className="border-t border-app-border/50 px-4 py-2.5 flex items-center justify-between bg-app-elevated/40">
        <div className="text-center">
          <p className="text-[10px] text-app-text-tertiary">账户 ID</p>
          <p className="text-[10px] font-mono text-app-text-secondary/70 mt-0.5">
            {user?.id ? `#${user.id.slice(0, 6)}` : '—'}
          </p>
        </div>
        <div className="w-px h-6 bg-app-border/50" />
        <div className="text-center">
          <p className="text-[10px] text-app-text-tertiary">账户状态</p>
          <p className="text-[10px] text-green-400/90 font-medium mt-0.5 flex items-center justify-center gap-1">
            <span className="w-1 h-1 rounded-full bg-green-400" />
            正常
          </p>
        </div>
      </div>
    </div>
  );
}
