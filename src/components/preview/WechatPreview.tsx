import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface WechatPreviewProps {
  title: string;
  content_md: string;
  author?: string;
}

export function WechatPreview({ title, content_md, author = 'AutoPublish' }: WechatPreviewProps) {
  const now = new Date();
  const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;

  const processedContent = (() => {
    if (!content_md.trim()) return '*内容预览区域*';
    return content_md.trim();
  })();

  return (
    <div className="min-h-screen bg-gray-100 p-3">
      <div className="max-w-[440px] mx-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Simulated phone browser chrome */}
          <div className="bg-white px-4 py-1.5 flex items-center justify-between text-[10px] text-gray-400 border-b border-gray-200">
            <div className="flex items-center gap-1">
              <span className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[8px]">←</span>
            </div>
            <span className="text-[9px] text-gray-500">公众号</span>
            <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[8px]">⋮</div>
          </div>

          {/* Article Header Image */}
          <div className="h-44 bg-gradient-to-br from-emerald-100 via-teal-50 to-cyan-50 relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-6xl opacity-15">📖</span>
            </div>
          </div>

          {/* Article */}
          <div className="px-5 pt-5 pb-2">
            {/* Title */}
            <h1 className="text-lg font-bold text-gray-900 leading-snug mb-3">
              {title || '标题'}
            </h1>

            {/* Meta */}
            <div className="text-center text-xs text-gray-400 pb-4 border-b border-gray-100 flex items-center justify-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-400 flex items-center justify-center text-white text-[9px] font-bold">
                  {author.charAt(0).toUpperCase()}
                </div>
                <span>{author}</span>
              </div>
              <span className="text-gray-200">·</span>
              <span>{dateStr}</span>
            </div>

            {/* Body - WeChat official style */}
            <div className="wx-prose mt-4 text-[15px] text-gray-700 leading-[1.9] [&_p]:!mb-3 [&_p]:!text-[15px] [&_p]:!leading-[1.9] [&_h1]:!text-xl [&_h1]:!font-bold [&_h1]:!text-gray-900 [&_h1]:!mt-5 [&_h1]:!mb-2 [&_h2]:!text-lg [&_h2]:!font-bold [&_h2]:!text-gray-900 [&_h2]:!mt-4 [&_h2]:!mb-2 [&_h3]:!text-base [&_h3]:!font-bold [&_h3]:!text-gray-800 [&_h3]:!mt-3 [&_h3]:!mb-1 [&_strong]:!font-bold [&_strong]:!text-gray-900 [&_em]:!text-gray-600 [&_ul]:!list-disc [&_ul]:!pl-5 [&_ul]:!space-y-1 [&_ul_li]:!text-[14px] [&_ol]:!list-decimal [&_ol]:!pl-5 [&_ol]:!space-y-1 [&_ol_li]:!text-[14px] [&_blockquote]:!border-l-3 [&_blockquote]:!border-green-300 [&_blockquote]:!pl-3 [&_blockquote]:!my-3 [&_blockquote]:!text-gray-500 [&_blockquote]:!text-[14px] [&_code]:!bg-gray-100 [&_code]:!text-green-600 [&_code]:!px-1 [&_code]:!py-0.5 [&_code]:!rounded [&_code]:!text-[13px] [&_pre]:!bg-gray-100 [&_pre]:!rounded-lg [&_pre]:!p-3 [&_pre]:!my-3 [&_pre]:!text-[13px] [&_hr]:!border-gray-200 [&_a]:!text-green-600 [&_a]:!underline">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {processedContent}
              </ReactMarkdown>
            </div>
          </div>

          {/* Bottom */}
          <div className="px-5 py-4 border-t border-gray-100 bg-gray-50">
            <p className="text-[10px] text-gray-400 text-center mb-2">长按识别二维码关注</p>
            <div className="w-16 h-16 mx-auto bg-gray-200 rounded-lg flex items-center justify-center">
              <span className="text-lg opacity-30">📱</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
