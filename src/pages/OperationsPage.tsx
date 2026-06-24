import { useState, useCallback } from 'react';
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
    <div className="h-full flex flex-col overflow-hidden">
      {/* ── Page Header ── */}
      <div className="shrink-0 border-b border-app-border/60 px-6 py-3.5 bg-app-surface/60 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-600/15 border border-primary-500/20 flex items-center justify-center shrink-0">
              <BarChart3 className="w-4 h-4 text-primary-400" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-app-text leading-none tracking-tight">运维中心</h1>
              <p className="text-xs text-app-text-tertiary mt-0.5 leading-none">全面掌控产能、发布与成本</p>
            </div>
          </div>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="w-3.5 h-3.5" />
            刷新数据
          </Button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <Tabs.Root value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col overflow-hidden">
          <Tabs.List className="flex items-center gap-0 px-6 border-b border-app-border/60 shrink-0 bg-app-surface/40">
            {TAB_ITEMS.map((tab) => (
              <Tabs.Trigger
                key={tab.value}
                value={tab.value}
                className={`
                  px-4 py-2.5 text-xs font-medium transition-all duration-150 relative
                  data-[state=active]:text-primary-400
                  data-[state=inactive]:text-app-text-tertiary data-[state=inactive]:hover:text-app-text-secondary
                `}
              >
                {tab.label}
                {activeTab === tab.value && (
                  <span className="absolute bottom-0 left-3 right-3 h-px bg-primary-500 rounded-full" />
                )}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          <Tabs.Content value="production" className="flex-1 overflow-y-auto px-6 py-5">
            <div className="max-w-[1024px] mx-auto">
              <ProductionTab key={`prod-${refreshKey}`} />
            </div>
          </Tabs.Content>
          <Tabs.Content value="publishing" className="flex-1 overflow-y-auto px-6 py-5">
            <div className="max-w-[1024px] mx-auto">
              <PublishingTab key={`pub-${refreshKey}`} />
            </div>
          </Tabs.Content>
          <Tabs.Content value="cost" className="flex-1 overflow-y-auto px-6 py-5">
            <div className="max-w-[1024px] mx-auto">
              <CostTab key={`cost-${refreshKey}`} />
            </div>
          </Tabs.Content>
          <Tabs.Content value="system" className="flex-1 overflow-y-auto px-6 py-5">
            <div className="max-w-[1024px] mx-auto">
              <SystemTab key={`sys-${refreshKey}`} />
            </div>
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </div>
  );
}
