import { useParams, useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { Button } from '../components/ui/button';
import { SkeletonCard, SkeletonText } from '../components/ui/skeleton';
import { useContentEditor } from '../hooks/useContentEditor';
import { EditorShell } from '../components/content/editor/EditorShell';
import { EditorHeader } from '../components/content/editor/EditorHeader';
import { EditorMetaRow } from '../components/content/editor/EditorMetaRow';
import { EditorToolbar } from '../components/content/editor/EditorToolbar';
import { EditorContent } from '../components/content/editor/EditorContent';
import { EditorFooter } from '../components/content/editor/EditorFooter';
import { PreviewPanel } from '../components/content/editor/PreviewPanel';
import { EditorDialogs } from '../components/content/editor/EditorDialogs';

export function ContentEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const editor = useContentEditor(id);
  // ── P0-1: 移除 openPublishDialog 直接调用，统一走 editor.requestPublish ──
  // requestPublish 内部会先做违禁词检测，再决定打开哪个 Dialog

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
    <div className="flex gap-4 items-start p-4 lg:p-6">
      {/* 左侧：主内容 */}
      <div className="flex-1 min-w-0 space-y-4">
        <EditorShell>
          <EditorHeader
            // ── P0-3: 平台切换器接入 ──
            activePlatform={editor.activePlatform}
            platformPending={editor.platformDirty}
            onPlatformChange={editor.handlePlatformChange}
            onBack={() => navigate(-1)}
            onPublish={editor.requestPublish}
            onExportMd={editor.handleExportMd}
            onCopyContent={editor.handleCopyContent}
            onHistory={() => editor.setHistoryOpen(true)}
            onPublishHistory={() => editor.loadPublishHistory(editor.content!.id)}
            onDelete={() => editor.setDeleteConfirmOpen(true)}
          />
          <EditorMetaRow
            title={editor.editTitle}
            onTitleChange={editor.handleTitleChange}
            tags={editor.editTags}
            onTagsChange={editor.handleTagsChange}
            onAiHeadlines={() => editor.runAiEdit('headlines')}
            onAiTags={() => editor.runAiEdit('tags')}
            aiLoading={editor.aiLoading}
            status={editor.content.status}
            stats={editor.contentStats}
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
          <div className="px-4 pb-4">
            <EditorFooter
              stats={editor.contentStats}
              autoSaveStatus={editor.autoSaveStatus}
              isDirty={editor.isDirty}
              saving={editor.saving}
              onSave={editor.handleSave}
              onUndo={editor.handleUndo}
            />
          </div>
        </EditorShell>
        <EditorDialogs editor={editor} />
      </div>
      <PreviewPanel
        platformCode={editor.activePlatform}
        title={editor.editTitle}
        contentMd={editor.editContentMd}
        tags={editor.editTags}
      />
    </div>
  );
}
