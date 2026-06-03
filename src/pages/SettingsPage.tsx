import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../stores/useAuthStore';
import { useUIStore } from '../stores/useUIStore';
import { authApi } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { OptionChip } from '../components/ui/option-chip';
import { LoadingSpinner } from '../components/ui/loading-spinner';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Card, CardContent } from '../components/ui/card';
import { ShortcutHint } from '../components/ui/shortcut-hint';
import { COMMANDS } from '../config/commands';
import { cn } from '../utils/helpers';
import {
  User, Key, Bell, Save, AlertTriangle, Sun, Moon, Monitor,
  Plus, Trash2, Check, Shield, Keyboard,
  Palette, ChevronRight,
} from 'lucide-react';

type SettingsTab = 'profile' | 'notifications' | 'display' | 'api-keys' | 'danger';

const tabs = [
  { id: 'profile' as SettingsTab, label: '个人资料', icon: User },
  { id: 'notifications' as SettingsTab, label: '通知', icon: Bell },
  { id: 'display' as SettingsTab, label: '显示', icon: Palette },
  { id: 'api-keys' as SettingsTab, label: 'API 密钥', icon: Key },
  { id: 'danger' as SettingsTab, label: '危险区域', icon: AlertTriangle },
];

const themes = [
  { id: 'light' as const, label: '浅色', icon: Sun, desc: '明亮的浅色主题' },
  { id: 'dark' as const, label: '深色', icon: Moon, desc: '护眼的深色主题' },
  { id: 'system' as const, label: '跟随系统', icon: Monitor, desc: '自动匹配系统设置' },
];

type ThemeId = (typeof themes)[number]['id'];

/* ─── Section sub-component ─── */
function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-app-text">{title}</h3>
      {description && <p className="text-xs text-app-text-tertiary mt-0.5">{description}</p>}
    </div>
  );
}

export function SettingsPage() {
  const { user, setUser, isLoading } = useAuthStore();
  const { showToast } = useUIStore();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [nickname, setNickname] = useState(user?.nickname || '');
  const email = user?.email || '';
  const [saving, setSaving] = useState(false);

  // Theme
  const [theme, setTheme] = useState<ThemeId>(
    () =>
      (document.documentElement.getAttribute('data-theme') as ThemeId) || 'dark',
  );
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>(
    () =>
      (document.documentElement.getAttribute('data-font-size') as
        | 'small'
        | 'medium'
        | 'large') || 'medium',
  );

  // Apply theme and font size to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  useEffect(() => {
    document.documentElement.setAttribute('data-font-size', fontSize);
  }, [fontSize]);

  // Notifications
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifPublish, setNotifPublish] = useState(true);
  const [notifAnnounce, setNotifAnnounce] = useState(false);

  // Danger
  const [confirmText, setConfirmText] = useState('');

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 300));
      if (user) setUser({ ...user, nickname });
      showToast('个人资料已保存', 'success');
    } catch {
      showToast('保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const usedPercent =
    ((user?.quota_used_today ?? 0) / (user?.quota_daily ?? 10)) * 100;

  if (isLoading && !user) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center min-h-[300px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 to-primary-500 flex items-center justify-center shadow-sm shadow-primary-600/20">
          <Shield className="w-[18px] h-[18px] text-white" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-app-text">设置</h1>
          <p className="text-xs text-app-text-secondary">管理你的账户和偏好设置</p>
        </div>
      </div>

      {/* ── Tabs + Content ── */}
      <div className="flex gap-8">
        {/* Side tabs */}
        <nav className="flex flex-col gap-0.5 w-36 shrink-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            const isDanger = tab.id === 'danger';
            return (
              <Button
                key={tab.id}
                variant="ghost"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'w-full justify-start gap-2.5 rounded-lg px-3 text-xs',
                  active
                    ? isDanger
                      ? 'bg-red-500/10 text-red-400'
                      : 'bg-primary-600/10 text-primary-400'
                    : 'text-app-text-tertiary hover:text-app-text-secondary hover:bg-white/[0.04]',
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </Button>
            );
          })}
        </nav>

        {/* Content area */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.12 }}
              className="space-y-6"
            >
              {/* ─── PROFILE ─── */}
              {activeTab === 'profile' && (
                <div>
                  <SectionHeader
                    title="个人资料"
                    description="管理你的账户基本信息"
                  />

                  <Card className="bg-app-surface border border-app-border/50 rounded-lg shadow-sm">
                    <CardContent className="p-5 space-y-5">
                      {/* Avatar + name + email row */}
                      <div className="flex items-center gap-4 p-3 rounded-xl bg-app-elevated border border-app-border">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-600 to-primary-500 flex items-center justify-center text-white text-lg font-bold shrink-0">
                          {(nickname || user?.email || 'U')
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-app-text">
                            {(user?.nickname || email || '').split('@')[0]}
                          </p>
                          <p className="text-[11px] text-app-text-tertiary mt-0.5">
                            {email}
                          </p>
                        </div>
                      </div>

                      {/* Form fields — 2-column grid */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-app-text-secondary">
                            昵称
                          </Label>
                          <Input
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            className="h-9 text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-app-text-secondary">
                            邮箱
                          </Label>
                          <Input
                            value={email}
                            disabled
                            className="h-9 text-sm opacity-60"
                          />
                        </div>
                      </div>

                      {/* Save button */}
                      <div className="flex items-center gap-3">
                        <Button
                          onClick={handleSaveProfile}
                          disabled={saving}
                          size="sm"
                          className="bg-primary-600 hover:bg-primary-500"
                        >
                          <Save className="h-3.5 w-3.5 mr-1.5" />
                          {saving ? '保存中...' : '保存更改'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quota */}
                  <div className="mt-6">
                    <SectionHeader
                      title="每日配额"
                      description="每天可用的生成次数，配额在凌晨重置"
                    />
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-app-text-secondary">
                        今日使用
                      </span>
                      <span className="text-sm font-semibold text-app-text">
                        {user?.quota_used_today ?? 0} /{' '}
                        {user?.quota_daily ?? 10}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-app-border overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-400"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, usedPercent)}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ─── NOTIFICATIONS ─── */}
              {activeTab === 'notifications' && (
                <div>
                  <SectionHeader
                    title="通知设置"
                    description="管理你希望接收的通知类型"
                  />

                  <div className="divide-y divide-app-border rounded-xl border border-app-border bg-app-surface overflow-hidden">
                    {[
                      {
                        key: 'email',
                        label: '邮件通知',
                        desc: '接收重要更新的邮件通知',
                        checked: notifEmail,
                        onChange: setNotifEmail,
                      },
                      {
                        key: 'publish',
                        label: '发布通知',
                        desc: '内容发布状态变更时通知',
                        checked: notifPublish,
                        onChange: setNotifPublish,
                      },
                      {
                        key: 'announce',
                        label: '系统公告',
                        desc: '产品更新和维护公告',
                        checked: notifAnnounce,
                        onChange: setNotifAnnounce,
                      },
                    ].map((item) => (
                      <label
                        key={item.key}
                        className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors cursor-pointer"
                      >
                        <div>
                          <p className="text-sm font-medium text-app-text">
                            {item.label}
                          </p>
                          <p className="text-xs text-app-text-tertiary mt-0.5">
                            {item.desc}
                          </p>
                        </div>
                        <Switch
                          checked={item.checked}
                          onCheckedChange={item.onChange}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* ─── DISPLAY ─── */}
              {activeTab === 'display' && (
                <div>
                  <SectionHeader
                    title="显示设置"
                    description="自定义界面外观和字体大小"
                  />

                  {/* Theme — 3 card-style buttons */}
                  <div className="mb-6">
                    <Label className="text-xs text-app-text-secondary mb-3 block">
                      主题
                    </Label>
                    <div className="grid grid-cols-3 gap-3">
                      {themes.map((t) => {
                        const Icon = t.icon;
                        const selected = theme === t.id;
                        return (
                          <button
                            key={t.id}
                            onClick={() => setTheme(t.id)}
                            className={cn(
                              'relative flex flex-col items-center gap-2 rounded-xl border p-4 transition-all',
                              selected
                                ? 'border-primary-500/50 bg-primary-600/[0.08]'
                                : 'border-app-border bg-app-surface hover:border-app-border-light',
                            )}
                          >
                            {selected && (
                              <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary-500 flex items-center justify-center">
                                <Check className="w-2.5 h-2.5 text-white" />
                              </div>
                            )}
                            <Icon
                              className={cn(
                                'w-5 h-5',
                                selected
                                  ? 'text-primary-400'
                                  : 'text-app-text-secondary',
                              )}
                            />
                            <span
                              className={cn(
                                'text-xs font-medium',
                                selected
                                  ? 'text-primary-400'
                                  : 'text-app-text',
                              )}
                            >
                              {t.label}
                            </span>
                            <span className="text-[10px] text-app-text-tertiary text-center leading-tight">
                              {t.desc}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Font size — OptionChip */}
                  <div className="mb-6">
                    <Label className="text-xs text-app-text-secondary mb-3 block">
                      字体大小
                    </Label>
                    <div className="max-w-[260px]">
                      <OptionChip
                        options={[
                          { value: 'small', label: '小' },
                          { value: 'medium', label: '中' },
                          { value: 'large', label: '大' },
                        ]}
                        value={fontSize}
                        onChange={setFontSize}
                      />
                    </div>
                  </div>

                  {/* Keyboard shortcuts */}
                  <div>
                    <Label className="text-xs text-app-text-secondary mb-3 block">
                      键盘快捷键
                    </Label>
                    <div className="space-y-1 rounded-xl border border-app-border bg-app-surface overflow-hidden divide-y divide-app-border">
                      {COMMANDS.map((cmd) => (
                        <div
                          key={cmd.id}
                          className="flex items-center justify-between px-4 py-2.5"
                        >
                          <span className="text-sm text-app-text-secondary">
                            {cmd.title}
                          </span>
                          <ShortcutHint keys={cmd.keys} />
                        </div>
                      ))}
                      <div className="px-4 py-2.5">
                        <button
                          onClick={() =>
                            window.dispatchEvent(
                              new CustomEvent('shortcut:toggle-help'),
                            )
                          }
                          className="inline-flex items-center gap-1.5 text-xs text-primary-400 hover:text-primary-300 transition-colors"
                        >
                          <Keyboard className="w-3.5 h-3.5" />
                          打开快捷键面板
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── API KEYS ─── */}
              {activeTab === 'api-keys' && (
                <div>
                  <SectionHeader
                    title="API 密钥"
                    description="管理 API 密钥，用于第三方应用集成"
                  />

                  {/* Empty state — no mock data */}
                  <div className="flex flex-col items-center py-12 text-center rounded-xl border border-app-border bg-app-surface">
                    <Key className="w-8 h-8 text-app-text-tertiary mb-3" />
                    <p className="text-sm text-app-text-secondary mb-1">
                      暂无 API 密钥
                    </p>
                    <p className="text-xs text-app-text-tertiary mb-4">
                      创建密钥以使用 API 访问
                    </p>
                    <Button variant="ghost-glow" size="sm">
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      创建新密钥
                    </Button>
                  </div>
                </div>
              )}

              {/* ─── DANGER ─── */}
              {activeTab === 'danger' && (
                <div>
                  <SectionHeader
                    title="危险区域"
                    description="以下操作不可逆，请谨慎操作"
                  />

                  <div className="rounded-xl border border-red-500/20 bg-red-500/[0.03] p-5 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-red-500/15 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-[18px] h-[18px] text-red-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-red-400">
                          注销账户
                        </p>
                        <p className="text-xs text-app-text-tertiary mt-0.5 leading-relaxed">
                          永久删除你的账户和所有数据，此操作不可恢复。请确认你已备份所有重要内容。
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-app-text-secondary">
                        输入{' '}
                        <span className="text-red-400 font-medium">
                          确认删除
                        </span>{' '}
                        以继续
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          value={confirmText}
                          onChange={(e) => setConfirmText(e.target.value)}
                          placeholder="输入 '确认删除'"
                          className="h-9 text-sm flex-1 border-red-500/30 focus:border-red-500/50"
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={confirmText !== '确认删除'}
                          onClick={async () => {
                            try {
                              await authApi.deleteAccount();
                              const { logout } = useAuthStore.getState();
                              logout();
                              showToast('账户已注销', 'info');
                              navigate('/login');
                            } catch {
                              showToast('注销失败，请稍后重试', 'error');
                            } finally {
                              setConfirmText('');
                            }
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          注销账户
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
