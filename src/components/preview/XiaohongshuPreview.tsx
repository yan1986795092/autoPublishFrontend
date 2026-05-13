import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface XiaohongshuPreviewProps {
  title: string;
  content_md: string;
  tags?: string[];
}

export function XiaohongshuPreview({ title, content_md, tags = [] }: XiaohongshuPreviewProps) {
  const extractedTags = (() => {
    const matches = content_md.match(/#[^\s#，,。！!？?\n]+/g) || [];
    return [...new Set([...matches.map(t => t.slice(1)), ...tags])].slice(0, 5);
  })();

  const now = new Date();
  const dateStr = `${now.getMonth() + 1}月${now.getDate()}日`;

  return (
    <div className="min-h-screen bg-gray-100 p-3">
      <div className="max-w-[440px] mx-auto">
        {/* Phone-like container */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-200">
          {/* Status bar mock */}
          <div className="bg-white px-4 py-1.5 flex items-center justify-between text-[10px] text-gray-400 border-b border-gray-100">
            <span>9:41</span>
            <div className="flex items-center gap-1">
              <span>📶</span><span>🔋</span>
            </div>
          </div>

          {/* Header image */}
          <div className="h-36 bg-gradient-to-br from-pink-100 via-rose-100 to-orange-50 relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-5xl opacity-20">🎨</span>
            </div>
            <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
              <div className="px-2.5 py-1 bg-white/90 backdrop-blur rounded-lg text-[10px] font-medium text-pink-500 shadow-sm">
                {dateStr}
              </div>
              <div className="px-2.5 py-1 bg-white/90 backdrop-blur rounded-lg text-[10px] font-medium text-pink-500 shadow-sm">
                小红书
              </div>
            </div>
          </div>

          {/* Author */}
          <div className="px-4 py-2.5 flex items-center gap-2 border-b border-gray-50">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-rose-400 flex items-center justify-center text-white text-xs font-bold">
              A
            </div>
            <div>
              <p className="text-[11px] font-semibold text-gray-800">AutoPublish</p>
              <p className="text-[9px] text-gray-400">关注 0 · 粉丝 0</p>
            </div>
            <button className="ml-auto px-2.5 py-1 bg-pink-500 text-white text-[10px] rounded-full font-medium">
              + 关注
            </button>
          </div>

          {/* Content */}
          <div className="px-4 pt-4 pb-3">
            {/* Title */}
            <h1 className="text-base font-bold text-gray-800 leading-snug mb-3">
              {title || '标题'}
            </h1>

            {/* Body - XHS specific styles */}
            <div className="xhs-prose text-sm text-gray-700 leading-relaxed space-y-3 [&_p]:!mb-0 [&_p]:!leading-[1.8] [&_p]:!text-sm [&_p]:!text-gray-700 [&_strong]:!font-bold [&_strong]:!text-gray-800 [&_em]:!not-italic [&_ul]:!list-none [&_ul]:!space-y-1 [&_ul_li]:!relative [&_ul_li]:!pl-3 [&_ul_li]:before:!content-['·'] [&_ul_li]:before:!absolute [&_ul_li]:before:!left-0 [&_ul_li]:before:!text-pink-400 [&_ol]:!list-none [&_ol]:!space-y-1 [&_ol_li]:!relative [&_ol_li]:!pl-3 [&_ol_li]:before:!content-[counter(num)'.'] [&_ol_li]:before:!absolute [&_ol_li]:before:!left-0 [&_ol_li]:before:!text-pink-400 [&_h1]:!text-base [&_h1]:!font-bold [&_h1]:!text-gray-800 [&_h2]:!text-sm [&_h2]:!font-bold [&_h2]:!text-gray-800 [&_h3]:!text-xs [&_h3]:!font-bold [&_h3]:!text-gray-700 [&_blockquote]:!border-l-2 [&_blockquote]:!border-pink-300 [&_blockquote]:!pl-3 [&_blockquote]:!text-gray-500 [&_blockquote]:!text-xs [&_code]:!bg-gray-100 [&_code]:!text-pink-500 [&_code]:!px-1 [&_code]:!py-0.5 [&_code]:!rounded [&_pre]:!bg-gray-100 [&_pre]:!rounded-lg [&_pre]:!p-2 [&_pre]:!text-xs [&_hr]:!border-gray-200">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content_md || '*内容预览区域*'}
              </ReactMarkdown>
            </div>

            {/* Tags */}
            {extractedTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-100">
                {extractedTags.map((tag, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-2 py-0.5 bg-pink-50 text-pink-400 rounded-full font-medium"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Action bar */}
          <div className="px-4 py-3 border-t border-gray-100 bg-gradient-to-r from-pink-50 to-rose-50 flex items-center justify-around">
            {[
              { icon: '👍', label: '点赞', count: '' },
              { icon: '⭐', label: '收藏', count: '' },
              { icon: '💬', label: '评论', count: '' },
              { icon: '↗', label: '分享', count: '' },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center gap-0.5 text-pink-400">
                <span className="text-base">{item.icon}</span>
                <span className="text-[9px] font-medium">{item.label}</span>
              </div>
            ))}
          </div>

          {/* Comment input */}
          <div className="px-4 py-2.5 bg-white border-t border-gray-100 flex items-center gap-2">
            <div className="flex-1 text-xs text-gray-400 bg-gray-100 rounded-full px-3 py-1.5">
              说点什么...
            </div>
            <span className="text-pink-400 text-sm">❤️</span>
          </div>
        </div>
      </div>
    </div>
  );
}
