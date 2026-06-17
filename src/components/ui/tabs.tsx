import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/helpers';

const Tabs = TabsPrimitive.Root;

const tabsListVariants = cva(`inline-flex items-center gap-1 p-1 bg-app-surface rounded-lg border border-app-border`);

const tabsTriggerVariants = cva(
  `inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md
   px-3 py-1.5 text-sm font-medium transition-all duration-150
   focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-500/30
   disabled:pointer-events-none disabled:opacity-40`,
  {
    variants: {
      variant: {
        default: 'text-app-text-secondary hover:text-app-text data-[state=active]:bg-app-elevated data-[state=active]:text-app-text',
        pills: 'text-app-text-tertiary hover:text-app-text-secondary data-[state=active]:bg-gray-800 data-[state=active]:text-white',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & VariantProps<typeof tabsTriggerVariants>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(tabsListVariants(), className)}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & VariantProps<typeof tabsTriggerVariants>
>(({ className, variant, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(tabsTriggerVariants({ variant }), className)}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      `mt-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-500/30`,
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
