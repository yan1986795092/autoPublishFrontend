import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import * as Tabs from '@radix-ui/react-tabs';
import { BarChart3, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/button';
import { ProductionTab } from '../components/operations/ProductionTab';
import { PublishingTab } from '../components/operations/PublishingTab';
import { CostTab } from '../components/operations/CostTab';
import { SystemTab } from '../components/operations/SystemTab';

const TAB_ITEMS = [
  { value: 'production', label: '产能看板' },
  { value: 'publishing', label: '发布监控' },
  { value: 'cost', label: '成本分析' },
  { value: 'system', label: '系统监控' },
] as const;

const LS_KEY = 'operations_tab';

export function OperationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const getInitialTab = (): string => {
    const urlTab = searchParams.get('tab');
    if (urlTab && TAB_ITEMS.some((t) => t.value === urlTab)) return urlTab;
    const saved = localStorage.getItem(LS_KEY);
    if (saved && TAB_ITEMS.some((t) => t.value === saved)) return saved;
    return 'production';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
    localStorage.setItem(LS_KEY, value);
    setSearchParams(value === 'production' ? {} : { tab: value }, { replace: true });
  }, [setSearchParams]);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="max-w-5xl mx-auto p-6 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-app-text">运维中心</h1>
            <p className="text-xs text-app-text-secondary mt-0.5">Overview & Metrics</p>
          </div>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="w-3.5 h-3.5" />
          刷新
        </Button>
      </div>

      {/* Tabs */}
      <Tabs.Root value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col overflow-hidden mt-6">
        <Tabs.List className="flex gap-1 border-b border-app-border/50 shrink-0">
          {TAB_ITEMS.map((tab) => (
            <Tabs.Trigger
              key={tab.value}
              value={tab.value}
              className={`
                px-4 py-2 text-xs font-medium transition-all duration-150
                border-b-2 border-transparent
                data-[state=active]:border-primary-500 data-[state=active]:text-primary-400
                data-[state=inactive]:text-app-text-tertiary data-[state=inactive]:hover:text-app-text-secondary
                data-[state=inactive]:hover:border-app-border/30
              `}
            >
              {tab.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value="production" className="flex-1 overflow-y-auto pt-6">
          <ProductionTab key={`prod-${refreshKey}`} />
        </Tabs.Content>
        <Tabs.Content value="publishing" className="flex-1 overflow-y-auto pt-6">
          <PublishingTab key={`pub-${refreshKey}`} />
        </Tabs.Content>
        <Tabs.Content value="cost" className="flex-1 overflow-y-auto pt-6">
          <CostTab key={`cost-${refreshKey}`} />
        </Tabs.Content>
        <Tabs.Content value="system" className="flex-1 overflow-y-auto pt-6">
          <SystemTab key={`sys-${refreshKey}`} />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
