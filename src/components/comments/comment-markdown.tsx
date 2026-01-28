"use client";

import NextImage from "next/image";
import { Component, type ReactNode, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkDirective from "remark-directive";
import remarkEmoji from "remark-emoji";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { visit } from "unist-util-visit";
import { cn } from "@/lib/utils";
import "katex/dist/katex.min.css";

class MarkdownErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    console.error("Markdown rendering error:", error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

const mentionPattern = /\b(section|teacher)#(\d+)\b/g;

function preprocessMarkdown(value: string) {
  return value.replace(mentionPattern, (_match, kind, id) => {
    const href = kind === "teacher" ? `/teachers/${id}` : `/sections/${id}`;
    return `[${kind}#${id}](${href})`;
  });
}

type CommentMarkdownProps = {
  content: string;
  className?: string;
};

/**
 * Permissive schema for rehype-sanitize to allow classes and styles.
 * Essential for KaTeX and our custom directives.
 */
const customSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames || []),
    "math",
    "mi",
    "mo",
    "mn",
    "mrow",
    "msup",
    "msub",
    "mfrac",
    "msqrt",
    "mtable",
    "mtr",
    "mtd",
    "semantics",
    "annotation",
    "ins",
    "mark",
    "sup",
    "sub",
    "center",
  ],
  attributes: {
    ...defaultSchema.attributes,
    "*": [
      ...(defaultSchema.attributes?.["*"] || []),
      "className",
      "class",
      "style",
    ],
    div: [
      ...(defaultSchema.attributes?.div || []),
      "className",
      "class",
      "style",
    ],
    span: [
      ...(defaultSchema.attributes?.span || []),
      "className",
      "class",
      "style",
    ],
  },
};

/**
 * Plugin to parse {width=200 align=center} syntax after images/links.
 */
function rehypeAttributes() {
  return (tree: any) => {
    visit(
      tree,
      "element",
      (node: any, index: number | undefined, parent: any) => {
        if (node.tagName !== "img" && node.tagName !== "a") return;
        if (!parent || typeof index !== "number") return;

        const next = parent.children[index + 1];
        if (next?.type === "text" && next.value) {
          const match = next.value.match(/^\s*\{([^}]+)\}/);
          if (match) {
            const attrString = match[1];
            const attrs = attrString.split(/\s+/);
            node.properties = node.properties || {};
            attrs.forEach((attr: string) => {
              const parts = attr.split("=");
              if (parts.length === 2) {
                const [key, value] = parts;
                const normalizedKey = key === "class" ? "className" : key;
                node.properties[normalizedKey] = value.replace(/['"]/g, "");
              }
            });
            next.value = next.value.replace(/^\s*\{([^}]+)\}/, "").trim();
            // If the text node is now empty, remove it
            if (!next.value) {
              parent.children.splice(index + 1, 1);
            }
          }
        }
      },
    );
  };
}

/**
 * Plugin to transform remark-directive nodes into HAST nodes.
 */
function directivePlugin() {
  return (tree: any) => {
    visit(tree, (node: any) => {
      if (
        node.type === "containerDirective" ||
        node.type === "leafDirective" ||
        node.type === "textDirective"
      ) {
        if (!node.data) {
          node.data = {};
        }
        const data = node.data;
        const attributes = node.attributes || {};

        data.hName = node.name === "center" ? "center" : "div";
        data.hProperties = {
          ...attributes,
          className: cn(
            "markdown-directive",
            `directive-${node.name}`,
            node.name === "center" && "text-center",
            attributes.class,
            attributes.className,
          ),
        };
      }
    });
  };
}

export function CommentMarkdown({ content, className }: CommentMarkdownProps) {
  const [isMounted, setIsMounted] = useState(false);
  const processedContent = useMemo(
    () => preprocessMarkdown(content),
    [content],
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className={cn("space-y-3 text-sm text-foreground", className)}>
        <pre className="whitespace-pre-wrap text-xs text-muted-foreground">
          {content}
        </pre>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "space-y-3 text-sm text-foreground",
        // Global styles for markdown elements
        "[&_a]:text-primary [&_a]:underline-offset-4 hover:[&_a]:underline",
        "[&_blockquote]:border-l-2 [&_blockquote]:border-muted [&_blockquote]:pl-3",
        "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-muted [&_pre]:p-3",
        "[&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4",
        "[&_img]:max-w-full [&_img]:rounded-lg",
        "[&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-bold [&_h3]:text-base [&_h3]:font-bold",
        "[&_table]:w-full [&_table]:border-collapse [&_table]:my-4",
        "[&_th]:border [&_th]:border-muted [&_th]:bg-muted/30 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold",
        "[&_td]:border [&_td]:border-muted [&_td]:px-3 [&_td]:py-2",
        "[&_sup]:text-[0.7em] [&_sub]:text-[0.7em]",
        "[&_ins]:bg-green-500/10 [&_ins]:no-underline [&_mark]:bg-yellow-500/20 [&_mark]:px-0.5",
        // Directive specific styles
        "[&_.markdown-directive]:my-4 [&_.markdown-directive]:rounded-xl [&_.markdown-directive]:p-4 [&_.markdown-directive]:border",
        "[&_.directive-tip]:bg-green-500/5 [&_.directive-tip]:border-green-500/20 [&_.directive-tip]:before:content-['💡_Tip'] [&_.directive-tip]:before:block [&_.directive-tip]:before:font-bold [&_.directive-tip]:before:mb-2 [&_.directive-tip]:before:text-green-600",
        "[&_.directive-warning]:bg-yellow-500/5 [&_.directive-warning]:border-yellow-500/20 [&_.directive-warning]:before:content-['⚠️_Warning'] [&_.directive-warning]:before:block [&_.directive-warning]:before:font-bold [&_.directive-warning]:before:mb-2 [&_.directive-warning]:before:text-yellow-600",
        "[&_.directive-error]:bg-red-500/5 [&_.directive-error]:border-red-500/20 [&_.directive-error]:before:content-['🚫_Error'] [&_.directive-error]:before:block [&_.directive-error]:before:font-bold [&_.directive-error]:before:mb-2 [&_.directive-error]:before:text-red-600",
        className,
      )}
    >
      <MarkdownErrorBoundary
        fallback={
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
            <p className="mb-2 text-xs font-semibold text-destructive">
              Markdown 渲染出错，已回退到纯文本模式：
            </p>
            <pre className="whitespace-pre-wrap text-xs text-muted-foreground">
              {content}
            </pre>
          </div>
        }
      >
        <ReactMarkdown
          remarkPlugins={[
            remarkGfm,
            remarkMath,
            remarkDirective,
            [remarkEmoji, { emoticon: true }],
            directivePlugin,
          ]}
          rehypePlugins={[
            rehypeAttributes,
            rehypeKatex,
            [rehypeSanitize, customSchema],
          ]}
          components={{
            a: ({ href, children, ...props }: any) => {
              const { _node, ...rest } = props;
              const safeHref = href ?? "";
              const isExternal = safeHref.startsWith("http");
              return (
                <a
                  href={safeHref}
                  target={isExternal ? "_blank" : undefined}
                  rel={isExternal ? "noopener noreferrer" : undefined}
                  {...rest}
                >
                  {children}
                </a>
              );
            },
            img: ({ src, alt, ...props }: any) => {
              const { _node, width, height, align, ...rest } = props;
              const w = Number(width) || 800;
              const h = Number(height) || 450;
              return (
                <NextImage
                  src={src ?? ""}
                  alt={alt ?? ""}
                  unoptimized
                  width={w}
                  height={h}
                  style={{ maxWidth: "100%", height: "auto", width: "auto" }}
                  className={cn(
                    "rounded-lg",
                    align === "center" && "mx-auto block",
                    align === "right" && "ml-auto block",
                    rest.className,
                  )}
                  {...rest}
                />
              );
            },
            center: ({ children, ...props }: any) => {
              const { _node, ...rest } = props;
              return (
                <span className="block text-center" {...rest}>
                  {children}
                </span>
              );
            },
            // Ensure typography elements are rendered correctly
            ins: ({ children, ...props }: any) => {
              const { _node, ...rest } = props;
              return <ins {...rest}>{children}</ins>;
            },
            mark: ({ children, ...props }: any) => {
              const { _node, ...rest } = props;
              return <mark {...rest}>{children}</mark>;
            },
            sub: ({ children, ...props }: any) => {
              const { _node, ...rest } = props;
              return <sub {...rest}>{children}</sub>;
            },
            sup: ({ children, ...props }: any) => {
              const { _node, ...rest } = props;
              return <sup {...rest}>{children}</sup>;
            },
          }}
        >
          {processedContent}
        </ReactMarkdown>
      </MarkdownErrorBoundary>
    </div>
  );
}
