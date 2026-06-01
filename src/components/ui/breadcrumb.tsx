import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="breadcrumb" className="breadcrumb-nav">
      <ol className="flex items-center gap-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="flex items-center">
              {isLast ? (
                <span className="text-xs text-app-text font-medium">
                  {item.label}
                </span>
              ) : item.href ? (
                <a
                  href={item.href}
                  onClick={item.onClick}
                  className="text-xs text-app-text-tertiary hover:text-app-text-secondary transition-colors"
                >
                  {item.label}
                </a>
              ) : item.onClick ? (
                <button
                  onClick={item.onClick}
                  className="text-xs text-app-text-tertiary hover:text-app-text-secondary transition-colors"
                >
                  {item.label}
                </button>
              ) : (
                <span className="text-xs text-app-text-tertiary">
                  {item.label}
                </span>
              )}
              {!isLast && (
                <ChevronRight className="w-3 h-3 text-app-text-tertiary mx-0.5" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
