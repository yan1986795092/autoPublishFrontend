import { cn } from '../../utils/helpers';

interface PasswordStrengthProps {
  password: string;
  className?: string;
}

function getStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: '' };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { score, label: '弱', color: 'bg-red-500' };
  if (score <= 3) return { score, label: '一般', color: 'bg-yellow-500' };
  if (score <= 4) return { score, label: '良好', color: 'bg-blue-500' };
  return { score, label: '强', color: 'bg-green-500' };
}

export function PasswordStrength({ password, className }: PasswordStrengthProps) {
  const { score, label, color } = getStrength(password);
  if (!password) return null;

  const maxScore = 6;
  const pct = (score / maxScore) * 100;

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex gap-1">
        {Array.from({ length: maxScore }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-all duration-300',
              i < score ? color : 'bg-app-border'
            )}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-app-text-tertiary">密码强度</span>
        <span
          className={cn(
            'text-[10px] font-medium',
            score <= 2
              ? 'text-red-400'
              : score <= 3
              ? 'text-yellow-400'
              : score <= 4
              ? 'text-blue-400'
              : 'text-green-400'
          )}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
