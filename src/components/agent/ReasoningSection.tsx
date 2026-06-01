import { cn } from '../../utils/helpers';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ChevronDown } from 'lucide-react';

interface ReasoningSectionProps {
  reasoning: string;
  showReasoning: boolean;
  setShowReasoning: (v: boolean) => void;
}

export function ReasoningSection({ reasoning, showReasoning, setShowReasoning }: ReasoningSectionProps) {
  if (!reasoning) return null;
  return (
    <div className="mt-1">
      <button
        onClick={() => setShowReasoning(!showReasoning)}
        className="inline-flex items-center gap-1 text-[10px] text-yellow-400/50 hover:text-yellow-400 transition-colors"
      >
        <Brain className="w-3 h-3" />
        {showReasoning ? '收起' : '查看思考'}
        <ChevronDown className={cn('w-2.5 h-2.5 transition-transform', showReasoning && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {showReasoning && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <p className="mt-1 text-[11px] text-yellow-300/50 leading-relaxed pl-3 border-l-2 border-yellow-500/30">
              {reasoning}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
