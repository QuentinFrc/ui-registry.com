"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import {
  type DialogStackRootProps,
  DialogStackProvider as StackProvider,
} from "@ui-registry/dialog-stack";
import type { ReactNode } from "react";

// Close reasons a non-dismissible dialog ignores. Close buttons still work.
const DISMISS_REASONS = new Set<string>(["escape-key", "outside-press"]);

/**
 * Base UI root driven by the stack. Nested rendering lets Base UI handle
 * focus, Escape and the `data-nested-dialog-open` / `--nested-dialogs`
 * styling hooks used by `dialog.tsx` and `sheet.tsx`.
 */
function DialogStackRoot({
  dismissible,
  onOpenChange,
  ...props
}: DialogStackRootProps) {
  return (
    <DialogPrimitive.Root
      {...props}
      disablePointerDismissal={!dismissible}
      onOpenChange={(open, { reason }) => {
        const blocked = !(open || dismissible) && DISMISS_REASONS.has(reason);
        if (!blocked) {
          onOpenChange(open);
        }
      }}
    />
  );
}

/**
 * Mount once near the app root. Components bound with `createDialogStack`
 * render `DialogContent` or `SheetContent` only: the stack owns the root.
 */
function DialogStackProvider({ children }: { children?: ReactNode }) {
  return <StackProvider root={DialogStackRoot}>{children}</StackProvider>;
}

export { DialogStackProvider };
