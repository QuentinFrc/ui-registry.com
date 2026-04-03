import { CopyButton } from "@/components/docs/copy-button";

interface InstallCommandProps {
  name: string;
  registry: string;
}

export function InstallCommand({ registry, name }: InstallCommandProps) {
  const command = `npx shadcn@latest add ${registry}/${name}`;

  return (
    <figure className="relative" data-rehype-pretty-code-figure="">
      <CopyButton value={command} />
      <pre className="overflow-x-auto rounded-lg border bg-secondary/50 p-4">
        <code className="font-mono text-sm">{command}</code>
      </pre>
    </figure>
  );
}
