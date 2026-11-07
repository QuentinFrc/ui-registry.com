"use client";

import { Button } from "@repo/ui/components/ui/button";
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockFooter,
  CodeBlockHeader,
  CodeBlockLine,
  CodeBlockTitle,
} from "@repo/ui/components/ui/code-block";
import { FileCodeIcon, TerminalIcon } from "lucide-react";
import { type ReactNode, useId, useState } from "react";
import { cn } from "@/lib/cn";

const SHELL_LANGUAGES = new Set(["bash", "sh", "shell", "zsh", "shellscript"]);

interface CodeBlockViewProps {
  className?: string;
  code: string;
  collapsible?: boolean;
  language: string;
  lines: ReactNode[];
  title?: string;
}

export function CodeBlockView({
  className,
  code,
  collapsible = false,
  language,
  lines,
  title,
}: CodeBlockViewProps) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const isShell = SHELL_LANGUAGES.has(language);
  const label = title ?? (isShell ? "Terminal" : language);
  const Icon = isShell ? TerminalIcon : FileCodeIcon;
  const collapsed = collapsible && !expanded;

  return (
    <CodeBlock className={cn("not-prose bg-muted/40", className)}>
      <CodeBlockHeader>
        <CodeBlockTitle className="font-mono font-normal text-muted-foreground text-xs">
          <Icon />
          {label}
        </CodeBlockTitle>
        <CodeBlockActions>
          <CodeBlockCopyButton value={code} />
        </CodeBlockActions>
      </CodeBlockHeader>
      <CodeBlockContent
        className={cn(
          "text-[13px]",
          collapsed && "scroll-fade-y max-h-72 overflow-y-hidden"
        )}
        id={id}
      >
        {lines.map((line, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: lines are positional
          <CodeBlockLine key={index}>{line}</CodeBlockLine>
        ))}
      </CodeBlockContent>
      {collapsible ? (
        <CodeBlockFooter className="justify-center">
          <Button
            aria-controls={id}
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
            size="xs"
            variant="ghost"
          >
            {expanded ? "Show less" : `Show all ${lines.length} lines`}
          </Button>
        </CodeBlockFooter>
      ) : null}
    </CodeBlock>
  );
}
