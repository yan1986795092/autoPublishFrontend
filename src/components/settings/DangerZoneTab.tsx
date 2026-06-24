import { useState } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useUIStore } from '../../stores/useUIStore';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../services/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
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
import { AlertTriangle, Download, Trash2 } from 'lucide-react';
import { cn } from '../../utils/helpers';

export function DangerZoneTab() {
  const { logout } = useAuthStore();
  const { showToast } = useUIStore();
  const navigate = useNavigate();

  const [confirmText, setConfirmText] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await authApi.deleteAccount();
      logout();
      showToast('账户已永久注销', 'info');
      navigate('/login');
    } catch {
      showToast('注销失败，请稍后重试', 'error');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
      setConfirmText('');
    }
  };

  const handleExportData = () => {
    showToast('数据导出功能正在开发中', 'info');
  };

  return (
    <div className="space-y-8">
      <SettingsSection title="数据管理" description="导出或删除你的账户数据">
        {/* Export */}
        <div className="rounded-xl border border-app-border/80 bg-app-surface overflow-hidden">
          <CardAccent />
          <div className="px-5 py-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-app-elevated flex items-center justify-center shrink-0">
                <Download className="w-[18px] h-[18px] text-app-text-tertiary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-app-text">导出账户数据</p>
                <p className="text-[11px] text-app-text-tertiary mt-0.5 leading-relaxed">
                  下载你的所有内容、设置和历史记录。导出的数据以 JSON 格式打包。
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportData}>
              <Download className="w-3.5 h-3.5" />
              导出数据
            </Button>
          </div>
        </div>

        {/* Delete */}
        <div className="rounded-xl border border-red-500/25 bg-red-500/[0.04] overflow-hidden">
          <CardAccent from="from-red-500/60" />
          <div className="px-5 py-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-red-500/15 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-[18px] h-[18px] text-red-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-400">注销账户</p>
                <p className="text-[11px] text-app-text-tertiary mt-0.5 leading-relaxed">
                  永久删除你的账户和所有数据。此操作不可恢复，包括：
                </p>
                <ul className="mt-2 space-y-1">
                  {[
                    '所有已创建的内容',
                    '已发布的历史记录',
                    '账户设置和偏好',
                    'API 密钥和集成配置',
                  ].map((item) => (
                    <li key={item} className="text-[11px] text-app-text-tertiary flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-red-400/40 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] text-app-text-tertiary">
                输入 <span className="text-red-400 font-medium">确认删除</span> 以继续
              </p>
              <div className="flex items-center gap-2">
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="输入 '确认删除'"
                  className={cn(
                    'h-9 text-sm flex-1',
                    confirmText === '确认删除' ? 'border-red-500/50' : ''
                  )}
                />
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={confirmText !== '确认删除'}
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  注销账户
                </Button>
              </div>
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* Final confirmation */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-400">确认注销账户</DialogTitle>
            <DialogDescription>
              此操作将永久删除你的所有数据，且无法恢复。
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 mt-2">
            <p className="text-xs text-red-400/80 leading-relaxed">
              确定要永久注销你的账户吗？此操作不可撤销，所有数据将立即被删除。
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>取消</Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteAccount} disabled={deleting}>
              {deleting ? '注销中...' : '确认注销'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
