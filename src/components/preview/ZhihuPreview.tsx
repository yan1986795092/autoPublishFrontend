import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ZhihuPreviewProps {
  title: string;
  content_md: string;
  author?: string;
}

export function ZhihuPreview({ title, content_md, author = 'AutoPublish' }: ZhihuPreviewProps) {
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const processedContent = (() => {
    if (!content_md.trim()) return '*内容预览区域*';
    return content_md.trim();
  })();

  return (
    <div className="min-h-screen bg-gray-50 p-3">
      <div className="max-w-[680px] mx-auto">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Article Header */}
          <div className="pt-8 pb-5 px-6 border-b border-gray-100">
            <h1 className="text-xl font-bold text-gray-900 leading-snug mb-4">
              {title || '标题'}
            </h1>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                {author.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-800">{author}</p>
                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-500 rounded">已关注</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-gray-400 mt-0.5">
                  <span>{dateStr}</span>
                  <span>IP 属地江苏</span>
                  <span>编辑于</span>
                </div>
              </div>
              <button className="px-3 py-1.5 border border-blue-500 text-blue-500 rounded-full hover:bg-blue-50 transition-colors text-xs font-medium">
                + 关注
              </button>
            </div>
          </div>

          {/* Article Content - Zhihu style */}
          <div className="px-6 py-5">
            <div className="zhihu-prose text-[15px] text-gray-700 leading-[1.8] [&_p]:!mb-3 [&_p]:!text-[15px] [&_p]:!leading-[1.8] [&_h1]:!text-xl [&_h1]:!font-bold [&_h1]:!text-gray-900 [&_h1]:!mt-6 [&_h1]:!mb-3 [&_h2]:!text-lg [&_h2]:!font-bold [&_h2]:!text-gray-900 [&_h2]:!mt-5 [&_h2]:!mb-2 [&_h3]:!text-base [&_h3]:!font-bold [&_h3]:!text-gray-800 [&_h3]:!mt-4 [&_h3]:!mb-2 [&_strong]:!font-bold [&_strong]:!text-gray-900 [&_em]:!text-gray-500 [&_ul]:!list-disc [&_ul]:!pl-5 [&_ul]:!space-y-1 [&_ul_li]:!text-[14px] [&_ol]:!list-decimal [&_ol]:!pl-5 [&_ol]:!space-y-1 [&_ol_li]:!text-[14px] [&_blockquote]:!border-l-3 [&_blockquote]:!border-blue-300 [&_blockquote]:!pl-3 [&_blockquote]:!my-3 [&_blockquote]:!bg-blue-50 [&_blockquote]:!py-2 [&_blockquote]:!pr-3 [&_blockquote]:!text-gray-600 [&_blockquote]:!text-[14px] [&_code]:!bg-gray-100 [&_code]:!text-blue-600 [&_code]:!px-1 [&_code]:!py-0.5 [&_code]:!rounded [&_code]:!text-[13px] [&_pre]:!bg-gray-100 [&_pre]:!rounded-lg [&_pre]:!p-3 [&_pre]:!my-3 [&_pre]:!text-[13px] [&_hr]:!border-gray-200 [&_table]:!w-full [&_table]:!border-collapse [&_table_th]:!border [&_table_td]:!border [&_table_th]:!px-3 [&_table_td]:!px-3 [&_table_th]:!py-2 [&_table_td]:!py-2 [&_table_th]:!bg-gray-50 [&_table_th]:!text-xs [&_table_td]:!text-xs [&_a]:!text-blue-500 [&_a]:!underline">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {processedContent}
              </ReactMarkdown>
            </div>

            {/* Tags */}
            <div className="mt-5 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
              <span className="text-xs px-2.5 py-1 bg-gray-100 text-gray-500 rounded-full cursor-pointer hover:bg-gray-200 transition-colors">#AI写作</span>
              <span className="text-xs px-2.5 py-1 bg-gray-100 text-gray-500 rounded-full cursor-pointer hover:bg-gray-200 transition-colors">#内容创作</span>
              <span className="text-xs px-2.5 py-1 bg-gray-100 text-gray-500 rounded-full cursor-pointer hover:bg-gray-200 transition-colors">#效率工具</span>
            </div>

            {/* Action Bar */}
            <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button className="flex items-center gap-1.5 text-gray-400 hover:text-blue-500 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-gray-100 hover:bg-blue-50 flex items-center justify-center transition-colors">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M7 10v12m0 0l3-3m-3 3l-3-3M17 10V5a1 1 0 00-1-1H8a1 1 0 00-1 1v5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span className="text-xs">赞同</span>
                  <span className="text-xs opacity-50">0</span>
                </button>
                <button className="flex items-center gap-1.5 text-gray-400 hover:text-red-400 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-gray-100 hover:bg-red-50 flex items-center justify-center transition-colors">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M9 10H5a1 1 0 00-1 1v8a1 1 0 001 1h4a1 1 0 001-1v-8a1 1 0 00-1-1zM14 5h4a1 1 0 011 1v13a1 1 0 01-1 1h-4a1 1 0 01-1-1V6a1 1 0 011-1zM9 9l-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span className="text-xs">反对</span>
                </button>
              </div>
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-1 text-gray-400 hover:text-blue-500 transition-colors">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-xs">分享</span>
                </button>
                <button className="flex items-center gap-1 text-gray-400 hover:text-amber-500 transition-colors">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-xs">收藏</span>
                </button>
                <button className="flex items-center gap-1 text-gray-400 hover:text-blue-500 transition-colors">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M3 5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" />
                    <path d="M3 10h18M10 3v18" strokeLinecap="round" />
                  </svg>
                  <span className="text-xs">评论</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-200 px-6 py-3 bg-gray-50 flex items-center justify-between">
            <span className="text-[11px] text-gray-400">喜欢此内容的人也看了</span>
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-gray-400">创作不易，</span>
              <span className="text-[11px] text-blue-500 cursor-pointer hover:underline">赞赏支持</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
