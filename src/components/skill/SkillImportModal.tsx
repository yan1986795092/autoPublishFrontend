import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { Textarea } from '../ui/textarea';
import { skillsApi } from '../../services/api';
import { useUIStore } from '../../stores/useUIStore';
import type { Skill } from '../../types';
import { ExternalLink, Upload, Globe, FileText, CheckCircle, AlertTriangle } from 'lucide-react';

interface SkillImportModalProps {
  onImported?: () => void;
}

type ImportMode = 'url' | 'file' | 'paste';

export function SkillImportModal({ onImported }: SkillImportModalProps) {
  const showToast = useUIStore((s) => s.showToast);
  const [mode, setMode] = useState<ImportMode>('url');
  const [url, setUrl] = useState('');
  const [urlNameOverride, setUrlNameOverride] = useState('');
  const [pasteContent, setPasteContent] = useState('');
  const [pasteFileName, setPasteFileName] = useState('SKILL.md');
  const [preview, setPreview] = useState<Skill | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const handlePreview = useCallback(async () => {
    if (!pasteContent.trim()) return;
    setPreviewLoading(true);
    setPreview(null);
    try {
      const res = await skillsApi.previewImport(pasteContent.trim(), pasteFileName);
      if (res.data.success) {
        setPreview(res.data.data as unknown as Skill);
      }
    } catch (e: any) {
      showToast(e?.response?.data?.detail || '预览失败', 'error');
    } finally {
      setPreviewLoading(false);
    }
  }, [pasteContent, pasteFileName, showToast]);

  const handleUrlImport = useCallback(async () => {
    if (!url.trim()) return;
    setImporting(true);
    try {
      const res = await skillsApi.importUrl(url.trim(), urlNameOverride.trim() || undefined);
      if (res.data.success) {
        showToast(`成功导入: ${res.data.data.name}`, 'success');
        onImported?.();
      }
    } catch (e: any) {
      showToast(e?.response?.data?.detail || '导入失败', 'error');
    } finally {
      setImporting(false);
    }
  }, [url, urlNameOverride, showToast, onImported]);

  const handleFileImport = useCallback(async () => {
    if (!pasteContent.trim()) return;
    setImporting(true);
    try {
      const res = await skillsApi.importFile(pasteContent.trim(), pasteFileName);
      if (res.data.success) {
        showToast(`成功导入: ${res.data.data.name}`, 'success');
        onImported?.();
      }
    } catch (e: any) {
      showToast(e?.response?.data?.detail || '导入失败', 'error');
    } finally {
      setImporting(false);
    }
  }, [pasteContent, pasteFileName, showToast, onImported]);

  return (
    <div className="space-y-4">
      {/* 说明 */}
      <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 space-y-1">
        <p className="text-xs font-medium text-blue-400">支持导入格式</p>
        <ul className="text-[10px] text-app-text-secondary space-y-0.5">
          <li>• <strong>SKILL.md</strong> — Cursor/Cline 风格的 skill 文件（YAML frontmatter + markdown）</li>
          <li>• <strong>Skill JSON</strong> — 纯 JSON 格式的 skill 定义</li>
          <li>• 支持从 GitHub Raw URL、Gist URL 直接导入</li>
        </ul>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-app-surface border border-app-border">
        {([
          { key: 'url', label: 'URL 导入', icon: Globe },
          { key: 'paste', label: '粘贴文件', icon: FileText },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors ${
              mode === key
                ? 'bg-app-elevated text-app-text shadow-sm'
                : 'text-app-text-secondary hover:text-app-text'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* URL mode */}
      {mode === 'url' && (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[10px] font-medium text-app-text-secondary">
              Skill URL
            </label>
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://raw.githubusercontent.com/.../SKILL.md"
              className="w-full px-3 py-2 rounded-lg border border-app-border bg-app-surface text-xs text-app-text placeholder:text-app-text-tertiary focus:border-blue-500/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-medium text-app-text-secondary">
              名称覆盖（可选）
            </label>
            <input
              value={urlNameOverride}
              onChange={e => setUrlNameOverride(e.target.value)}
              placeholder="留空则使用原名称"
              className="w-full px-3 py-2 rounded-lg border border-app-border bg-app-surface text-xs text-app-text placeholder:text-app-text-tertiary focus:border-blue-500/50 focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleUrlImport}
              disabled={!url.trim() || importing}
              size="sm"
              className="flex-1 h-8 text-xs"
            >
              {importing ? '导入中...' : '导入'}
            </Button>
          </div>
          <div className="rounded-lg border border-app-border bg-app-surface p-3 space-y-2">
            <p className="text-[10px] font-medium text-app-text-secondary">示例 URL</p>
            <div className="space-y-1.5">
              {[
                { label: 'GitHub Raw', url: 'https://raw.githubusercontent.com/.../SKILL.md' },
                { label: 'GitHub Raw (JSON)', url: 'https://raw.githubusercontent.com/.../skill.json' },
              ].map(ex => (
                <button
                  key={ex.label}
                  onClick={() => setUrl(ex.url)}
                  className="w-full flex items-center gap-2 text-left px-2 py-1.5 rounded border border-app-border/50 bg-app-elevated hover:bg-app-hover transition-colors"
                >
                  <ExternalLink className="w-3 h-3 text-app-text-tertiary flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] font-medium text-app-text">{ex.label}</span>
                    <p className="text-[9px] text-app-text-tertiary truncate">{ex.url}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Paste mode */}
      {mode === 'paste' && (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[10px] font-medium text-app-text-secondary">
              文件名
            </label>
            <input
              value={pasteFileName}
              onChange={e => setPasteFileName(e.target.value)}
              placeholder="SKILL.md"
              className="w-full px-3 py-2 rounded-lg border border-app-border bg-app-surface text-xs text-app-text placeholder:text-app-text-tertiary focus:border-blue-500/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-medium text-app-text-secondary">
              Skill 内容
            </label>
            <Textarea
              value={pasteContent}
              onChange={e => setPasteContent(e.target.value)}
              placeholder="粘贴 SKILL.md 或 skill JSON 内容..."
              className="w-full min-h-[150px] text-xs font-mono"
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handlePreview}
              disabled={!pasteContent.trim() || previewLoading}
              variant="outline"
              size="sm"
              className="h-8 text-xs"
            >
              预览
            </Button>
            <Button
              onClick={handleFileImport}
              disabled={!pasteContent.trim() || importing}
              size="sm"
              className="flex-1 h-8 text-xs"
            >
              {importing ? '导入中...' : '导入'}
            </Button>
          </div>

          {/* Preview */}
          {preview && (
            <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                <span className="text-xs font-medium text-green-400">预览成功</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div>
                  <span className="text-app-text-tertiary">名称:</span>
                  <span className="ml-1 text-app-text">{preview.name}</span>
                </div>
                <div>
                  <span className="text-app-text-tertiary">分类:</span>
                  <span className="ml-1 text-app-text">{preview.category}</span>
                </div>
                <div>
                  <span className="text-app-text-tertiary">图标:</span>
                  <span className="ml-1">{preview.icon}</span>
                </div>
                <div>
                  <span className="text-app-text-tertiary">来源:</span>
                  <span className="ml-1 text-app-text">{preview.source}</span>
                </div>
              </div>
              {preview.tags && preview.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {preview.tags.map((t: string) => (
                    <span key={t} className="text-[9px] text-app-text-tertiary bg-app-border/30 px-1.5 py-0.5 rounded">{t}</span>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-app-text-secondary line-clamp-2">{preview.description}</p>
              {preview.preset_plan && (
                <div className="text-[10px] text-app-text-tertiary">
                  流程: {((preview as any).preset_plan?.agent_sequence || []).join(' → ')}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
