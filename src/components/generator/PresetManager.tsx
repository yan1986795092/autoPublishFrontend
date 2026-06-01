import { useEffect, useState } from 'react';
import { usePresetStore } from '../../stores/usePresetStore';
import { useGeneratorStore } from '../../stores/useGeneratorStore';
import { SavePresetDialog } from './SavePresetDialog';
import { Button } from '../ui/button';
import { Save, FolderOpen, Trash2, Loader2 } from 'lucide-react';

export function PresetManager() {
  const { presets, loading, fetchPresets, loadPreset, deletePreset } = usePresetStore();
  const { setTopic, setPlatformCode, setParameters, setTemplateId } = useGeneratorStore();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    fetchPresets();
  }, []);

  const handleLoadPreset = async (id: string) => {
    await loadPreset(id);
    const { currentPreset } = usePresetStore.getState();
    if (currentPreset) {
      const { parameters, platform_code, template_id } = currentPreset;
      if (parameters.topic) setTopic(parameters.topic);
      if (platform_code) setPlatformCode(platform_code);
      if (template_id) setTemplateId(template_id);
      // Omit topic — already set above
      setParameters(Object.fromEntries(
        Object.entries(parameters).filter(([k]) => k !== 'topic')
      ));
      setShowDropdown(false);
    }
  };

  return (
    <>
      <div className="flex gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSaveDialog(true)}
          className="flex-1 h-7 text-[10px] gap-1"
        >
          <Save className="w-3 h-3" />
          保存预设
        </Button>
        <div className="relative flex-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDropdown(!showDropdown)}
            disabled={loading}
            className="w-full h-7 text-[10px] gap-1"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <FolderOpen className="w-3 h-3" />}
            加载预设
          </Button>

          {showDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
              <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-app-elevated border border-white/[0.08] rounded-lg shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                {presets.length === 0 ? (
                  <div className="px-3 py-4 text-[10px] text-app-text-tertiary text-center">暂无保存的预设</div>
                ) : (
                  presets.map((p) => (
                    <div key={p.id} className="flex items-center gap-1 px-2.5 py-2 hover:bg-white/[0.06] group">
                      <button
                        onClick={() => handleLoadPreset(p.id)}
                        className="flex-1 text-left"
                      >
                        <div className="text-[10px] font-medium text-app-text">{p.name}</div>
                        {p.description && (
                          <div className="text-[8px] text-app-text-tertiary truncate">{p.description}</div>
                        )}
                      </button>
                      <button
                        onClick={async () => { await deletePreset(p.id); }}
                        className="opacity-0 group-hover:opacity-100 text-app-text-tertiary hover:text-red-400 transition-all p-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <SavePresetDialog open={showSaveDialog} onClose={() => setShowSaveDialog(false)} />
    </>
  );
}
