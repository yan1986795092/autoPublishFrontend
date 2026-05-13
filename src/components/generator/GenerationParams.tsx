import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BasicParams } from './BasicParams';
import { AudienceParams } from './AudienceParams';
import { StyleParams } from './StyleParams';
import { AdvancedParams } from './AdvancedParams';
import { cn } from '../../utils/helpers';

const TABS = [
  { key: 'basic', label: '基础' },
  { key: 'audience', label: '受众' },
  { key: 'style', label: '风格' },
  { key: 'advanced', label: '高级' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export function GenerationParams({ disabled }: { disabled?: boolean }) {
  const [activeTab, setActiveTab] = useState<TabKey>('basic');

  return (
    <div className="space-y-3">
      {/* Tab navigation */}
      <div className="flex gap-1 bg-app-surface rounded-lg p-0.5 border border-white/[0.04]">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex-1 py-1 rounded-md text-[10px] font-medium transition-all',
              activeTab === tab.key
                ? 'bg-app-elevated text-app-text shadow-sm'
                : 'text-app-text-tertiary hover:text-app-text-secondary'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === 'basic' && <BasicParams disabled={disabled} />}
          {activeTab === 'audience' && <AudienceParams disabled={disabled} />}
          {activeTab === 'style' && <StyleParams disabled={disabled} />}
          {activeTab === 'advanced' && <AdvancedParams disabled={disabled} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
