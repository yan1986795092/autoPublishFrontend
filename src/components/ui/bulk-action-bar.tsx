import { motion } from 'framer-motion';
import { Button } from './button';
import { Trash2, Archive, X } from 'lucide-react';

interface BulkActionBarProps {
  selectedCount: number;
  onBulkDelete: () => void;
  onBulkArchive: () => void;
  onClearSelection: () => void;
  loading?: boolean;
}

export function BulkActionBar({
  selectedCount,
  onBulkDelete,
  onBulkArchive,
  onClearSelection,
  loading,
}: BulkActionBarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex items-center gap-3 mb-2 px-4 py-2 rounded-lg bg-primary-500/10 border border-primary-500/20"
    >
      <span className="text-xs text-primary-400 font-medium">
        已选择 {selectedCount} 项
      </span>
      <div className="flex-1" />
      <Button size="xs" variant="destructive" onClick={onBulkDelete} disabled={loading}>
        {loading ? '删除中...' : <><Trash2 className="w-3 h-3 mr-1" />删除</>}
      </Button>
      <Button size="xs" variant="outline" onClick={onBulkArchive} disabled={loading}>
        {loading ? '归档中...' : <><Archive className="w-3 h-3 mr-1" />归档</>}
      </Button>
      <Button size="xs" variant="ghost" onClick={onClearSelection} disabled={loading}>
        <X className="w-3 h-3 mr-1" />取消
      </Button>
    </motion.div>
  );
}
