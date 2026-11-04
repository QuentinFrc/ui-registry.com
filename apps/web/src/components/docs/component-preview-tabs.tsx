"use client";

import { Button } from "@repo/ui/components/ui/button";
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockHeader,
  CodeBlockLine,
  CodeBlockTitle,
} from "@repo/ui/components/ui/code-block";
import { FileCodeIcon } from "lucide-react";
import { type ReactNode, useId, useState } from "react";
import { cn } from "@/lib/cn";

const SHORT_CODE_LINES = 8;

interface ComponentPreviewTabsProps {
  code: string;
  hideCode?: boolean;
  lines: ReactNode[];
  preview: ReactNode;
  title: string;
}

export function ComponentPreviewTabs({
  code,
  hideCode = false,
  lines,
  preview,
  title,
}: ComponentPreviewTabsProps) {
  // Short examples are shown in full; longer ones start collapsed.
  const collapsible = lines.length > SHORT_CODE_LINES;
  const [codeVisible, setCodeVisible] = useState(!collapsible);
  const id = useId();

  return (
    <div
      className="not-prose group relative flex flex-col overflow-hidden rounded-2xl border"
      data-slot="component-preview"
    >
      <div data-slot="preview">{preview}</div>
      {hideCode ? null : (
        <CodeBlock
          className="rounded-none border-0 border-t bg-muted/30"
          data-code-visible={codeVisible}
        >
          <CodeBlockHeader>
            <CodeBlockTitle className="font-mono font-normal text-muted-foreground text-xs">
              <FileCodeIcon />
              {title}
            </CodeBlockTitle>
            <CodeBlockActions>
              {collapsible && codeVisible ? (
                <Button
                  aria-controls={id}
                  aria-expanded
                  className="text-muted-foreground"
                  onClick={() => setCodeVisible(false)}
                  size="xs"
                  variant="ghost"
                >
                  Collapse
                </Button>
              ) : null}
              <CodeBlockCopyButton value={code} />
            </CodeBlockActions>
          </CodeBlockHeader>
          <div className="relative">
            <CodeBlockContent
              className={cn(
                "text-[13px]",
                codeVisible
                  ? "scroll-fade-y max-h-[32rem]"
                  : "max-h-32 overflow-hidden"
              )}
              id={id}
              tabIndex={codeVisible ? 0 : -1}
            >
              {lines.map((line, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: lines are positional
                <CodeBlockLine key={index}>{line}</CodeBlockLine>
              ))}
            </CodeBlockContent>
            {codeVisible ? null : (
              <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-background via-background/70 to-transparent pb-4">
                <Button
                  aria-controls={id}
                  aria-expanded={false}
                  className="rounded-lg bg-background shadow-none"
                  onClick={() => setCodeVisible(true)}
                  size="sm"
                  variant="outline"
                >
                  View code
                </Button>
              </div>
            )}
          </div>
        </CodeBlock>
      )}
    </div>
  );
}
