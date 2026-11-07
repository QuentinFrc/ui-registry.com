"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";
import type * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Which element scrolls when the dialog is taller than the screen.
 * - `body`: only `DialogBody`; header and footer stay in place.
 * - `content`: the whole popup; use `sticky` on header / footer to pin them.
 * - `portal`: the viewport around the popup, like a page.
 */
type DialogScroll = "body" | "content" | "portal";

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      className={cn(
        "data-open:fade-in-0 data-closed:fade-out-0 fixed inset-0 isolate z-50 bg-black/10 duration-150 data-closed:animate-out data-open:animate-in supports-backdrop-filter:backdrop-blur-xs",
        className
      )}
      data-slot="dialog-overlay"
      {...props}
    />
  );
}

function DialogViewport({
  className,
  scroll = "body",
  ...props
}: DialogPrimitive.Viewport.Props & { scroll?: DialogScroll }) {
  return (
    <DialogPrimitive.Viewport
      className={cn(
        "fixed inset-0 z-50 flex overflow-hidden p-4 data-[scroll=portal]:overflow-y-auto sm:data-[scroll=portal]:py-16",
        className
      )}
      data-scroll={scroll}
      data-slot="dialog-viewport"
      {...props}
    />
  );
}

function DialogPopup({
  className,
  scroll = "body",
  ...props
}: DialogPrimitive.Popup.Props & { scroll?: DialogScroll }) {
  return (
    <DialogPrimitive.Popup
      className={cn(
        // Layout: header / body / footer rows. Missing slots leave an empty
        // track that collapses to 0, so the same template covers every combo.
        "group/dialog-content relative m-auto grid w-full grid-rows-[auto_1fr_auto] rounded-xl bg-background text-sm outline-none ring-1 ring-foreground/10 sm:max-w-sm",
        "data-[scroll=body]:max-h-full data-[scroll=content]:max-h-full data-[scroll=body]:overflow-clip data-[scroll=portal]:overflow-clip data-[scroll=content]:overflow-y-auto",
        "data-open:fade-in-0 data-open:zoom-in-95 data-closed:fade-out-0 data-closed:zoom-out-95 duration-150 data-closed:animate-out data-open:animate-in",
        // Stacking: dialogs behind the topmost one shrink, rise and dim.
        "origin-top transition-[scale,translate] after:pointer-events-none after:absolute after:inset-0 after:z-30 after:rounded-[inherit] after:bg-black/0 after:transition-colors data-nested-dialog-open:-translate-y-[calc(0.75rem*var(--nested-dialogs))] data-nested-dialog-open:scale-[calc(1-0.05*var(--nested-dialogs))] data-nested-dialog-open:after:bg-black/5",
        className
      )}
      data-scroll={scroll}
      data-slot="dialog-content"
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  scroll = "body",
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  scroll?: DialogScroll;
  showCloseButton?: boolean;
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogViewport scroll={scroll}>
        <DialogPopup className={className} scroll={scroll} {...props}>
          {children}
          {showCloseButton && (
            <DialogPrimitive.Close
              data-slot="dialog-close"
              render={
                <Button
                  className="absolute top-2 right-2 z-20"
                  size="icon-sm"
                  variant="ghost"
                />
              }
            >
              <XIcon />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          )}
        </DialogPopup>
      </DialogViewport>
    </DialogPortal>
  );
}

function DialogHeader({
  className,
  sticky = false,
  ...props
}: React.ComponentProps<"div"> & { sticky?: boolean }) {
  return (
    <div
      className={cn(
        "row-start-1 flex flex-col gap-2 p-4",
        sticky && "sticky top-0 z-10 bg-background",
        className
      )}
      data-slot="dialog-header"
      data-sticky={sticky || undefined}
      {...props}
    />
  );
}

function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "row-start-2 px-4 pb-4 first:pt-4 group-data-[scroll=body]/dialog-content:min-h-0 group-data-[scroll=body]/dialog-content:overflow-y-auto",
        className
      )}
      data-slot="dialog-body"
      {...props}
    />
  );
}

function DialogFooter({
  className,
  showCloseButton = false,
  sticky = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean;
  sticky?: boolean;
}) {
  return (
    <div
      className={cn(
        // Opaque equivalent of bg-muted/50, so content never shows through
        // a sticky footer.
        "row-start-3 flex flex-col-reverse gap-2 border-t bg-[color-mix(in_oklab,var(--color-muted)_50%,var(--color-background))] p-4 sm:flex-row sm:justify-end",
        sticky && "sticky bottom-0 z-10",
        className
      )}
      data-slot="dialog-footer"
      data-sticky={sticky || undefined}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>
          Close
        </DialogPrimitive.Close>
      )}
    </div>
  );
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      className={cn("font-medium text-base leading-none", className)}
      data-slot="dialog-title"
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      className={cn(
        "text-muted-foreground text-sm *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      data-slot="dialog-description"
      {...props}
    />
  );
}

export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPopup,
  DialogPortal,
  type DialogScroll,
  DialogTitle,
  DialogTrigger,
  DialogViewport,
};
