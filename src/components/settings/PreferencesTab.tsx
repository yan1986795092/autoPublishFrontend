import { useSettingsStore } from '../../stores/useSettingsStore';
import { COMMANDS } from '../../config/commands';
import { ShortcutHint } from '../ui/shortcut-hint';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { SettingsSection } from './SettingsSection';
import { CardAccent } from './SettingsSection';
import { Keyboard, ChevronRight } from 'lucide-react';

const LANGUAGES = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en-US', label: 'English' },
];

export function PreferencesTab() {
  const { language, setLanguage } = useSettingsStore();

  return (
    <div className="space-y-8">
      <SettingsSection title="语言" description="选择界面的显示语言">
        <div className="rounded-xl border border-app-border/80 bg-app-surface overflow-hidden">
          <CardAccent />
          <div className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors">
            <div>
              <p className="text-sm text-app-text font-medium">界面语言</p>
              <p className="text-[11px] text-app-text-tertiary mt-0.5">选择你偏好的界面显示语言</p>
            </div>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="键盘快捷键" description="提升操作效率的快捷键列表">
        <div className="rounded-xl border border-app-border/80 bg-app-surface overflow-hidden divide-y divide-app-border/60">
          {COMMANDS.map((cmd) => (
            <div key={cmd.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
              <div>
                <p className="text-sm text-app-text">{cmd.title}</p>
                <p className="text-[11px] text-app-text-tertiary mt-0.5">{cmd.description}</p>
              </div>
              <ShortcutHint keys={cmd.keys} />
            </div>
          ))}
          <div className="px-5 py-3.5">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('shortcut:toggle-help'))}
              className="inline-flex items-center gap-1.5 text-xs text-primary-400 hover:text-primary-300 transition-colors"
            >
              <Keyboard className="w-3.5 h-3.5" />
              打开快捷键面板
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}
