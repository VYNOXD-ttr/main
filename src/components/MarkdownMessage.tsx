import { Fragment } from "react";
import type { ArtifactItem } from "../types/app";
import { CodeBlock } from "./CodeBlock";

interface MarkdownMessageProps {
  text: string;
  messageId?: string;
  onOpenArtifact?: (artifact: ArtifactItem) => void;
}

interface TextSegment {
  type: "text" | "code";
  content: string;
  language?: string;
}

function splitFencedCodeBlocks(raw: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const regex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        content: raw.slice(lastIndex, match.index),
      });
    }
    segments.push({
      type: "code",
      language: match[1] || "txt",
      content: match[2].replace(/\n$/, ""),
    });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < raw.length) {
    segments.push({
      type: "text",
      content: raw.slice(lastIndex),
    });
  }

  return segments;
}

export function buildArtifactFromCode(
  id: string,
  language: string,
  code: string,
): ArtifactItem {
  const normLang = (language || "txt").toLowerCase().trim();
  const trimmed = code.trim();
  const isPreviewableHtml =
    normLang === "html" ||
    normLang === "htm" ||
    normLang === "svg" ||
    /<!doctype html|<html[\s>]|<svg[\s>]/i.test(trimmed);

  let title = `Cuplikan ${normLang.toUpperCase()}`;
  const titleMatch = trimmed.match(/<title>([^<]+)<\/title>/i);
  if (titleMatch?.[1]) {
    title = titleMatch[1].trim();
  } else if (isPreviewableHtml && /three/i.test(trimmed)) {
    title = "Pratinjau Three.js 3D";
  } else if (isPreviewableHtml) {
    title = "Pratinjau HTML Interaktif";
  } else {
    const firstComment = trimmed.match(/^(?:\/\/|#)\s*(.+)/);
    if (firstComment?.[1]) {
      title = firstComment[1].trim().slice(0, 48);
    }
  }

  return {
    id,
    title,
    language: normLang,
    code,
    isPreviewableHtml,
  };
}

export function extractArtifactsFromText(
  raw: string,
  messageId: string,
): ArtifactItem[] {
  const segments = splitFencedCodeBlocks(raw);
  const items: ArtifactItem[] = [];
  segments.forEach((seg, idx) => {
    if (seg.type !== "code") return;
    const lineCount = seg.content.split("\n").length;
    if (lineCount >= 4 || /<!doctype html|<html|<svg/i.test(seg.content)) {
      items.push(
        buildArtifactFromCode(
          `${messageId}-art-${idx}`,
          seg.language || "txt",
          seg.content,
        ),
      );
    }
  });
  return items;
}

function renderInlineFormatting(line: string) {
  const tokens = line.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return tokens.map((token, idx) => {
    if (token.startsWith("`") && token.endsWith("`") && token.length >= 2) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 font-mono text-[0.875em]"
          style={{
            backgroundColor: "var(--bg-surface-muted)",
            borderRadius: "0.25rem",
          }}
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    if (token.startsWith("**") && token.endsWith("**") && token.length >= 4) {
      return (
        <strong key={idx} className="font-semibold">
          {token.slice(2, -2)}
        </strong>
      );
    }
    return <Fragment key={idx}>{token}</Fragment>;
  });
}

function renderProseBlock(block: string) {
  const lines = block.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = (keyPrefix: string) => {
    if (listItems.length === 0) return;
    elements.push(
      <ul key={`${keyPrefix}-list`} className="my-2 list-disc space-y-1.5 pl-5">
        {listItems.map((item, idx) => (
          <li key={idx} className="leading-relaxed">
            {renderInlineFormatting(item)}
          </li>
        ))}
      </ul>,
    );
    listItems = [];
  };

  lines.forEach((rawLine, index) => {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      flushList(`p-${index}`);
      return;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      listItems.push(trimmed.replace(/^[-*]\s+/, ""));
      return;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      listItems.push(trimmed.replace(/^\d+\.\s+/, ""));
      return;
    }

    flushList(`h-${index}`);

    if (trimmed.startsWith("### ")) {
      elements.push(
        <h4 key={index} className="mt-3 mb-1 font-display text-sm font-semibold">
          {renderInlineFormatting(trimmed.slice(4))}
        </h4>,
      );
    } else if (trimmed.startsWith("## ")) {
      elements.push(
        <h3 key={index} className="mt-3 mb-1 font-display text-base font-semibold">
          {renderInlineFormatting(trimmed.slice(3))}
        </h3>,
      );
    } else {
      elements.push(
        <p key={index} className="my-1.5 leading-relaxed">
          {renderInlineFormatting(trimmed)}
        </p>,
      );
    }
  });

  flushList("end");
  return elements;
}

export function MarkdownMessage({
  text,
  messageId = "msg",
  onOpenArtifact,
}: MarkdownMessageProps) {
  const segments = splitFencedCodeBlocks(text);

  return (
    <div className="space-y-3 text-[15px] leading-relaxed">
      {segments.map((seg, idx) =>
        seg.type === "code" ? (
          <CodeBlock
            key={idx}
            code={seg.content}
            language={seg.language}
            onOpenArtifact={
              onOpenArtifact
                ? () =>
                    onOpenArtifact(
                      buildArtifactFromCode(
                        `${messageId}-art-${idx}`,
                        seg.language || "txt",
                        seg.content,
                      ),
                    )
                : undefined
            }
          />
        ) : (
          <div key={idx}>{renderProseBlock(seg.content)}</div>
        ),
      )}
    </div>
  );
}
