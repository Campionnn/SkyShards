import { useEffect, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { BookOpen, Loader2 } from "lucide-react";
import { PageHeaderIcon } from "../components";

const MARKDOWN_COMPONENTS: Components = {
  h1: (props) => <h1 className="text-3xl font-bold text-white mb-6" {...props} />,
  h2: (props) => <h2 className="text-2xl font-semibold text-white mt-8 mb-4 pb-2 border-b border-white/10" {...props} />,
  h3: (props) => <h3 className="text-xl font-semibold text-white mt-6 mb-3" {...props} />,
  p: (props) => <p className="text-slate-300 leading-relaxed mb-4" {...props} />,
  ul: (props) => <ul className="list-disc list-inside text-slate-300 mb-4 space-y-1" {...props} />,
  ol: (props) => <ol className="list-decimal list-inside text-slate-300 mb-4 space-y-1" {...props} />,
  li: (props) => <li className="text-slate-300" {...props} />,
  strong: (props) => <strong className="text-white font-semibold" {...props} />,
  code: (props) => <code className="bg-white/10 text-purple-300 px-2 py-1 rounded text-sm" {...props} />,
  pre: (props) => <pre className="bg-white/5 border border-white/10 rounded-lg p-4 overflow-x-auto mb-4" {...props} />,
  blockquote: (props) => <blockquote className="border-l-4 border-purple-400 pl-4 text-slate-400 italic mb-4" {...props} />,
  hr: (props) => <hr className="border-white/20 my-8" {...props} />,
};

/** Renders public/guide.md. */
export const GuidePage = () => {
  const [markdownContent, setMarkdownContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}guide.md`)
      .then((response) => {
        if (!response.ok) throw new Error("Failed to fetch guide content");
        return response.text();
      })
      .then((content) => {
        if (!cancelled) setMarkdownContent(content);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "An error occurred");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
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
      <PageHeaderIcon icon={BookOpen} className="mb-8" />
      <div className="prose prose-invert prose-purple max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
          {markdownContent}
        </ReactMarkdown>
      </div>
    </div>
  );
};
