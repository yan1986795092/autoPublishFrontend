import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/helpers';

interface AccordionProps {
  type: 'single' | 'multiple';
  defaultOpen?: string[];
  children: React.ReactNode;
  className?: string;
}

interface AccordionItemProps {
  value: string;
  trigger: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const AccordionContext = React.createContext<{
  openValues: string[];
  onToggle: (value: string) => void;
}>({
  openValues: [],
  onToggle: () => {},
});

function Accordion({ type, defaultOpen = [], children, className }: AccordionProps) {
  const [openValues, setOpenValues] = React.useState<string[]>(defaultOpen);

  const onToggle = React.useCallback(
    (value: string) => {
      setOpenValues((prev) => {
        if (type === 'single') {
          return prev.includes(value) ? [] : [value];
        }
        return prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value];
      });
    },
    [type]
  );

  return (
    <AccordionContext.Provider value={{ openValues, onToggle }}>
      <div className={cn(className)}>{children}</div>
    </AccordionContext.Provider>
  );
}

function AccordionItem({ value, trigger, children, className }: AccordionItemProps) {
  const { openValues, onToggle } = React.useContext(AccordionContext);
  const isOpen = openValues.includes(value);

  return (
    <div className={cn('border-b border-app-border', className)}>
      <button
        type="button"
        onClick={() => onToggle(value)}
        className={cn(
          'flex flex-1 items-center justify-between w-full py-4 text-sm font-medium text-app-text-secondary',
          'hover:text-app-text transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-500/30'
        )}
      >
        {trigger}
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-app-text-tertiary transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>
      {isOpen && <div className="pb-4 text-sm text-app-text-secondary">{children}</div>}
    </div>
  );
}

export { Accordion, AccordionItem };
