import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '../../stores/useUIStore';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { FormField } from '../ui/form-field';
import { SettingsSection } from './SettingsSection';
import { CardAccent } from './SettingsSection';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Link,
  Unlink,
  Check,
  AlertCircle,
} from 'lucide-react';
import { cn } from '../../utils/helpers';

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_PLATFORMS = [
  {
    id: 'wechat',
    name: '微信公众号',
    icon: 'W',
    color: '#07c160',
    connected: true,
    lastSynced: '2024-06-24T10:30:00',
    account: 'AutoPublish Official',
  },
  {
    id: 'xiaohongshu',
    name: '小红书',
    icon: 'X',
    color: '#ff2442',
    connected: true,
    lastSynced: '2024-06-24T08:15:00',
    account: 'AI内容助手',
  },
  {
    id: 'zhihu',
    name: '知乎',
    icon: 'Z',
    color: '#0066ff',
    connected: false,
    lastSynced: undefined,
    account: undefined,
  },
  {
    id: 'bilibili',
    name: 'B站',
    icon: 'B',
    color: '#00a1d6',
    connected: false,
    lastSynced: undefined,
    account: undefined,
  },
  {
    id: 'douyin',
    name: '抖音',
    icon: 'D',
    color: '#fe2c55',
    connected: false,
    lastSynced: undefined,
    account: undefined,
  },
];

const MOCK_API_KEYS = [
  {
    id: 'key_1',
    name: '生产环境 Key',
    prefix: 'apk_live_',
    mask: 'apk_live_••••••••••••3f8a',
    permissions: ['read', 'write', 'publish'],
    createdAt: '2024-06-01',
    lastUsedAt: '2024-06-24T14:32:00',
  },
  {
    id: 'key_2',
    name: '测试环境 Key',
    prefix: 'apk_test_',
    mask: 'apk_test_••••••••••••7b2c',
    permissions: ['read'],
    createdAt: '2024-05-15',
    lastUsedAt: '2024-06-20T09:10:00',
  },
];

const PERMISSION_LABELS: Record<string, string> = {
  read: '读取',
  write: '写入',
  publish: '发布',
};

// ─── Create API Key Dialog ─────────────────────────────────────────────────────

function CreateApiKeyDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { showToast } = useUIStore();
  const [name, setName] = useState('');
  const [permissions, setPermissions] = useState<string[]>(['read']);
  const [creating, setCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const togglePermission = (perm: string) => {
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    await new Promise((r) => setTimeout(r, 1000));
    setCreatedKey(`apk_live_${Math.random().toString(36).slice(2, 18)}`);
    setCreating(false);
  };

  const handleCopy = async () => {
    if (!createdKey) return;
    await navigator.clipboard.writeText(createdKey);
    setCopied(true);
    showToast('已复制到剪贴板', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setName('');
    setPermissions(['read']);
    setCreatedKey(null);
    setCopied(false);
    onClose();
  };

  const allPerms = ['read', 'write', 'publish'];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>创建 API 密钥</DialogTitle>
          <DialogDescription>
            密钥只在创建时显示一次，请妥善保存
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {!createdKey ? (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4 mt-2"
            >
              <FormField label="密钥名称">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如：生产环境密钥"
                />
              </FormField>

              <FormField label="权限范围">
                <div className="flex flex-wrap gap-2 mt-1">
                  {allPerms.map((perm) => {
                    const selected = permissions.includes(perm);
                    return (
                      <button
                        key={perm}
                        onClick={() => togglePermission(perm)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                          selected
                            ? 'border-primary-500/50 bg-primary-500/10 text-primary-400'
                            : 'border-app-border bg-app-surface text-app-text-secondary hover:border-app-border-light'
                        )}
                      >
                        {PERMISSION_LABELS[perm]}
                      </button>
                    );
                  })}
                </div>
              </FormField>

              <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 flex gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-400/80 leading-relaxed">
                  创建后请立即复制密钥，关闭此窗口后将无法再次查看
                </p>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="ghost" size="sm" onClick={handleClose}>
                  取消
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreate}
                  disabled={creating || !name.trim() || permissions.length === 0}
                  className="bg-primary-600 hover:bg-primary-500"
                >
                  {creating ? '创建中...' : '创建密钥'}
                </Button>
              </DialogFooter>
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 mt-2"
            >
              <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3 flex gap-2">
                <Check className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                <p className="text-xs text-green-400/80 leading-relaxed">
                  密钥已创建成功，请立即复制并妥善保存
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-app-text-secondary">你的密钥</Label>
                <div className="flex gap-2">
                  <Input
                    value={createdKey}
                    readOnly
                    className="font-mono text-xs bg-app-elevated"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopy}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <DialogFooter>
                <Button size="sm" onClick={handleClose}>
                  完成
                </Button>
              </DialogFooter>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

// ─── Integrations Tab ────────────────────────────────────────────────────────

export function IntegrationsTab() {
  const { showToast } = useUIStore();
  const [platforms, setPlatforms] = useState(MOCK_PLATFORMS);
  const [apiKeys, setApiKeys] = useState(MOCK_API_KEYS);
  const [showKey, setShowKey] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [revokeConfirm, setRevokeConfirm] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const togglePlatform = async (id: string) => {
    const platform = platforms.find((p) => p.id === id);
    if (!platform) return;

    if (platform.connected) {
      setPlatforms((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, connected: false, account: undefined } : p
        )
      );
      showToast(`已断开 ${platform.name}`, 'info');
    } else {
      setPlatforms((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                connected: true,
                account: 'Demo Account',
                lastSynced: new Date().toISOString(),
              }
            : p
        )
      );
      showToast(`已连接 ${platform.name}`, 'success');
    }
  };

  const handleCopyKey = async (key: (typeof MOCK_API_KEYS)[0]) => {
    const fullKey = key.prefix + Math.random().toString(36).slice(2, 18);
    await navigator.clipboard.writeText(fullKey);
    setCopied(key.id);
    showToast('已复制到剪贴板', 'success');
    setTimeout(() => setCopied(null), 2000);
  };

  const handleRevoke = (keyId: string) => {
    setApiKeys((prev) => prev.filter((k) => k.id !== keyId));
    setRevokeConfirm(null);
    showToast('密钥已吊销', 'info');
  };

  return (
    <div className="space-y-8">
      <SettingsSection title="已连接平台" description="管理你的第三方平台账号授权">
        <div className="rounded-xl border border-app-border/80 bg-app-surface overflow-hidden">
          {platforms.map((platform, idx) => (
            <div key={platform.id}>
              {idx === 0 && <CardAccent />}
              <div className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ backgroundColor: platform.color }}
                >
                  {platform.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-app-text">{platform.name}</p>
                  {platform.connected && platform.account ? (
                    <p className="text-[11px] text-app-text-tertiary mt-0.5 truncate">{platform.account}</p>
                  ) : (
                    <p className="text-[11px] text-app-text-tertiary mt-0.5">未连接</p>
                  )}
                </div>
                {platform.connected ? (
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-green-400 flex items-center gap-1.5">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
                      </span>
                      已连接
                    </span>
                    <Button variant="ghost" size="xs" onClick={() => togglePlatform(platform.id)} className="text-app-text-tertiary hover:text-red-400">
                      <Unlink className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ) : (
                  <Button variant="ghost-glow" size="xs" onClick={() => togglePlatform(platform.id)}>
                    <Link className="w-3.5 h-3.5" />
                    连接
                  </Button>
                )}
              </div>
              {idx < platforms.length - 1 && <div className="h-px bg-app-border/50 mx-5" />}
            </div>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection
        title="API 密钥"
        description="创建和管理 API 访问密钥，用于第三方应用集成"
      >
        {apiKeys.length === 0 ? (
          <div className="rounded-xl border border-dashed border-app-border/60 bg-app-surface/30 p-10 text-center">
            <Key className="w-8 h-8 text-app-text-tertiary mx-auto mb-3" />
            <p className="text-sm text-app-text-secondary mb-1">暂无 API 密钥</p>
            <p className="text-xs text-app-text-tertiary mb-5">创建密钥以通过 API 访问你的账户</p>
            <Button variant="ghost-glow" size="sm" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-3.5 h-3.5" />
              创建密钥
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-app-border/80 bg-app-surface overflow-hidden">
            {apiKeys.map((key, idx) => (
              <div key={key.id}>
                {idx === 0 && <CardAccent />}
                <div className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-app-elevated flex items-center justify-center shrink-0">
                      <Key className="w-4 h-4 text-app-text-tertiary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-app-text font-medium">{key.name}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <code className="text-[11px] font-mono text-app-text-tertiary">
                          {showKey === key.id ? key.prefix + Math.random().toString(36).slice(2, 18) : key.mask}
                        </code>
                        <button onClick={() => setShowKey(showKey === key.id ? null : key.id)} className="text-app-text-tertiary hover:text-app-text-secondary transition-colors">
                          {showKey === key.id ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                        <button onClick={() => handleCopyKey(key)} className="text-app-text-tertiary hover:text-app-text-secondary transition-colors">
                          {copied === key.id ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex gap-1">
                          {key.permissions.map((perm) => (
                            <span key={perm} className="px-1.5 py-0.5 rounded bg-app-elevated text-[10px] text-app-text-tertiary">{PERMISSION_LABELS[perm]}</span>
                          ))}
                        </div>
                        <span className="text-[10px] text-app-text-tertiary">
                          {key.lastUsedAt ? `最后使用 ${new Date(key.lastUsedAt).toLocaleDateString('zh-CN')}` : `创建于 ${new Date(key.createdAt).toLocaleDateString('zh-CN')}`}
                        </span>
                      </div>
                    </div>
                    {revokeConfirm === key.id ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="xs" onClick={() => setRevokeConfirm(null)}>取消</Button>
                        <Button variant="destructive" size="xs" onClick={() => handleRevoke(key.id)}>确认吊销</Button>
                      </div>
                    ) : (
                      <button onClick={() => setRevokeConfirm(key.id)} className="text-app-text-tertiary hover:text-red-400 transition-colors p-1 rounded shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                {idx < apiKeys.length - 1 && <div className="h-px bg-app-border/50 mx-5" />}
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-end pt-1">
          <Button variant="ghost-glow" size="sm" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="w-3.5 h-3.5" />
            新建密钥
          </Button>
        </div>
      </SettingsSection>

      <CreateApiKeyDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
      />
    </div>
  );
}
