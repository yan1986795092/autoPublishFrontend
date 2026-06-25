import { useParams, useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { Button } from '../components/ui/button';
import { SkeletonCard, SkeletonText } from '../components/ui/Skeleton';
import { useUIStore } from '../stores/useUIStore';
import { useContentEditor } from '../hooks/useContentEditor';
import { EditorHeader } from '../components/content/editor/EditorHeader';
import { TitleEditor } from '../components/content/editor/TitleEditor';
import { TagEditor } from '../components/content/editor/TagEditor';
import { EditorToolbar } from '../components/content/editor/EditorToolbar';
import { EditorContent } from '../components/content/editor/EditorContent';
import { EditorFooter } from '../components/content/editor/EditorFooter';
import { PreviewPanel } from '../components/content/editor/PreviewPanel';
import { EditorDialogs } from '../components/content/editor/EditorDialogs';

export function ContentEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { openPublishDialog } = useUIStore();
  const editor = useContentEditor(id);

  // ── Loading state ──
  if (editor.loading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto p-6">
        <SkeletonCard />
        <SkeletonText lines={5} />
      </div>
    );
  }

  // ── Not found state ──
  if (!editor.content) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 rounded-xl bg-app-surface border border-app-border flex items-center justify-center mb-4">
          <FileText className="w-6 h-6 text-app-text-tertiary" />
        </div>
        <h3 className="text-sm font-medium text-app-text-secondary mb-2">内容不存在</h3>
        <Button variant="outline" size="sm" onClick={() => navigate('/content')}>
          返回列表
        </Button>
      </div>
    );
  }

  // ── Main editor ──
  return (
    <div className="flex gap-0 items-start">
      {/* 左侧：主内容 */}
      <div className="flex-1 min-w-0 space-y-5 p-6">
        <EditorHeader
          contentId={editor.content.id}
          onBack={() => navigate(-1)}
          onPublish={async () => {
            const safe = await editor.checkBannedBeforePublish();
            if (safe) openPublishDialog(editor.content!.id);
          }}
          onExportMd={editor.handleExportMd}
          onCopyContent={editor.handleCopyContent}
          onHistory={() => editor.setHistoryOpen(true)}
          onPublishHistory={() => editor.loadPublishHistory(editor.content!.id)}
          onDelete={() => editor.setDeleteConfirmOpen(true)}
        />
        <TitleEditor
          title={editor.editTitle}
          onChange={editor.handleTitleChange}
          onAiHeadlines={() => editor.runAiEdit('headlines')}
          aiLoading={editor.aiLoading}
          status={editor.content.status}
        />
        <TagEditor
          tags={editor.editTags}
          onChange={editor.handleTagsChange}
          onAiTags={() => editor.runAiEdit('tags')}
          aiLoading={editor.aiLoading}
        />
        <EditorToolbar
          aiLoading={editor.aiLoading}
          onRewrite={(instruction) => editor.runAiEdit('rewrite', { instruction })}
          onExpand={() => editor.runAiEdit('expand')}
          onTranslate={(lang) => editor.runAiEdit('translate', { lang })}
          onTone={(tone) => editor.runAiEdit('tone', { tone })}
          onSeo={() => editor.runAiEdit('seo')}
          onBanned={() => editor.runAiEdit('banned')}
        />
        <EditorContent
          value={editor.editContentMd}
          onChange={editor.handleContentChange}
        />
        <EditorFooter
          stats={editor.contentStats}
          autoSaveStatus={editor.autoSaveStatus}
          isDirty={editor.isDirty}
          saving={editor.saving}
          onSave={editor.handleSave}
          onUndo={editor.handleUndo}
        />
        <EditorDialogs editor={editor} />
      </div>
      <PreviewPanel
        platformCode={editor.content.platform_code}
        title={editor.editTitle}
        contentMd={editor.editContentMd}
        tags={editor.editTags}
      />
    </div>
  );
}
