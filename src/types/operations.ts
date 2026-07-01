// ===================== Monitor Center Types =====================
// v2 — 用户视角的业务指标

// ── 内容看板 ──

export interface ProductionMetrics {
  daily: {
    count: number;
    change_vs_yesterday: number; // 0.12 = +12%
  };
  weekly: {
    count: number;
    change_vs_last_week: number;
  };
  avg_view_count: number;
  change_vs_last_week_views: number;
  avg_engagement_rate: number; // 0-1, (点赞+评论)/阅读
  avg_end_to_end_time_min: number;
  trend: DailyProductionTrend[];
  platform_distribution: PlatformProduction[];
}

export interface DailyProductionTrend {
  date: string;
  completed: number;
  cumulative: number;
}

export interface PlatformProduction {
  platform_code: string;
  platform_name: string;
  count: number;
  percentage: number; // 0-1
}

// ── 发布看板 ──

export interface PublishingMetrics {
  summary: {
    total_today: number;
    success_count: number;
    fail_count: number;
    success_rate: number; // 0-1
    avg_publish_delay_seconds: number;
  };
  platforms: PlatformHealth[];
  recent_records: RecentPublishRecord[];
}

export interface PlatformHealth {
  platform_code: string;
  platform_name: string;
  status: 'healthy' | 'degraded' | 'down';
  today_success: number;
  today_total: number;
  last_failure_time: string | null;
  last_failure_reason: string | null;
  week_success_rate: number;    // 0-1
  week_success_count: number;
  week_total_count: number;
  week_trend: number;           // 本周 vs 上周，真实计算
}

export interface RecentPublishRecord {
  time: string;
  title: string;
  platform_code: string;
  platform_name: string;
  status: 'success' | 'failed' | 'pending';
  view_count: number;
}

// ── 成本看板 ──

export interface CostMetrics {
  monthly: {
    total_cost: number;
    per_article_cost: number;
    daily_avg_cost_7d: number;
    budget_usage_rate: number; // 0-1
    monthly_budget: number;
  };
  cost_trend: CostDailyTrend[];
  cost_by_model: CostModel[];
  daily_details: CostDailyDetail[];
}

export interface CostDailyTrend {
  date: string;
  models: Record<string, number>; // { "GPT-4o": 28.5 } 单位：元
  total_cost: number;
}

export interface CostModel {
  model: string;
  cost: number;
  percentage: number; // 0-1
}

export interface CostDailyDetail {
  date: string;
  call_count: number;
  total_cost: number;
  change_rate: number | null;
}

// ── 系统状态 ──

export interface SystemMetrics {
  worker: {
    running: boolean;
  };
  tasks: {
    active: number;
    failed: number;
  };
  llm: {
    available: boolean;
  };
  recent_failures: RecentFailure[];
}

export interface RecentFailure {
  task_id: string;
  time: string;
  task_type: string;
  error: string;
}
