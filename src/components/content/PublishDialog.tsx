import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Separator } from '../ui/separator';
import { LoadingSpinner } from '../ui/loading-spinner';
import { useUIStore } from '../../stores/useUIStore';
import { publishApi, contentsApi } from '../../services/api';
import { ALL_PLATFORMS } from '../agent/PlatformSelector';
import { cn } from '../../utils/helpers';
import { Send, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface PublishResult {
  platform: string;
  status: 'pending' | 'success' | 'failed';
  url?: string;
  error?: string;
}

export function PublishDialog() {
  const { publishDialogOpen, publishDialogContentId, closePublishDialog, showToast } = useUIStore();

  const [contentTitle, setContentTitle] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set());
  const [publishMode, setPublishMode] = useState<'publish' | 'draft'>('publish');
  const [publishing, setPublishing] = useState(false);
  const [results, setResults] = useState<PublishResult[]>([]);

  // Reset state when dialog opens
  useEffect(() => {
    if (publishDialogOpen && publishDialogContentId) {
      setSelectedPlatforms(new Set());
      setPublishMode('publish');
      setPublishing(false);
      setResults([]);
      // Load content title
      contentsApi.get(publishDialogContentId).then(res => {
        if (res.data.success && res.data.data) {
          setContentTitle(res.data.data.title || '无标题');
        }
      }).catch(() => setContentTitle('未知内容'));
    }
  }, [publishDialogOpen, publishDialogContentId]);

  const togglePlatform = (id: string) => {
    const next = new Set(selectedPlatforms);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedPlatforms(next);
  };

  const handlePublish = async () => {
    if (!publishDialogContentId || selectedPlatforms.size === 0) return;
    setPublishing(true);
    setResults([]);

    const platformList = Array.from(selectedPlatforms);
    const newResults: PublishResult[] = platformList.map(p => ({ platform: p, status: 'pending' }));
    setResults(newResults);

    try {
      if (platformList.length === 1) {
        // Single publish
        const res = await publishApi.publish({
          content_id: publishDialogContentId,
          platform_code: platformList[0],
          publish_mode: publishMode,
        });
        newResults[0] = {
          platform: platformList[0],
          status: res.data.success ? 'success' : 'failed',
          url: res.data.data?.platform_url,
          error: res.data.success ? undefined : '发布失败',
        };
      } else {
        // Batch publish
        const res = await publishApi.batchPublish({
          content_id: publishDialogContentId,
          platforms: platformList,
          publish_mode: publishMode,
        });
        if (res.data.success && res.data.data?.results) {
          res.data.data.results.forEach((r, i) => {
            if (i < newResults.length) {
              newResults[i] = {
                platform: r.platform || platformList[i],
                status: r.status === 'published' ? 'success' : 'failed',
                url: r.platform_url,
                error: r.status === 'published' ? undefined : '发布失败',
              };
            }
          });
        }
      }
    } catch (e: unknown) {
      const msg = (e as Error)?.message || '发布请求失败';
      newResults.forEach((r, i) => {
        if (r.status === 'pending') newResults[i] = { ...r, status: 'failed', error: msg };
      });
    }

    setResults([...newResults]);
    const allSuccess = newResults.every(r => r.status === 'success');
    if (allSuccess) {
      showToast(`已成功发布到 ${newResults.length} 个平台`, 'success');
      setTimeout(() => closePublishDialog(), 1500);
    }
    setPublishing(false);
  };

  const publishablePlatforms = ALL_PLATFORMS.filter(p => p.category === 'publishable');

  return (
    <Dialog open={publishDialogOpen} onOpenChange={(open) => { if (!open) closePublishDialog(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Send className="w-4 h-4 text-primary-400" />
            发布内容
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Content info */}
          <div className="rounded-lg border border-app-border bg-app-surface p-3">
            <p className="text-xs text-app-text-secondary line-clamp-1">{contentTitle}</p>
          </div>

          {/* Platform selector */}
          <div>
            <p className="text-xs font-medium text-app-text-secondary mb-2">选择发布平台</p>
            <div className="grid grid-cols-2 gap-2">
              {publishablePlatforms.map((p) => {
                const isSelected = selectedPlatforms.has(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => togglePlatform(p.id)}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs transition-colors text-left',
                      isSelected
                        ? 'border-green-500/50 bg-green-500/10 text-app-text'
                        : 'border-app-border text-app-text-secondary hover:border-app-border/50 hover:text-app-text'
                    )}
                  >
                    <span className="text-base">{p.icon}</span>
                    <span className="flex-1">{p.label}</span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                  </button>
                );
              })}
            </div>
            {publishablePlatforms.length === 0 && (
              <p className="text-[10px] text-app-text-tertiary">没有可发布的平台</p>
            )}
          </div>

          <Separator />

          {/* Publish mode */}
          <div className="flex items-center justify-between rounded-lg border border-app-border bg-app-surface px-4 py-3">
            <div>
              <p className="text-xs font-medium text-app-text">发布模式</p>
              <p className="text-[10px] text-app-text-tertiary">
                {publishMode === 'publish' ? '立即发布到所选平台' : '存入平台草稿箱，稍后手动发布'}
              </p>
            </div>
            <Switch
              checked={publishMode === 'publish'}
              onCheckedChange={(v) => setPublishMode(v ? 'publish' : 'draft')}
            />
          </div>

          {/* Publish button */}
          <Button
            onClick={handlePublish}
            disabled={selectedPlatforms.size === 0 || publishing}
            className="w-full"
          >
            {publishing ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />发布中...</>
            ) : (
              <><Send className="w-4 h-4 mr-2" />发布到 {selectedPlatforms.size} 个平台</>
            )}
          </Button>

          {/* Results */}
          {results.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-1.5"
            >
              <p className="text-[10px] font-medium text-app-text-tertiary">发布结果</p>
              {results.map((r, i) => {
                const platform = publishablePlatforms.find(p => p.id === r.platform);
                return (
                  <div
                    key={i}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-3 py-2 text-xs',
                      r.status === 'success' ? 'border-green-500/30 bg-green-500/5' :
                      r.status === 'failed' ? 'border-red-500/30 bg-red-500/5' :
                      'border-app-border bg-app-surface'
                    )}
                  >
                    <span>{platform?.icon || '📄'}</span>
                    <span className="flex-1 text-app-text-secondary">{platform?.label || r.platform}</span>
                    {r.status === 'pending' && <Loader2 className="w-3.5 h-3.5 animate-spin text-app-text-tertiary" />}
                    {r.status === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />}
                    {r.status === 'failed' && (
                      <span className="text-red-400 text-[10px]" title={r.error}>失败</span>
                    )}
                    {r.url && (
                      <a href={r.url} target="_blank" rel="noreferrer" className="text-primary-400 hover:underline text-[10px]">查看</a>
                    )}
                  </div>
                );
              })}
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
