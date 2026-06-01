import { useState, useCallback } from 'react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { skillsApi } from '../../services/api';
import { useUIStore } from '../../stores/useUIStore';

const CATEGORIES = [
  { value: 'writing', label: '写作' },
  { value: 'analysis', label: '分析' },
  { value: 'coding', label: '代码' },
  { value: 'research', label: '研究' },
  { value: 'design', label: '设计' },
  { value: 'social', label: '社媒' },
  { value: 'custom', label: '自定义' },
];

const ICONS = ['✍️', '📝', '📕', '📊', '🎬', '✏️', '💡', '📖', '🎯', '🔥', '⭐', '🤖', '🔧', '💻', '🎨'];

interface SkillEditModalProps {
  onSaved?: () => void;
}

export function SkillEditModal({ onSaved }: SkillEditModalProps) {
  const showToast = useUIStore((s) => s.showToast);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'writing',
    icon: '✍️',
    system_prompt: '',
    user_prompt_template: '',
    tags: '',
    author: '',
    version: '',
  });

  const updateField = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) {
      showToast('名称不能为空', 'error');
      return;
    }
    if (!form.system_prompt.trim()) {
      showToast('System Prompt 不能为空', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await skillsApi.create({
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category,
        icon: form.icon,
        system_prompt: form.system_prompt.trim(),
        user_prompt_template: form.user_prompt_template.trim() || undefined,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      });
      if (res.data.success) {
        showToast(`已创建: ${res.data.data.name}`, 'success');
        onSaved?.();
      }
    } catch (e: any) {
      showToast(e?.response?.data?.detail || '保存失败', 'error');
    } finally {
      setSaving(false);
    }
  }, [form, showToast, onSaved]);

  const charCount = form.system_prompt.length;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-app-border bg-app-surface p-4 space-y-4">
        {/* 基本信息 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="mb-1 block text-[10px] font-medium text-app-text-secondary">名称 *</label>
            <Input
              value={form.name}
              onChange={e => updateField('name', e.target.value)}
              placeholder="我的 Skill 名称"
              className="h-8 text-xs"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-medium text-app-text-secondary">分类</label>
            <select
              value={form.category}
              onChange={e => updateField('category', e.target.value)}
              className="w-full h-8 px-2 rounded-lg border border-app-border bg-app-surface text-xs text-app-text"
            >
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-medium text-app-text-secondary">图标</label>
            <div className="flex gap-1 flex-wrap">
              {ICONS.map(icon => (
                <button
                  key={icon}
                  onClick={() => updateField('icon', icon)}
                  className={`w-7 h-7 rounded text-sm flex items-center justify-center transition-colors ${
                    form.icon === icon
                      ? 'bg-blue-500/20 ring-1 ring-blue-500/30'
                      : 'bg-app-elevated hover:bg-app-hover'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-[10px] font-medium text-app-text-secondary">描述</label>
            <Input
              value={form.description}
              onChange={e => updateField('description', e.target.value)}
              placeholder="简短的描述，让用户知道这个 Skill 做什么"
              className="h-8 text-xs"
            />
          </div>
        </div>

        {/* System Prompt */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] font-medium text-app-text-secondary">System Prompt *</label>
            <span className={`text-[9px] ${charCount > 3000 ? 'text-orange-400' : 'text-app-text-tertiary'}`}>
              {charCount} 字
            </span>
          </div>
          <Textarea
            value={form.system_prompt}
            onChange={e => updateField('system_prompt', e.target.value)}
            placeholder={"你是一位专业的写作助手...\n\n写作原则：\n1. ...\n2. ...\n\n输出格式：\n- ..."}
            className="w-full min-h-[200px] text-xs font-mono"
          />
          <p className="mt-1 text-[9px] text-app-text-tertiary">
            告诉 Agent 如何思考和创作。这是 Skill 的核心指令。
          </p>
        </div>

        {/* Prompt 模板 */}
        <div>
          <label className="mb-1 block text-[10px] font-medium text-app-text-secondary">用户 Prompt 模板</label>
          <Textarea
            value={form.user_prompt_template}
            onChange={e => updateField('user_prompt_template', e.target.value)}
            placeholder={'写一篇关于「{topic}」的技术博客...\n要求：\n1. 深度分析\n2. 包含代码示例'}
            className="w-full min-h-[80px] text-xs font-mono"
          />
          <p className="mt-1 text-[9px] text-app-text-tertiary">
            支持 {"{topic}"} {"{content}"} 等占位符，用户输入会填充这里。
          </p>
        </div>

        {/* 标签 + 元信息 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="mb-1 block text-[10px] font-medium text-app-text-secondary">标签（逗号分隔）</label>
            <Input
              value={form.tags}
              onChange={e => updateField('tags', e.target.value)}
              placeholder="技术, 博客, 深度"
              className="h-8 text-xs"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-medium text-app-text-secondary">版本</label>
            <Input
              value={form.version}
              onChange={e => updateField('version', e.target.value)}
              placeholder="1.0.0"
              className="h-8 text-xs"
            />
          </div>
          <div className="col-span-3">
            <label className="mb-1 block text-[10px] font-medium text-app-text-secondary">作者（可选）</label>
            <Input
              value={form.author}
              onChange={e => updateField('author', e.target.value)}
              placeholder="你的名字或机构名"
              className="h-8 text-xs"
            />
          </div>
        </div>
      </div>

      {/* 预览提示 */}
      <div className="rounded-lg border border-app-border bg-app-surface/50 p-3">
        <p className="text-[10px] text-app-text-secondary leading-relaxed">
          <strong className="text-app-text">提示：</strong>创建后可在"选择"页面找到此 Skill，
          点击预览查看完整效果。也可以通过"导入"页面从 URL 导入已有的 SKILL.md 文件。
        </p>
      </div>

      <Button
        onClick={handleSave}
        disabled={saving || !form.name.trim() || !form.system_prompt.trim()}
        className="w-full h-9 text-xs"
      >
        {saving ? '保存中...' : '创建 Skill'}
      </Button>
    </div>
  );
}
