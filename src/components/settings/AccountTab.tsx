import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../stores/useAuthStore';
import { useUIStore } from '../../stores/useUIStore';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { FormField } from '../ui/form-field';
import { Avatar } from '../ui/avatar';
import { SettingsSection } from './SettingsSection';
import { CardAccent } from './SettingsSection';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { PasswordInput } from '../ui/password-input';
import { PasswordStrength } from '../ui/password-strength';
import { Save, ShieldCheck, Lock, Smartphone, Clock, Globe } from 'lucide-react';
import { cn } from '../../utils/helpers';

function AvatarEditDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, setUser } = useAuthStore();
  const { showToast } = useUIStore();
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 500));
      if (user) setUser({ ...user, avatarUrl });
      showToast('头像已更新', 'success');
      onClose();
    } catch {
      showToast('保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>编辑头像</DialogTitle>
          <DialogDescription>输入图片 URL 来设置头像（留空使用字母头像）</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="flex justify-center">
            {avatarUrl ? (
              <img src={avatarUrl} alt="头像预览" className="w-20 h-20 rounded-xl object-cover border-2 border-app-border" />
            ) : (
              <Avatar name={user?.nickname} email={user?.email} size="xl" />
            )}
          </div>
          <FormField label="图片 URL">
            <Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://example.com/avatar.jpg" />
          </FormField>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={onClose}>取消</Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? '保存中...' : '保存'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProfileContent({ onAvatarClick }: { onAvatarClick: () => void }) {
  const { user, setUser } = useAuthStore();
  const { showToast } = useUIStore();
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [saving, setSaving] = useState(false);
  const [nicknameError, setNicknameError] = useState('');

  const handleSave = async () => {
    if (nickname.length > 20) { setNicknameError('昵称不能超过 20 个字符'); return; }
    if (nickname.length > 0 && nickname.length < 2) { setNicknameError('昵称至少 2 个字符'); return; }
    setNicknameError('');
    setSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 500));
      if (user) setUser({ ...user, nickname });
      showToast('个人资料已保存', 'success');
    } catch {
      showToast('保存失败，请稍后重试', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsSection title="个人资料" description="管理你的账户基本信息">
      <div className="rounded-xl border border-app-border/80 bg-app-surface overflow-hidden">
        <CardAccent />
        <div className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.02] transition-colors">
          <span className="text-xs text-app-text-tertiary w-20 shrink-0">头像</span>
          <Avatar name={nickname || user?.email || ''} email={user?.email} size="md" editable onClick={onAvatarClick} />
          <button onClick={onAvatarClick} className="ml-auto text-xs text-primary-400 hover:text-primary-300 transition-colors">编辑头像</button>
        </div>
        <div className="h-px bg-app-border/50" />
        <div className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.02] transition-colors">
          <span className="text-xs text-app-text-tertiary w-20 shrink-0">昵称</span>
          <div className="flex-1 max-w-xs">
            <Input value={nickname} onChange={(e) => { setNickname(e.target.value); setNicknameError(''); }} error={!!nicknameError} />
            {nicknameError && <p className="text-[10px] text-red-400 mt-1">{nicknameError}</p>}
          </div>
        </div>
        <div className="h-px bg-app-border/50" />
        <div className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.02] transition-colors">
          <span className="text-xs text-app-text-tertiary w-20 shrink-0">邮箱</span>
          <span className="text-sm text-app-text">{user?.email || '—'}</span>
        </div>
        <div className="h-px bg-app-border/50" />
        <div className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.02] transition-colors">
          <span className="text-xs text-app-text-tertiary w-20 shrink-0">账户 ID</span>
          <span className="text-xs font-mono text-app-text-secondary/70">{user?.id || '—'}</span>
        </div>
      </div>
      <div className="flex justify-end pt-1">
        <Button onClick={handleSave} disabled={saving} className="bg-primary-600 hover:bg-primary-500">
          <Save className="w-3.5 h-3.5" />
          {saving ? '保存中...' : '保存更改'}
        </Button>
      </div>
    </SettingsSection>
  );
}

function SecurityContent() {
  const { showToast } = useUIStore();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!currentPassword) errs.currentPassword = '请输入当前密码';
    if (newPassword.length < 8) errs.newPassword = '密码至少 8 个字符';
    if (newPassword.length > 32) errs.newPassword = '密码不能超过 32 个字符';
    if (newPassword !== confirmPassword) errs.confirmPassword = '两次密码不一致';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 800));
      showToast('密码已更新', 'success');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch {
      showToast('密码更新失败，当前密码可能不正确', 'error');
    } finally {
      setSaving(false);
    }
  };

  const isFormValid = currentPassword.length >= 1 && newPassword.length >= 8 && newPassword === confirmPassword;

  return (
    <>
      <SettingsSection title="修改密码" description="更新你的账户密码">
        <div className="rounded-xl border border-app-border/80 bg-app-surface overflow-hidden">
          <CardAccent />
          <div className="px-5 py-4 space-y-3">
            <FormField label="当前密码">
              <PasswordInput
                value={currentPassword}
                onChange={(e) => { setCurrentPassword(e.target.value); setErrors((p) => ({ ...p, currentPassword: '' })); }}
                error={!!errors.currentPassword}
                errorMessage={errors.currentPassword}
                placeholder="输入当前密码"
              />
            </FormField>
            <FormField label="新密码">
              <PasswordInput
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setErrors((p) => ({ ...p, newPassword: '' })); }}
                error={!!errors.newPassword}
                errorMessage={errors.newPassword}
                placeholder="8-32 个字符"
              />
              <PasswordStrength password={newPassword} className="mt-2" />
            </FormField>
            <FormField label="确认新密码">
              <PasswordInput
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setErrors((p) => ({ ...p, confirmPassword: '' })); }}
                error={!!errors.confirmPassword}
                errorMessage={errors.confirmPassword}
                placeholder="再次输入新密码"
              />
            </FormField>
            <div className="flex justify-end pt-1">
              <Button onClick={handleSave} disabled={saving || !isFormValid} className="bg-primary-600 hover:bg-primary-500">
                <Save className="w-3.5 h-3.5" />
                {saving ? '更新中...' : '更新密码'}
              </Button>
            </div>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="安全概览" description="账户的登录历史和安全状态">
        <div className="rounded-xl border border-app-border/80 bg-app-surface overflow-hidden">
          <CardAccent />
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="w-4 h-4 text-app-text-tertiary" />
              <span className="text-sm font-medium text-app-text">账户安全</span>
              <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-green-400 font-medium">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
                </span>
                已保护
              </span>
            </div>
            <div className="space-y-1">
              {[
                { icon: <Clock className="w-3.5 h-3.5" />, label: '账户创建时间', value: '2024 年 1 月 15 日' },
                { icon: <Smartphone className="w-3.5 h-3.5" />, label: '已注册设备', value: '2 台设备' },
                { icon: <Globe className="w-3.5 h-3.5" />, label: '最近登录', value: '今天 14:32 · 北京' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-md hover:bg-white/[0.02] transition-colors">
                  <span className="text-app-text-tertiary">{item.icon}</span>
                  <span className="text-xs text-app-text-tertiary">{item.label}</span>
                  <span className="text-xs text-app-text-secondary ml-auto">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SettingsSection>
    </>
  );
}

export function AccountTab() {
  const [subTab, setSubTab] = useState<'profile' | 'security'>('profile');
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);

  return (
    <div>
      <AvatarEditDialog open={avatarDialogOpen} onClose={() => setAvatarDialogOpen(false)} />

      <div className="flex items-center gap-1 p-1 bg-app-surface rounded-xl border border-app-border/80 mb-8 w-fit">
        {(['profile', 'security'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setSubTab(tab)}
            className={cn(
              'px-4 py-2 rounded-lg text-xs font-medium transition-all',
              subTab === tab ? 'bg-app-elevated text-app-text shadow-sm' : 'text-app-text-tertiary hover:text-app-text-secondary'
            )}
          >
            {tab === 'profile' ? '个人资料' : '账户安全'}
          </button>
        ))}
      </div>

      <motion.div
        key={subTab}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
      >
        {subTab === 'profile' ? (
          <ProfileContent onAvatarClick={() => setAvatarDialogOpen(true)} />
        ) : (
          <SecurityContent />
        )}
      </motion.div>
    </div>
  );
}
