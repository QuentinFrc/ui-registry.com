import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DemoFrame({
  children,
  controls,
}: {
  children: ReactNode;
  controls?: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg border">
      {controls ? (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b bg-muted/40 px-4 py-3 text-sm">
          {controls}
        </div>
      ) : null}
      <div className="flex min-h-40 flex-wrap items-center justify-center gap-3 p-8">
        {children}
      </div>
    </div>
  );
}

interface SegmentedProps<T extends string> {
  label: string;
  onChange: (value: T) => void;
  options: readonly T[];
  value: T;
}

export function Segmented<T extends string>({
  label,
  onChange,
  options,
  value,
}: SegmentedProps<T>) {
  return (
    <fieldset className="flex items-center gap-2">
      <legend className="float-left mr-2 font-mono text-muted-foreground text-xs">
        {label}
      </legend>
      <div className="inline-flex rounded-md border bg-background p-0.5">
        {options.map((option) => (
          <label
            className={cn(
              "cursor-pointer rounded px-2 py-0.5 font-mono text-xs transition-colors has-focus-visible:ring-2 has-focus-visible:ring-ring/50",
              option === value
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            )}
            key={option}
          >
            <input
              checked={option === value}
              className="sr-only"
              name={label}
              onChange={() => onChange(option)}
              type="radio"
              value={option}
            />
            {option}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function Toggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 font-mono text-muted-foreground text-xs">
      <input
        checked={checked}
        className="accent-foreground"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      {label}
    </label>
  );
}

const PARAGRAPHS = [
  "Every workspace keeps its own billing profile, members and audit log. Moving a project between workspaces transfers its history but not its integrations.",
  "Invitations expire after seven days. Pending invites count towards your seat limit until they are accepted or revoked.",
  "Owners can transfer ownership at any time. The previous owner keeps admin rights unless they remove themselves.",
  "Deleted projects stay recoverable for thirty days. After that, backups are purged and the slug becomes available again.",
  "Webhooks are retried with exponential backoff for up to 24 hours. Failed deliveries show up in the audit log with the response body.",
  "API tokens inherit the permissions of the member who created them. Rotating a token revokes the previous one immediately.",
  "Usage is metered per workspace and billed monthly. Overages are prorated to the day and appear on the next invoice.",
  "Single sign-on applies to every member whose email matches a verified domain. Guests keep password authentication.",
  "Exports include every project, member and setting as JSON. Large exports are delivered by email as a download link.",
  "Custom roles combine any set of permissions. Changes apply to every member with that role on their next request.",
] as const;

export function LongContent() {
  return (
    <div className="flex flex-col gap-3 text-muted-foreground leading-relaxed">
      {PARAGRAPHS.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </div>
  );
}
