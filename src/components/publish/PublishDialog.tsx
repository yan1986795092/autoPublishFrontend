import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGeneratorStore } from '../../stores/useGeneratorStore';
import { useUIStore } from '../../stores/useUIStore';
import { publishApi, platformsApi } from '../../services/api';
import { Send, Loader2, AlertCircle, CheckCircle2, FileText, Clock, TrendingUp } from 'lucide-react';
import { cn } from '../../utils/helpers';
import type { PublishResponse, Platform } from '../../types';
import { BestTimeSuggest } from './BestTimeSuggest';

// 平台 emoji 映射（发布可用平台）
const platformEmojis: Record<string, string> = {
  xiaohongshu: '🎨',
  wechat: '📱',
  zhihu: '💡',
};

function getLocalDateTimeISO() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

interface PublishResult {
  type: 'single' | 'batch';
  records: PublishResponse[];
}

export function PublishDialog() {
  const { publishDialogOpen, closePublishDialog, showToast } = useUIStore();
  const { draft } = useGeneratorStore();

  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([draft.platform_code || 'xiaohongshu']);
  const [mode, setMode] = useState<'draft' | 'publish'>('draft');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleTime, setScheduleTime] = useState(getLocalDateTimeISO());
  const [isPublishing, setIsPublishing] = useState(false);
  const [result, setResult] = useState<PublishResult | null>(null);
  const [publishPlatforms, setPublishPlatforms] = useState<Platform[]>([]);

  // Fetch publishable platforms (social_media only)
  useEffect(() => {
    if (publishDialogOpen) {
      platformsApi.list().then((res) => {
        if (res.data.success && res.data.data) {
          setPublishPlatforms(res.data.data.filter((p: Platform) => p.category === 'social_media'));
        }
      }).catch(() => {});
    }
  }, [publishDialogOpen]);

  // Build platform display info from fetched data
  const platformOptions = publishPlatforms.map((p) => ({
    code: p.code,
    name: p.name,
    emoji: platformEmojis[p.code] || '📄',
    desc: p.is_mock ? '示例平台·模拟发布' : '已对接平台',
    gradient: 'from-primary-500 to-primary-600' as const,
  }));

  const togglePlatform = (code: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(code) ? prev.filter((p) => p !== code) : [...prev, code]
    );
  };

  const handlePublish = async () => {
    if (!draft.id) {
      showToast('请先生成内容', 'error');
      return;
    }
    if (selectedPlatforms.length === 0) {
      showToast('请选择至少一个平台', 'error');
      return;
    }

    setIsPublishing(true);
    setResult(null);

    try {
      const effectiveScheduleTime = isScheduled && scheduleTime
        ? new Date(scheduleTime).toISOString()
        : undefined;

      if (selectedPlatforms.length === 1) {
        const res = await publishApi.publish({
          content_id: draft.id,
          platform_code: selectedPlatforms[0],
          publish_mode: mode,
          schedule_time: effectiveScheduleTime,
        });

        if (res.data.success && res.data.data) {
          setResult({ type: 'single', records: [res.data.data] });
          showToast('操作成功', 'success');
        } else {
          showToast(res.data.error?.message || '操作失败', 'error');
        }
      } else {
        const res = await publishApi.batchPublish({
          content_id: draft.id,
          platforms: selectedPlatforms,
          publish_mode: mode,
          schedule_time: effectiveScheduleTime,
        });

        if (res.data.success && res.data.data) {
          setResult({ type: 'batch', records: res.data.data.results });
          showToast(res.data.data.results.every((r) => r.status === 'success')
            ? '全平台发布成功' : '部分平台发布成功', 'success');
        } else {
          showToast(res.data.error?.message || '批量发布失败', 'error');
        }
      }
    } catch {
      showToast('网络错误，请重试', 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleClose = () => {
    closePublishDialog();
    setResult(null);
  };

  const allScheduled = result?.records.every((r) => r.status === 'scheduled');
  const allSuccess = result?.records.every((r) => r.status === 'success');
  const anyFailed = result?.records.some((r) => r.status === 'failed');

  return (
    <Dialog open={publishDialogOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Send className="w-3.5 h-3.5 text-white" />
            </div>
            {isScheduled ? '定时发布' : '发布内容'}
          </DialogTitle>
          <DialogDescription>
            选择目标平台和发布方式
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {!result ? (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-5 py-2"
            >
              {/* Platform Multi-Select */}
              <div className="space-y-2">
                <span className="text-[10px] font-medium text-app-text-tertiary uppercase tracking-wider">
                  目标平台 <span className="text-app-text-tertiary/60">（可多选）</span>
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {platformOptions.map((p) => {
                    const isSelected = selectedPlatforms.includes(p.code);
                    return (
                      <motion.button
                        key={p.code}
                        onClick={() => togglePlatform(p.code)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={cn(
                          'flex flex-col items-center gap-2 p-3.5 rounded-xl border transition-all duration-150',
                          isSelected
                            ? 'border-primary-500/50 bg-primary-600/15'
                            : 'border-app-border bg-app-surface hover:border-app-border-light'
                        )}
                      >
                        <div className={cn(
                          'w-9 h-9 rounded-xl flex items-center justify-center text-xl',
                          isSelected ? `bg-gradient-to-br ${p.gradient}` : 'bg-app-elevated'
                        )}>
                          <span>{p.emoji}</span>
                        </div>
                        <span className={cn(
                          'text-xs font-semibold',
                          isSelected ? 'text-primary-400' : 'text-app-text'
                        )}>
                          {p.name}
                        </span>
                        <span className="text-[9px] text-app-text-tertiary">{p.desc}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Mode Selection */}
              <div className="space-y-2">
                <span className="text-[10px] font-medium text-app-text-tertiary uppercase tracking-wider">发布方式</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'draft', label: '保存草稿', desc: '发布到平台草稿箱', icon: FileText },
                    { value: 'publish', label: '直接发布', desc: '立即发布到平台', icon: Send },
                  ].map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = mode === opt.value;
                    return (
                      <motion.button
                        key={opt.value}
                        onClick={() => setMode(opt.value as 'draft' | 'publish')}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={cn(
                          'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-150',
                          isSelected
                            ? 'border-primary-500/50 bg-primary-600/15'
                            : 'border-app-border bg-app-surface hover:border-app-border-light'
                        )}
                      >
                        <div className={cn(
                          'w-9 h-9 rounded-xl flex items-center justify-center',
                          isSelected ? 'bg-gradient-primary text-white' : 'bg-app-elevated text-app-text-tertiary'
                        )}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className={cn(
                          'text-xs font-semibold',
                          isSelected ? 'text-primary-400' : 'text-app-text'
                        )}>
                          {opt.label}
                        </span>
                        <span className="text-[9px] text-app-text-tertiary">{opt.desc}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Schedule Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-app-surface border border-app-border">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-app-text-tertiary" />
                  <span className="text-xs text-app-text">定时发布</span>
                </div>
                <button
                  onClick={() => setIsScheduled(!isScheduled)}
                  className={cn(
                    'relative w-9 h-5 rounded-full transition-colors',
                    isScheduled ? 'bg-primary-500' : 'bg-white/[0.1]'
                  )}
                >
                  <span className={cn(
                    'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform',
                    isScheduled && 'translate-x-4'
                  )} />
                </button>
              </div>

              {isScheduled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="overflow-hidden"
                >
                  <input
                    type="datetime-local"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full h-9 rounded-lg border border-app-border bg-app-surface px-3 text-[11px] text-app-text outline-none focus:border-primary-500/50"
                  />
                </motion.div>
              )}

              {/* Best time suggestion */}
              <BestTimeSuggest platformCode={selectedPlatforms[0] || 'xiaohongshu'} />

              {/* Content Preview */}
              {draft.title && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-app-surface border border-app-border">
                  <FileText className="w-4 h-4 text-app-text-tertiary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-app-text-tertiary mb-0.5">即将发布</p>
                    <p className="text-xs font-medium text-app-text">{draft.title}</p>
                    <p className="text-[10px] text-app-text-tertiary mt-0.5">
                      {selectedPlatforms.length} 个平台 · {mode === 'draft' ? '草稿' : '直接发布'}
                      {isScheduled && ' · 定时'}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-6 space-y-4"
            >
              <div className="flex flex-col items-center gap-3">
                {allScheduled ? (
                  <div className="w-14 h-14 rounded-full bg-blue-600/20 flex items-center justify-center">
                    <Clock className="w-9 h-9 text-blue-400" />
                  </div>
                ) : allSuccess ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                    className="w-14 h-14 rounded-full bg-green-600/20 flex items-center justify-center"
                  >
                    <CheckCircle2 className="w-9 h-9 text-green-400" />
                  </motion.div>
                ) : anyFailed ? (
                  <div className="w-14 h-14 rounded-full bg-amber-600/20 flex items-center justify-center">
                    <AlertCircle className="w-9 h-9 text-amber-400" />
                  </div>
                ) : null}
                <div className="text-center">
                  <p className="text-base font-semibold text-app-text">
                    {allScheduled && '已定时'}
                    {allSuccess && '发布成功'}
                    {anyFailed && '部分发布失败'}
                  </p>
                  <p className="text-xs text-app-text-secondary mt-1">
                    {allScheduled && '将在指定时间自动发布'}
                    {allSuccess && '内容已成功发布到所选平台'}
                    {anyFailed && '部分平台发布失败，请重试'}
                  </p>
                </div>
              </div>

              {/* Per-platform results */}
              <div className="rounded-xl bg-app-surface border border-app-border divide-y divide-white/[0.04]">
                {result.records.map((r) => (
                  <div key={r.publish_record_id} className="flex items-center justify-between p-3">
                    <span className="text-xs font-medium text-app-text">
                      {platformOptions.find((p) => p.code === r.platform)?.emoji}{' '}
                      {platformOptions.find((p) => p.code === r.platform)?.name || r.platform}
                    </span>
                    <span className={cn(
                      'text-[10px] font-medium',
                      r.status === 'success' && 'text-green-400',
                      r.status === 'scheduled' && 'text-blue-400',
                      r.status === 'failed' && 'text-red-400',
                    )}>
                      {r.status === 'success' && '✅ 成功'}
                      {r.status === 'scheduled' && '⏰ 已定时'}
                      {r.status === 'failed' && '❌ 失败'}
                      {r.status === 'pending' && '⏳ 处理中'}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <DialogFooter>
          {!result ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                取消
              </Button>
              <Button
                variant="gradient"
                onClick={handlePublish}
                disabled={isPublishing || !draft.id || selectedPlatforms.length === 0}
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    发布中...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    {isScheduled ? '定时发布' : mode === 'draft' ? '保存到草稿箱' : '立即发布'}
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button variant="gradient" onClick={handleClose} className="w-full">
              完成
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
