"use client";

import { evaluate } from "@mdx-js/mdx";
import * as provider from "@mdx-js/react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import * as runtime from "react/jsx-runtime";
import "katex/dist/katex.min.css";
import rehypeKatex from "rehype-katex";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { cn } from "@/lib/utils";

const mentionPattern = /\b(section|teacher)#(\d+)\b/g;

function replaceMentions(value: string) {
  return value.replace(mentionPattern, (_match, kind, id) => {
    const href = kind === "teacher" ? `/teachers/${id}` : `/sections/${id}`;
    return `[${kind}#${id}](${href})`;
  });
}

type CommentMarkdownProps = {
  content: string;
  className?: string;
};

const mdxComponents = {
  a: ({
    href,
    children,
    ...props
  }: {
    href?: string;
    children?: ReactNode;
  }) => {
    const safeHref = href ?? "";
    const isExternal = safeHref.startsWith("http");
    return (
      <a
        href={safeHref}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noopener noreferrer" : undefined}
        {...props}
      >
        {children}
      </a>
    );
  },
  img: ({ src, alt, ...props }: { src?: string; alt?: string }) => (
    <img src={src ?? ""} alt={alt ?? ""} loading="lazy" {...props} />
  ),
  Image: ({
    src,
    alt,
    width,
    height,
    align,
  }: {
    src?: string;
    alt?: string;
    width?: number | string;
    height?: number | string;
    align?: "left" | "center" | "right";
  }) => (
    <img
      src={src ?? ""}
      alt={alt ?? ""}
      loading="lazy"
      width={width}
      height={height}
      className={
        align === "center"
          ? "mx-auto"
          : align === "right"
            ? "ml-auto"
            : undefined
      }
    />
  ),
  Center: ({ children }: { children?: ReactNode }) => (
    <div className="text-center">{children}</div>
  ),
};

const mathSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
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
  ],
  attributes: {
    ...defaultSchema.attributes,
    span: ["class", "style"],
    div: ["class", "style"],
    code: ["class"],
    pre: ["class"],
    math: ["xmlns", "display"],
    img: ["src", "alt", "title", "width", "height", "loading"],
  },
};

const allowedMdxComponents = new Set(["Image", "Center"]);

function stripUnsafeMdxNodes(tree: any) {
  if (!tree || !Array.isArray(tree.children)) return;
  tree.children = tree.children.filter((node: any) => {
    if (!node) return false;
    if (
      node.type === "mdxjsEsm" ||
      node.type === "mdxFlowExpression" ||
      node.type === "mdxTextExpression"
    ) {
      return false;
    }
    if (
      node.type === "mdxJsxFlowElement" ||
      node.type === "mdxJsxTextElement"
    ) {
      if (!allowedMdxComponents.has(node.name)) {
        return false;
      }
      if (Array.isArray(node.attributes)) {
        node.attributes = node.attributes.filter((attr: any) => {
          if (attr.type !== "mdxJsxAttribute") return false;
          if (!["src", "alt", "width", "height", "align"].includes(attr.name)) {
            return false;
          }
          if (attr.value === null || typeof attr.value === "string") {
            return true;
          }
          return false;
        });
      }
    }
    stripUnsafeMdxNodes(node);
    return true;
  });
}

function stripUnsafeMdx() {
  return (tree: any) => {
    stripUnsafeMdxNodes(tree);
  };
}

export function CommentMarkdown({ content, className }: CommentMarkdownProps) {
  const mdxSource = useMemo(() => replaceMentions(content), [content]);
  const [Content, setContent] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    let cancelled = false;
    setContent(null);
    evaluate(mdxSource, {
      ...runtime,
      ...provider,
      remarkPlugins: [remarkGfm, remarkMath, stripUnsafeMdx],
      rehypePlugins: [rehypeKatex, [rehypeSanitize, mathSchema]],
    })
      .then((result) => {
        if (cancelled) return;
        setContent(() => result.default);
      })
      .catch(() => {
        if (cancelled) return;
        setContent(() => null);
      });

    return () => {
      cancelled = true;
    };
  }, [mdxSource]);

  return (
    <div
      className={cn(
        "space-y-3 text-sm text-foreground [&_a]:text-primary [&_a]:underline-offset-4 hover:[&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-muted [&_blockquote]:pl-3 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-muted [&_pre]:p-3 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_img]:max-w-full [&_img]:rounded-lg",
        className,
      )}
    >
      {Content ? (
        <provider.MDXProvider components={mdxComponents}>
          <Content />
        </provider.MDXProvider>
      ) : (
        <pre className="whitespace-pre-wrap text-xs text-muted-foreground">
          {content}
        </pre>
      )}
    </div>
  );
}
