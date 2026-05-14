import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../stores/useAuthStore';
import { useUIStore } from '../stores/useUIStore';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/card';
import { Switch } from '../components/ui/switch';
import { ShortcutHint } from '../components/ui/shortcut-hint';
import { Keyboard } from 'lucide-react';
import { cn } from '../utils/helpers';
import {
  User, Key, Bell, Shield, Save, AlertTriangle, Sun, Moon, Monitor,
  Plus, Trash2, Copy, Check, Eye, EyeOff
} from 'lucide-react';

type SettingsTab = 'profile' | 'notifications' | 'display' | 'api-keys' | 'danger';

const tabs = [
  { id: 'profile' as SettingsTab, label: '个人资料', icon: User },
  { id: 'notifications' as SettingsTab, label: '通知设置', icon: Bell },
  { id: 'display' as SettingsTab, label: '显示设置', icon: Sun },
  { id: 'api-keys' as SettingsTab, label: 'API 密钥', icon: Key },
  { id: 'danger' as SettingsTab, label: '危险区域', icon: AlertTriangle },
];

const themes = [
  { id: 'light' as const, label: '浅色', icon: Sun, desc: '明亮的浅色主题' },
  { id: 'dark' as const, label: '深色', icon: Moon, desc: '护眼的深色主题' },
  { id: 'system' as const, label: '跟随系统', icon: Monitor, desc: '自动匹配系统设置' },
];

type ThemeId = (typeof themes)[number]['id'];

interface ApiKey {
  id: string;
  name: string;
  key: string;
  created_at: string;
  last_used: string | null;
}

export function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const { showToast } = useUIStore();

  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [email] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);

  // Theme
  const [theme, setTheme] = useState<ThemeId>('dark');
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');

  // Notifications
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifPublish, setNotifPublish] = useState(true);
  const [notifAnnounce, setNotifAnnounce] = useState(false);

  // API Keys
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([
    { id: '1', name: '开发环境', key: 'sk-a1b2c3d4e5f6g7h8i9j0', created_at: '2026-01-15', last_used: '2026-05-12' },
  ]);
  const [newKeyName, setNewKeyName] = useState('');
  const [showNewKeyForm, setShowNewKeyForm] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Danger
  const [confirmText, setConfirmText] = useState('');

  // Quota
  const usedPercent = ((user?.quota_used_today ?? 0) / (user?.quota_daily ?? 10)) * 100;

  const handleSaveProfile = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    if (user) setUser({ ...user, nickname });
    showToast('个人资料已保存', 'success');
    setSaving(false);
  };

  const handleCreateKey = () => {
    if (!newKeyName.trim()) return;
    const newKey: ApiKey = {
      id: crypto.randomUUID(),
      name: newKeyName,
      key: `sk-${Array.from({ length: 20 }, () => Math.random().toString(36)[2]).join('')}`,
      created_at: new Date().toISOString().split('T')[0],
      last_used: null,
    };
    setApiKeys((prev) => [...prev, newKey]);
    setNewKeyName('');
    setShowNewKeyForm(false);
    showToast('API 密钥已创建', 'success');
  };

  const handleRevokeKey = (id: string) => {
    if (!confirm('确定要吊销此密钥吗？使用此密钥的应用将立即失效。')) return;
    setApiKeys((prev) => prev.filter((k) => k.id !== id));
    showToast('密钥已吊销', 'success');
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
    showToast('已复制到剪贴板', 'info');
  };

  const maskKey = (key: string, visible: boolean) => {
    if (visible) return key;
    return key.slice(0, 3) + '****' + key.slice(-4);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <Card>
            <CardHeader>
              <CardTitle><User className="w-4 h-4 text-primary-400" /> 个人资料</CardTitle>
              <CardDescription>管理你的账户基本信息</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center text-white text-lg font-bold shadow-sm shadow-primary-600/20">
                  {(nickname || user?.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-app-text">头像</p>
                  <p className="text-[10px] text-app-text-tertiary">使用昵称首字母自动生成</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-app-text-tertiary">昵称</Label>
                  <Input value={nickname} onChange={(e) => setNickname(e.target.value)} className="h-9 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-app-text-tertiary">邮箱</Label>
                  <Input value={email} disabled className="h-9 text-xs" />
                </div>
              </div>

              {/* Quota summary */}
              <div className="rounded-lg bg-app-surface/50 border border-app-border/50 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-app-text-secondary">每日配额</span>
                  <span className="text-xs font-bold text-app-text">{user?.quota_used_today ?? 0} / {user?.quota_daily ?? 10}</span>
                </div>
                <div className="h-1.5 rounded-full bg-app-border overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, usedPercent)}%` }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                  />
                </div>
                <p className="text-[10px] text-app-text-tertiary mt-1.5 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> 配额每天凌晨重置
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveProfile} disabled={saving} size="sm" className="bg-primary-600 hover:bg-primary-500">
                <Save className="h-3.5 w-3.5 mr-1" />{saving ? '保存中...' : '保存更改'}
              </Button>
            </CardFooter>
          </Card>
        );

      case 'notifications':
        return (
          <Card>
            <CardHeader>
              <CardTitle><Bell className="w-4 h-4 text-blue-400" /> 通知设置</CardTitle>
              <CardDescription>管理你希望接收的通知类型</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {[
                { key: 'email', label: '邮件通知', desc: '接收重要更新的邮件通知', checked: notifEmail, onChange: setNotifEmail },
                { key: 'publish', label: '发布通知', desc: '内容发布状态变更时通知', checked: notifPublish, onChange: setNotifPublish },
                { key: 'announce', label: '系统公告', desc: '产品更新和维护公告', checked: notifAnnounce, onChange: setNotifAnnounce },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-app-hover/30 transition-colors">
                  <div>
                    <p className="text-xs font-medium text-app-text">{item.label}</p>
                    <p className="text-[10px] text-app-text-tertiary mt-0.5">{item.desc}</p>
                  </div>
                  <Switch checked={item.checked} onCheckedChange={item.onChange} />
                </div>
              ))}
            </CardContent>
          </Card>
        );

      case 'display':
        return (
          <Card>
            <CardHeader>
              <CardTitle><Sun className="w-4 h-4 text-amber-400" /> 显示设置</CardTitle>
              <CardDescription>自定义界面外观和字体大小</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-[10px] text-app-text-tertiary mb-2 block">主题</Label>
                <div className="grid grid-cols-3 gap-3">
                  {themes.map((t) => {
                    const Icon = t.icon;
                    const selected = theme === t.id;
                    return (
                      <button key={t.id} onClick={() => setTheme(t.id)}
                        className={cn(
                          'relative flex flex-col items-center gap-2 rounded-lg border p-4 transition-all',
                          selected
                            ? 'border-primary-500/50 bg-primary-600/10'
                            : 'border-app-border bg-app-surface hover:border-app-border-light hover:bg-app-hover/30'
                        )}
                      >
                        {selected && (
                          <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary-500 flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                        <Icon className={cn('w-6 h-6', selected ? 'text-primary-400' : 'text-app-text-secondary')} />
                        <span className={cn('text-xs font-medium', selected ? 'text-primary-400' : 'text-app-text')}>{t.label}</span>
                        <span className="text-[9px] text-app-text-tertiary text-center">{t.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <Label className="text-[10px] text-app-text-tertiary mb-2 block">字体大小</Label>
                <div className="flex items-center gap-1 p-1 rounded-lg border border-app-border bg-app-surface w-fit">
                  {(['small', 'medium', 'large'] as const).map((size) => (
                    <button key={size} onClick={() => setFontSize(size)}
                      className={cn(
                        'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                        fontSize === size ? 'bg-app-elevated text-app-text' : 'text-app-text-tertiary hover:text-app-text-secondary'
                      )}
                    >
                      {size === 'small' ? '小' : size === 'medium' ? '中' : '大'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-[10px] text-app-text-tertiary mb-2 block">键盘快捷键</Label>
                <div className="space-y-2 p-3 rounded-lg border border-app-border bg-app-surface/50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-app-text-secondary">新建内容</span>
                    <ShortcutHint keys={['Ctrl', 'N']} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-app-text-secondary">保存</span>
                    <ShortcutHint keys={['Ctrl', 'S']} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-app-text-secondary">快速执行</span>
                    <ShortcutHint keys={['Ctrl', 'Enter']} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-app-text-secondary">打开快捷键说明</span>
                    <ShortcutHint keys={['Ctrl', '/']} />
                  </div>
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent('shortcut:toggle-help'))}
                    className="w-full mt-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] text-primary-400 hover:text-primary-300 hover:bg-primary-600/10 border border-primary-500/20 hover:border-primary-500/30 transition-colors"
                  >
                    <Keyboard className="w-3.5 h-3.5" />
                    打开快捷键面板
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'api-keys':
        return (
          <Card>
            <CardHeader>
              <CardTitle><Key className="w-4 h-4 text-amber-400" /> API 密钥</CardTitle>
              <CardDescription>管理 API 密钥，用于第三方应用集成</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {apiKeys.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Key className="w-8 h-8 text-app-text-tertiary mb-2" />
                  <p className="text-xs text-app-text-secondary mb-1">暂无 API 密钥</p>
                  <p className="text-[10px] text-app-text-tertiary">创建密钥以使用 API 访问</p>
                </div>
              ) : (
                apiKeys.map((apiKey) => {
                  const isVisible = visibleKeys.has(apiKey.id);
                  return (
                    <div key={apiKey.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-app-border bg-app-surface/50 hover:bg-app-hover/20 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-medium text-app-text">{apiKey.name}</span>
                          <span className="text-[9px] text-app-text-tertiary">{apiKey.created_at}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="text-[10px] font-mono text-app-text-secondary bg-app-elevated px-1.5 py-0.5 rounded">
                            {maskKey(apiKey.key, isVisible)}
                          </code>
                          <button onClick={() => setVisibleKeys((prev) => {
                            const next = new Set(prev);
                            if (next.has(apiKey.id)) next.delete(apiKey.id); else next.add(apiKey.id);
                            return next;
                          })}
                            className="text-app-text-tertiary hover:text-app-text-secondary transition-colors"
                          >
                            {isVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                          <button onClick={() => handleCopyKey(apiKey.key)}
                            className="text-app-text-tertiary hover:text-app-text-secondary transition-colors"
                          >
                            {copiedKey === apiKey.key ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                        {apiKey.last_used && (
                          <p className="text-[9px] text-app-text-tertiary mt-0.5">上次使用: {apiKey.last_used}</p>
                        )}
                      </div>
                      <Button size="xs" variant="ghost" onClick={() => handleRevokeKey(apiKey.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 ml-2">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  );
                })
              )}

              {showNewKeyForm ? (
                <div className="flex items-center gap-2 pt-2">
                  <Input value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="密钥名称，如：生产环境"
                    className="h-8 text-xs flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateKey()}
                    autoFocus
                  />
                  <Button size="xs" onClick={handleCreateKey} disabled={!newKeyName.trim()} className="h-8">
                    <Check className="w-3 h-3 mr-1" />确认
                  </Button>
                  <Button size="xs" variant="ghost" onClick={() => { setShowNewKeyForm(false); setNewKeyName(''); }} className="h-8">
                    取消
                  </Button>
                </div>
              ) : (
                <Button size="xs" variant="outline" onClick={() => setShowNewKeyForm(true)}
                  className="h-8 text-xs mt-1">
                  <Plus className="w-3 h-3 mr-1" />创建新密钥
                </Button>
              )}
            </CardContent>
          </Card>
        );

      case 'danger':
        return (
          <Card className="border-red-500/20">
            <CardHeader>
              <CardTitle className="text-red-400"><AlertTriangle className="w-4 h-4" /> 危险区域</CardTitle>
              <CardDescription>以下操作不可逆，请谨慎操作</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-red-400">注销账户</p>
                    <p className="text-[10px] text-app-text-tertiary">永久删除你的账户和所有数据，此操作不可恢复</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] text-app-text-tertiary">输入 <span className="text-red-400 font-medium">确认删除</span> 以继续</Label>
                  <div className="flex items-center gap-2">
                    <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)}
                      placeholder="输入 '确认删除'"
                      className="h-9 text-xs flex-1 border-red-500/30 focus:border-red-500/50 focus:ring-red-500/20"
                    />
                    <Button variant="destructive" size="sm" disabled={confirmText !== '确认删除'}
                      onClick={() => { showToast('此功能尚未开放', 'info'); setConfirmText(''); }}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />注销账户
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
          <Shield className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-app-text">设置</h1>
          <p className="text-[11px] text-app-text-secondary">管理你的账户和偏好设置</p>
        </div>
      </div>

      {/* Tabs + Content */}
      <div className="flex gap-6">
        {/* Side tabs */}
        <div className="flex flex-col gap-0.5 w-36 shrink-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            const isDanger = tab.id === 'danger';
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs font-medium transition-all',
                  active
                    ? isDanger
                      ? 'bg-red-500/10 text-red-400'
                      : 'bg-app-elevated text-app-text'
                    : 'text-app-text-secondary hover:text-app-text hover:bg-app-hover/30'
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
            >
              {renderTabContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
