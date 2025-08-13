import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BookOpen, Loader2 } from "lucide-react";

export const GuidePage: React.FC = () => {
  const [markdownContent, setMarkdownContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGuideContent = async () => {
      try {
        const response = await fetch("/guide.md");
        if (!response.ok) {
          throw new Error("Failed to fetch guide content");
        }
        const content = await response.text();
        setMarkdownContent(content);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchGuideContent();
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-6 px-4">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin mr-3" />
          <span className="text-slate-300">Loading guide...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-6 px-4">
        <div className="bg-red-500/20 border border-red-500/20 rounded-xl p-6 text-center">
          <div className="text-red-400 mb-2">Failed to load guide</div>
          <div className="text-slate-400 text-sm">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-purple-500/20 border border-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
          <BookOpen className="w-8 h-8 text-purple-400" />
        </div>
      </div>

      {/* Markdown Content */}
      <div className="prose prose-invert prose-purple max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children, ...props }) => (
              <h1 className="text-3xl font-bold text-white mb-6" {...props}>
                {children}
              </h1>
            ),
            h2: ({ children, ...props }) => (
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4 pb-2 border-b border-white/10" {...props}>
                {children}
              </h2>
            ),
            h3: ({ children, ...props }) => (
              <h3 className="text-xl font-semibold text-white mt-6 mb-3" {...props}>
                {children}
              </h3>
            ),
            p: ({ children, ...props }) => (
              <p className="text-slate-300 leading-relaxed mb-4" {...props}>
                {children}
              </p>
            ),
            ul: ({ children, ...props }) => (
              <ul className="list-disc list-inside text-slate-300 mb-4 space-y-1" {...props}>
                {children}
              </ul>
            ),
            ol: ({ children, ...props }) => (
              <ol className="list-decimal list-inside text-slate-300 mb-4 space-y-1" {...props}>
                {children}
              </ol>
            ),
            li: ({ children, ...props }) => (
              <li className="text-slate-300" {...props}>
                {children}
              </li>
            ),
            strong: ({ children, ...props }) => (
              <strong className="text-white font-semibold" {...props}>
                {children}
              </strong>
            ),
            code: ({ children, ...props }) => (
              <code className="bg-white/10 text-purple-300 px-2 py-1 rounded text-sm" {...props}>
                {children}
              </code>
            ),
            pre: ({ children, ...props }) => (
              <pre className="bg-white/5 border border-white/10 rounded-lg p-4 overflow-x-auto mb-4" {...props}>
                {children}
              </pre>
            ),
            blockquote: ({ children, ...props }) => (
              <blockquote className="border-l-4 border-purple-400 pl-4 text-slate-400 italic mb-4" {...props}>
                {children}
              </blockquote>
            ),
            hr: ({ ...props }) => (
              <hr className="border-white/20 my-8" {...props} />
            ),
          }}
        >
          {markdownContent}
        </ReactMarkdown>
      </div>
    </div>
  );
};
