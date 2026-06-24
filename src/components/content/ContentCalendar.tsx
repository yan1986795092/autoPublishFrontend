import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { contentsApi } from '../../services/api';
import { PLATFORM_MAP } from '../agent/PlatformSelector';
import { PlatformIcon } from '../agent/PlatformIcons';
import { cn } from '../../utils/helpers';
import { ChevronLeft, ChevronRight, CalendarDays, Clock, CheckCircle2, XCircle } from 'lucide-react';

const DAYS = ['日', '一', '二', '三', '四', '五', '六'];

interface CalendarItem {
  id: string;
  content_id: string;
  title: string;
  type: 'pending' | 'success' | 'failed';
  platform_code: string;
  content_status: string;
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  pending: {
    label: '待发布',
    icon: <Clock className="w-3 h-3" />,
    className: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  },
  success: {
    label: '已发布',
    icon: <CheckCircle2 className="w-3 h-3" />,
    className: 'bg-green-500/10 text-green-400 border-green-500/30',
  },
  failed: {
    label: '失败',
    icon: <XCircle className="w-3 h-3" />,
    className: 'bg-red-500/10 text-red-400 border-red-500/30',
  },
};

const DOT_COLORS: Record<string, string> = {
  pending: 'bg-blue-400',
  success: 'bg-green-400',
  failed: 'bg-red-400',
};

export function ContentCalendar() {
  const navigate = useNavigate();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [calendarData, setCalendarData] = useState<Record<string, CalendarItem[]>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await contentsApi.calendar(year, month);
        const data = res.data.data;
        if (data && data.calendar) {
          const calendar: Record<string, CalendarItem[]> = {};
          for (const [date, items] of Object.entries(data.calendar)) {
            calendar[date] = (items as CalendarItem[]);
          }
          setCalendarData(calendar);
        }
      } catch {
        // 静默——日历数据非关键
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [year, month]);

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();

  const calendarDays = useMemo(() => {
    const days: Array<{ date: string; day: number; items: CalendarItem[] }> = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        date: dateStr,
        day: d,
        items: calendarData[dateStr] || [],
      });
    }
    return days;
  }, [year, month, daysInMonth, calendarData]);

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else { setMonth(m => m - 1); }
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else { setMonth(m => m + 1); }
    setSelectedDate(null);
  };

  const selectedItems = selectedDate ? calendarData[selectedDate] || [] : [];

  // 当月统计
  const stats = useMemo(() => {
    let pending = 0, success = 0, failed = 0;
    for (const items of Object.values(calendarData)) {
      for (const item of items) {
        if (item.type === 'pending') pending++;
        else if (item.type === 'success') success++;
        else if (item.type === 'failed') failed++;
      }
    }
    return { pending, success, failed, total: pending + success + failed };
  }, [calendarData]);

  return (
    <div className="h-full flex flex-col">
      {/* Stats bar */}
      {stats.total > 0 && (
        <div className="flex items-center gap-3 mb-3 text-[10px]">
          <span className="flex items-center gap-1 text-blue-400">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            待发布 {stats.pending}
          </span>
          <span className="flex items-center gap-1 text-green-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            已发布 {stats.success}
          </span>
          {stats.failed > 0 && (
            <span className="flex items-center gap-1 text-red-400">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              失败 {stats.failed}
            </span>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="p-1 rounded-md hover:bg-white/[0.06] text-app-text-tertiary hover:text-app-text transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-app-text">
          {year}年{month}月
        </span>
        <button onClick={nextMonth} className="p-1 rounded-md hover:bg-white/[0.06] text-app-text-tertiary hover:text-app-text transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAYS.map((d) => (
            <div key={d} className="text-center text-[9px] font-medium text-app-text-tertiary py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square rounded-lg" />
          ))}
          {calendarDays.map((day) => {
            const isSelected = selectedDate === day.date;
            const isToday = day.date === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const hasItems = day.items.length > 0;
            const pendingCount = day.items.filter(i => i.type === 'pending').length;
            const failedCount = day.items.filter(i => i.type === 'failed').length;

            return (
              <motion.button
                key={day.date}
                onClick={() => setSelectedDate(isSelected ? null : day.date)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  'aspect-square rounded-lg flex flex-col items-center justify-center relative transition-all',
                  isSelected
                    ? 'bg-primary-600/20 border border-primary-500/30'
                    : isToday
                    ? 'bg-primary-500/10 border border-primary-500/20'
                    : 'hover:bg-white/[0.04] border border-transparent'
                )}
              >
                <span className={cn(
                  'text-[11px] font-medium',
                  isSelected ? 'text-primary-400' : isToday ? 'text-primary-400' : 'text-app-text'
                )}>
                  {day.day}
                </span>
                {hasItems && (
                  <div className="flex gap-0.5 mt-0.5">
                    {pendingCount > 0 && <div className="w-1 h-1 rounded-full bg-blue-400" />}
                    {failedCount > 0 && <div className="w-1 h-1 rounded-full bg-red-400" />}
                    {day.items.some(i => i.type === 'success') && <div className="w-1 h-1 rounded-full bg-green-400" />}
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Selected day details */}
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 rounded-xl bg-app-surface border border-white/[0.04]"
          >
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays className="w-3 h-3 text-primary-400" />
              <span className="text-[11px] font-medium text-app-text">{selectedDate}</span>
              <span className="text-[9px] text-app-text-tertiary">({selectedItems.length} 项)</span>
            </div>
            {loading ? (
              <p className="text-[10px] text-app-text-tertiary py-2">加载中...</p>
            ) : selectedItems.length === 0 ? (
              <p className="text-[10px] text-app-text-tertiary py-2">当天无发布记录</p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-auto">
                {(() => {
                  // 排序：失败的优先显示
                  const sorted = [...selectedItems].sort((a, b) => {
                    const order = { failed: 0, pending: 1, success: 2 };
                    return (order[a.type] ?? 9) - (order[b.type] ?? 9);
                  });
                  return sorted.map((item) => {
                    const typeCfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.pending;
                    const plat = PLATFORM_MAP.get(item.platform_code);
                    return (
                      <button
                        key={item.id}
                        onClick={() => navigate(`/content/${item.content_id}`)}
                        className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors text-left"
                      >
                        <PlatformIcon id={item.platform_code} size={18} />
                        <span className="text-[10px] text-app-text-secondary flex-1 truncate">{item.title || '无标题'}</span>
                        <span className={cn(
                          'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[8px] font-medium border shrink-0',
                          typeCfg.className,
                        )}>
                          {typeCfg.icon}
                          {typeCfg.label}
                        </span>
                      </button>
                    );
                  });
                })()}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
