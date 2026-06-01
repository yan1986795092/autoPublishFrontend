import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { ONBOARDING_STEPS } from '../../hooks/useOnboarding';
import {
  Sparkles,
  MousePointerClick,
  Eye,
  Rocket,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';

const STEP_ICONS = [Sparkles, MousePointerClick, Eye, Rocket];

export interface OnboardingTourProps {
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onComplete: () => void;
  onSkip: () => void;
}

export function OnboardingTour({
  currentStep,
  totalSteps,
  onNext,
  onPrev,
  onComplete,
  onSkip,
}: OnboardingTourProps) {
  const step = ONBOARDING_STEPS[currentStep];
  const Icon = STEP_ICONS[currentStep];
  const isLastStep = currentStep === totalSteps - 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40"
        onClick={onSkip}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative mx-4 w-full max-w-sm rounded-xl bg-app-elevated border border-app-border shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative px-6 pt-6 pb-4">
            <button
              onClick={onSkip}
              className="absolute right-3 top-3 w-7 h-7 flex items-center justify-center rounded-md text-app-text-tertiary hover:text-app-text hover:bg-app-hover transition-colors"
              aria-label="关闭引导"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Icon */}
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center mb-4">
              <Icon className="w-6 h-6 text-blue-400" />
            </div>

            {/* Title */}
            <h2 className="text-base font-semibold text-app-text pr-8">
              {step.title}
            </h2>
          </div>

          {/* Description */}
          <div className="px-6 pb-4">
            <p className="text-xs text-app-text-secondary leading-relaxed">
              {step.description}
            </p>
          </div>

          {/* Progress */}
          <div className="px-6 pb-4">
            <div className="flex items-center gap-2">
              {Array.from({ length: totalSteps }).map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    idx === currentStep
                      ? 'w-6 bg-primary-500'
                      : idx < currentStep
                      ? 'w-1.5 bg-primary-500/50'
                      : 'w-1.5 bg-app-border'
                  }`}
                />
              ))}
            </div>
            <span className="text-[10px] text-app-text-tertiary mt-2 block">
              第 {currentStep + 1} 步，共 {totalSteps} 步
            </span>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-app-border bg-app-surface/50">
            <Button
              variant="ghost"
              size="sm"
              onClick={onPrev}
              disabled={currentStep === 0}
              className="h-8 px-3 text-xs"
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-0.5" />
              上一步
            </Button>

            {isLastStep ? (
              <Button
                variant="primary"
                size="sm"
                onClick={onComplete}
                className="h-8 px-4 text-xs"
              >
                开始使用
                <Rocket className="w-3.5 h-3.5 ml-0.5" />
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={onNext}
                className="h-8 px-4 text-xs"
              >
                下一步
                <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </Button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
