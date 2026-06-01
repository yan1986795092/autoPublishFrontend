import type { ComponentType } from 'react';
import {
  ListChecks, Pen, Search, BarChart2, Check, Globe, Image,
  Code2, Flame, Smartphone, Languages, Link2, Bot as BotIcon,
  type LucideProps
} from 'lucide-react';
import { getAgentIconName } from '../../config/agents';

const iconMap: Record<string, ComponentType<LucideProps>> = {
  'list-checks': ListChecks,
  'pen': Pen,
  'search': Search,
  'bar-chart': BarChart2,
  'check': Check,
  'globe': Globe,
  'image': Image,
  'code': Code2,
  'flame': Flame,
  'smartphone': Smartphone,
  'languages': Languages,
  'link': Link2,
  'bot': BotIcon,
};

export function AgentIcon({ agentType, className, size = 16 }: {
  agentType: string;
  className?: string;
  size?: number;
}) {
  const iconName = getAgentIconName(agentType);
  const Icon = iconMap[iconName] || BotIcon;
  return <Icon className={className} size={size} />;
}
