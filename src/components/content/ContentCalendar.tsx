import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { contentsApi } from '../../services/api';
import { cn } from '../../utils/helpers';
import { ChevronLeft, ChevronRight, CalendarDays, FileText, Clock } from 'lucide-react';

const DAYS = ['日', '一', '二', '三', '四', '五', '六'];
const PLATFORM_EMOJIS: Record<string, string> = {
  xiaohongshu: '🎨',
  wechat: '📱',
  zhihu: '💡',
};

interface CalendarItem {
  id: string;
  title: string;
  type: 'created' | 'scheduled';
  platform_code: string;
  status: string;
}

export function ContentCalendar() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [calendarData, setCalendarData] = useState<Record<string, CalendarItem[]>>({});
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await contentsApi.calendar(year, month);
        const data = res.data.data;
        if (data) {
          setCalendarData(data.calendar || {});
        }
      } catch {
        // silently fail
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

  return (
    <div className="h-full flex flex-col glass-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.04] flex-shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-md bg-gradient-primary flex items-center justify-center">
            <CalendarDays className="w-3 h-3 text-white" />
          </div>
          <h2 className="text-xs font-semibold text-app-text">内容日历</h2>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between">
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
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto p-3">
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
          {/* Empty cells before first day */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square rounded-lg" />
          ))}

          {calendarDays.map((day) => {
            const isSelected = selectedDate === day.date;
            const isToday = day.date === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const hasItems = day.items.length > 0;

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
                    {day.items.filter(i => i.type === 'scheduled').length > 0 && (
                      <div className="w-1 h-1 rounded-full bg-blue-400" />
                    )}
                    {day.items.filter(i => i.type === 'created').length > 0 && (
                      <div className="w-1 h-1 rounded-full bg-green-400" />
                    )}
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
            {selectedItems.length === 0 && (
              <p className="text-[10px] text-app-text-tertiary py-2">当天无内容</p>
            )}
            <div className="space-y-1">
              {selectedItems.map((item, i) => (
                <div
                  key={`${item.id}-${i}`}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
                >
                  {item.type === 'scheduled' ? (
                    <Clock className="w-3 h-3 text-blue-400 flex-shrink-0" />
                  ) : (
                    <FileText className="w-3 h-3 text-green-400 flex-shrink-0" />
                  )}
                  <span className="text-[10px] text-app-text-secondary flex-1 truncate">{item.title}</span>
                  <span className="text-[10px]">{PLATFORM_EMOJIS[item.platform_code] || '📄'}</span>
                  <span className={cn(
                    'text-[8px] px-1 py-0.5 rounded',
                    item.type === 'scheduled' ? 'bg-blue-500/10 text-blue-400' : 'bg-green-500/10 text-green-400'
                  )}>
                    {item.type === 'scheduled' ? '定时' : '已创建'}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
