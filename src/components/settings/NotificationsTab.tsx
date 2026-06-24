import { useSettingsStore } from '../../stores/useSettingsStore';
import { Switch } from '../ui/switch';
import { SettingsSection } from './SettingsSection';
import { CardAccent } from './SettingsSection';
import { cn } from '../../utils/helpers';

const NOTIFICATION_GROUPS = [
  {
    group: '发布相关',
    items: [
      {
        id: 'publish',
        label: '内容发布',
        description: '内容发布成功或失败时通知',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2 11 13" /><path d="M22 2 15 22 11 13 2 9l20-7z" />
          </svg>
        ),
      },
      {
        id: 'quota',
        label: '配额警告',
        description: '每日配额即将用完时提醒',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="M12 16h.01" />
          </svg>
        ),
      },
    ],
  },
  {
    group: '账户相关',
    items: [
      {
        id: 'security',
        label: '账户安全',
        description: '异地登录、密码修改等安全事件',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="11" x="3" y="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        ),
      },
      {
        id: 'aiComplete',
        label: 'AI 任务完成',
        description: '长时间运行的任务完成时通知',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
          </svg>
        ),
      },
    ],
  },
  {
    group: '系统相关',
    items: [
      {
        id: 'system',
        label: '系统公告',
        description: '产品更新、功能上线、维护通知',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 11 19-9-9 19-2-8-8-2z" />
          </svg>
        ),
      },
    ],
  },
];

export function NotificationsTab() {
  const { notifications, notificationEmail, setNotification, setNotificationEmail } = useSettingsStore();

  return (
    <div className="space-y-8">
      {/* Email channel */}
      <SettingsSection title="通知渠道" description="选择接收通知的方式">
        <div className="rounded-xl border border-app-border/80 bg-app-surface overflow-hidden">
          <CardAccent />
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-app-text">邮件通知</p>
                <p className="text-[11px] text-app-text-tertiary mt-0.5">通过邮件接收重要通知</p>
              </div>
            </div>
            <Switch checked={notificationEmail} onCheckedChange={setNotificationEmail} />
          </div>
        </div>
      </SettingsSection>

      {/* Notification types */}
      <SettingsSection title="通知类型" description="选择你希望接收的通知内容">
        {NOTIFICATION_GROUPS.map((group) => (
          <div key={group.group}>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-app-text-tertiary/70 mb-2 px-1">
              {group.group}
            </p>
            <div className="rounded-xl border border-app-border/80 bg-app-surface overflow-hidden">
              {group.items.map((item, i) => (
                <div key={item.id}>
                  <div className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-app-elevated flex items-center justify-center shrink-0 text-app-text-tertiary">
                        {item.icon}
                      </div>
                      <div>
                        <p className="text-sm text-app-text font-medium">{item.label}</p>
                        <p className="text-[11px] text-app-text-tertiary mt-0.5">{item.description}</p>
                      </div>
                    </div>
                    <Switch
                      checked={notifications[item.id] ?? false}
                      onCheckedChange={(val) => setNotification(item.id, val)}
                    />
                  </div>
                  {i < group.items.length - 1 && <div className="h-px bg-app-border/50 mx-5" />}
                </div>
              ))}
            </div>
          </div>
        ))}
      </SettingsSection>

      {/* Quiet hours note */}
      <div className="rounded-xl border border-dashed border-app-border/60 p-5 text-center bg-app-surface/30">
        <p className="text-xs text-app-text-tertiary leading-relaxed">
          通知将在 <span className="text-app-text-secondary font-medium">00:00 - 08:00</span> 期间静默，不会发送邮件
        </p>
      </div>
    </div>
  );
}
