import { isValidElement, type ReactNode } from "react";
import { DocsCodeBlock } from "./code-block";

const LANGUAGE = /language-([\w-]+)/;
const TITLE = /title="([^"]+)"/;

interface CodeElementProps {
  children?: ReactNode;
  className?: string;
  "data-meta"?: string;
}

/** MDX `pre`: fenced code blocks rendered with the shadcn code block. */
export function MdxPre({ children }: { children?: ReactNode }) {
  if (!isValidElement<CodeElementProps>(children)) {
    return <pre>{children}</pre>;
  }
  const { className = "", "data-meta": meta = "" } = children.props;
  const code =
    typeof children.props.children === "string" ? children.props.children : "";
  return (
    <DocsCodeBlock
      code={code}
      language={className.match(LANGUAGE)?.[1]}
      title={meta.match(TITLE)?.[1]}
    />
  );
}
