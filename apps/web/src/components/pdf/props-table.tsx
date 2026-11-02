import { getPropDocs } from "@/lib/pdf-props";

interface PropsTableProps {
  /** Exported props type of @ui-registries/pdf, e.g. "BlockProps". */
  name: string;
}

export function PropsTable({ name }: PropsTableProps) {
  const props = getPropDocs(name);

  return (
    <div className="not-prose overflow-x-auto rounded-lg border">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/60 text-muted-foreground text-xs">
          <tr>
            <th className="px-4 py-2 font-medium" scope="col">
              Prop
            </th>
            <th className="px-4 py-2 font-medium" scope="col">
              Type
            </th>
            <th className="px-4 py-2 font-medium" scope="col">
              Default
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {props.map((prop) => (
            <tr className="align-top" key={prop.name}>
              <td className="whitespace-nowrap px-4 py-2.5">
                <code className="font-mono text-[13px] text-foreground">
                  {prop.name}
                  {prop.optional ? "?" : ""}
                </code>
              </td>
              <td className="px-4 py-2.5">
                <code className="break-words font-mono text-[12px] text-muted-foreground">
                  {prop.type}
                </code>
                {prop.description ? (
                  <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
                    {prop.description}
                  </p>
                ) : null}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[12px] text-muted-foreground">
                {prop.defaultValue ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
