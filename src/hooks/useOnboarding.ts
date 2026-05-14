import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

const STORAGE_KEY = 'onboarding_completed';
const TOTAL_STEPS = 4;

export interface OnboardingStep {
  id: number;
  title: string;
  description: string;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 0,
    title: '欢迎使用创作工场',
    description: '创作工场是一个强大的 AI 写作助手，可以帮助你快速生成高质量的营销内容。',
  },
  {
    id: 1,
    title: '输入需求',
    description: '在输入框中描述你的写作需求，可以使用模板快速开始，也可以自由输入。',
  },
  {
    id: 2,
    title: '查看结果',
    description: 'AI 将自动分析需求并生成内容，你可以在右侧预览面板查看生成结果。',
  },
  {
    id: 3,
    title: '完成',
    description: '你可以直接发布内容到各大平台，或保存到内容库进行管理。',
  },
];

function getOnboardingCompleted(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

function setOnboardingCompleted(value: boolean): void {
  if (typeof window === 'undefined') return;
  if (value) {
    localStorage.setItem(STORAGE_KEY, 'true');
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export interface UseOnboardingReturn {
  isOnboarding: boolean;
  currentStep: number;
  totalSteps: number;
  startOnboarding: () => void;
  completeOnboarding: () => void;
  nextStep: () => void;
  prevStep: () => void;
}

export function useOnboarding(): UseOnboardingReturn {
  const [isCompleted, setIsCompleted] = useState<boolean>(() => getOnboardingCompleted());
  const [currentStep, setCurrentStep] = useState(0);
  const location = useLocation();

  const isOnHomePage = location.pathname === '/';
  const isOnboarding = !isCompleted && isOnHomePage;

  useEffect(() => {
    setIsCompleted(getOnboardingCompleted());
  }, []);

  const startOnboarding = useCallback(() => {
    setCurrentStep(0);
  }, []);

  const completeOnboarding = useCallback(() => {
    setIsCompleted(true);
    setOnboardingCompleted(true);
    setCurrentStep(0);
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS - 1));
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  return {
    isOnboarding,
    currentStep,
    totalSteps: TOTAL_STEPS,
    startOnboarding,
    completeOnboarding,
    nextStep,
    prevStep,
  };
}
