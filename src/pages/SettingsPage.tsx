import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../stores/useAuthStore';
import { useUIStore } from '../stores/useUIStore';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { SurfaceCard } from '../components/ui/SurfaceCard';
import { User, Key, Bell, Shield, Save, AlertTriangle } from 'lucide-react';

export function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const { showToast } = useUIStore();

  const [nickname, setNickname] = useState(user?.nickname || '');
  const [email] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    if (user) {
      setUser({ ...user, nickname });
    }
    showToast('个人资料已保存', 'success');
    setSaving(false);
  };

  const usedPercent = ((user?.quota_used_today ?? 0) / (user?.quota_daily ?? 10)) * 100;

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
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

      {/* Profile */}
      <SurfaceCard className="p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-7 h-7 rounded-lg bg-primary-600/20 flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-primary-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-app-text">个人资料</h2>
            <p className="text-[10px] text-app-text-tertiary">管理你的账户基本信息</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary-600/20 border border-primary-500/30 flex items-center justify-center text-white text-lg font-bold">
              {(nickname || user?.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-app-text">头像</p>
              <p className="text-[10px] text-app-text-tertiary">使用昵称首字母自动生成</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] text-app-text-tertiary">昵称</Label>
              <Input value={nickname} onChange={(e) => setNickname(e.target.value)} className="h-9 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] text-app-text-tertiary">邮箱</Label>
              <Input value={email} disabled className="h-9 text-xs" />
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <Button onClick={handleSaveProfile} disabled={saving} size="sm" className="bg-primary-600 hover:bg-primary-500">
              <Save className="h-3.5 w-3.5 mr-1" />{saving ? '保存中...' : '保存更改'}
            </Button>
          </div>
        </div>
      </SurfaceCard>

      {/* Quota */}
      <SurfaceCard className="p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-7 h-7 rounded-lg bg-amber-600/20 flex items-center justify-center">
            <Key className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-app-text">每日配额</h2>
            <p className="text-[10px] text-app-text-tertiary">查看你的 AI 生成配额使用情况</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-app-text-secondary">今日已使用</span>
            <span className="text-sm font-bold text-app-text">
              {user?.quota_used_today ?? 0} / {user?.quota_daily ?? 10} 次
            </span>
          </div>
          <div className="h-2 rounded-full bg-gray-900 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-primary-500"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, usedPercent)}%` }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
            />
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-app-text-tertiary">
            <AlertTriangle className="w-3 h-3" />
            配额每天凌晨重置
          </div>
        </div>
      </SurfaceCard>

      {/* Notifications */}
      <SurfaceCard className="p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-7 h-7 rounded-lg bg-blue-600/20 flex items-center justify-center">
            <Bell className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-app-text">通知设置</h2>
            <p className="text-[10px] text-app-text-tertiary">管理你希望接收的通知类型</p>
          </div>
        </div>
        <div className="space-y-4">
          {[
            { key: 'email', label: '邮件通知', desc: '接收重要更新的邮件通知' },
            { key: 'publish', label: '发布通知', desc: '内容发布状态变更时通知' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between py-2">
              <div>
                <p className="text-xs font-medium text-app-text">{item.label}</p>
                <p className="text-[10px] text-app-text-tertiary">{item.desc}</p>
              </div>
              <div className="w-9 h-5 rounded-full bg-primary-600/30 cursor-pointer relative">
                <motion.div
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-primary-400 shadow"
                  animate={{ x: 4 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </div>
            </div>
          ))}
        </div>
      </SurfaceCard>

      {/* Danger Zone */}
      <SurfaceCard className="border-red-500/20 p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-7 h-7 rounded-lg bg-red-600/20 flex items-center justify-center">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-red-400">危险区域</h2>
            <p className="text-[10px] text-app-text-tertiary">以下操作不可逆，请谨慎操作</p>
          </div>
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg border border-app-border bg-app-surface">
          <div>
            <p className="text-xs font-medium text-app-text">注销账户</p>
            <p className="text-[10px] text-app-text-tertiary">永久删除你的账户和所有数据</p>
          </div>
          <Button variant="destructive" size="sm" disabled>
            注销账户
          </Button>
        </div>
      </SurfaceCard>
    </div>
  );
}
