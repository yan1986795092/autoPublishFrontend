// ===================== Operations Center Types =====================

// ── 产能看板 ──

export interface ProductionMetrics {
  daily: {
    count: number;
    change_vs_yesterday: number;   // 环比变化率，如 0.12 = +12%
  };
  weekly: {
    count: number;
    change_vs_last_week: number;
  };
  ai_generation_ratio: number;    // 0-1
  avg_completion_time_min: number;
  trend: DailyProductionTrend[];
  platform_distribution: PlatformProduction[];
}

export interface DailyProductionTrend {
  date: string;           // "YYYY-MM-DD"
  completed: number;      // 当日完成数
  cumulative: number;     // 周累计
}

export interface PlatformProduction {
  platform_code: string;
  platform_name: string;
  count: number;
  percentage: number;     // 0-1
}

// ── 发布监控 ──

export interface PublishingMetrics {
  summary: {
    total_today: number;
    success_count: number;
    fail_count: number;
    success_rate: number;          // 0-1
    avg_publish_delay_seconds: number;
  };
  platforms: PlatformHealth[];
  failures: PublishFailure[];
}

export interface PlatformHealth {
  platform_code: string;
  platform_name: string;
  status: 'healthy' | 'degraded' | 'down';
  today_success: number;
  today_total: number;
  last_failure_time: string | null;
  last_failure_reason: string | null;
  week_success_rate: number;
  week_trend: number;
}

export interface PublishFailure {
  time: string;
  content_title: string;
  platform_code: string;
  platform_name: string;
  reason: string;
  status: 'retrying' | 'manual' | 'auto_fixed';
}

// ── 成本分析 ──

export interface CostMetrics {
  monthly: {
    total_cost: number;
    per_article_cost: number;
    daily_avg_cost_7d: number;
    budget_usage_rate: number;
    monthly_budget: number;
  };
  token_trend: TokenDailyTrend[];
  cost_by_stage: CostStage[];
  daily_details: CostDailyDetail[];
}

export interface TokenDailyTrend {
  date: string;
  models: Record<string, number>;
  total_tokens: number;
  total_cost: number;
}

export interface CostStage {
  stage: string;
  cost: number;
  percentage: number;
}

export interface CostDailyDetail {
  date: string;
  call_count: number;
  total_tokens: number;
  model_costs: Record<string, number>;
  total_cost: number;
  change_rate: number | null;
}
