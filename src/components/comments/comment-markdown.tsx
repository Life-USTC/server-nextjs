"use client";

import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

type CommentMarkdownProps = {
  content: string;
  className?: string;
};

function MarkdownFallback({ content, className }: CommentMarkdownProps) {
  return (
    <div className={cn("space-y-3 text-foreground text-sm", className)}>
      <pre className="whitespace-pre-wrap text-muted-foreground text-xs">
        {content}
      </pre>
    </div>
  );
}

const LazyCommentMarkdown = dynamic(
  () =>
    import("@/components/comments/comment-markdown-impl").then(
      (mod) => mod.CommentMarkdown,
    ),
  {
    ssr: false,
  },
);

/**
 * Lazy-loaded markdown renderer. The heavy dependencies (react-markdown, KaTeX,
 * remark/rehype plugins) are code-split into a separate chunk and only loaded
 * when this component first renders on the client.
 */
export function CommentMarkdown({ content, className }: CommentMarkdownProps) {
  return <LazyCommentMarkdown content={content} className={className} />;
}

export { MarkdownFallback };
