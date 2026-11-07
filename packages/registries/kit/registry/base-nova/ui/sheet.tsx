"use client";

import { Dialog as SheetPrimitive } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";
import type * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Which element scrolls when the sheet is taller than the screen.
 * - `body`: only `SheetBody`; header and footer stay in place.
 * - `content`: the whole panel; use `sticky` on header / footer to pin them.
 * - `portal`: the viewport around the panel, like a page.
 */
type SheetScroll = "body" | "content" | "portal";

type SheetSide = "top" | "right" | "bottom" | "left";

function Sheet({ ...props }: SheetPrimitive.Root.Props) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({ ...props }: SheetPrimitive.Trigger.Props) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({ ...props }: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal({ ...props }: SheetPrimitive.Portal.Props) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

function SheetOverlay({ className, ...props }: SheetPrimitive.Backdrop.Props) {
  return (
    <SheetPrimitive.Backdrop
      className={cn(
        "fixed inset-0 z-50 bg-black/10 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs",
        className
      )}
      data-slot="sheet-overlay"
      {...props}
    />
  );
}

function SheetViewport({
  className,
  scroll = "body",
  side = "right",
  ...props
}: SheetPrimitive.Viewport.Props & { scroll?: SheetScroll; side?: SheetSide }) {
  return (
    <SheetPrimitive.Viewport
      className={cn(
        "fixed inset-0 z-50 flex overflow-hidden data-[side=bottom]:flex-col data-[side=top]:flex-col data-[scroll=portal]:overflow-y-auto",
        className
      )}
      data-scroll={scroll}
      data-side={side}
      data-slot="sheet-viewport"
      {...props}
    />
  );
}

function SheetPopup({
  className,
  scroll = "body",
  side = "right",
  ...props
}: SheetPrimitive.Popup.Props & { scroll?: SheetScroll; side?: SheetSide }) {
  return (
    <SheetPrimitive.Popup
      className={cn(
        // Layout: header / body / footer rows. Missing slots leave an empty
        // track that collapses to 0; with a full-height panel the empty body
        // track still pushes the footer to the bottom.
        "group/sheet-content relative grid grid-rows-[auto_1fr_auto] bg-background bg-clip-padding text-sm shadow-lg outline-none",
        // Placement: auto margins pin the panel to its side without clipping
        // it when the viewport scrolls.
        "data-[side=bottom]:mt-auto data-[side=left]:mr-auto data-[side=top]:mb-auto data-[side=right]:ml-auto",
        "data-[side=left]:w-3/4 data-[side=right]:w-3/4 data-[side=left]:border-r data-[side=right]:border-l data-[side=left]:sm:max-w-sm data-[side=right]:sm:max-w-sm",
        "data-[side=bottom]:w-full data-[side=top]:w-full data-[side=bottom]:border-t data-[side=top]:border-b",
        "data-[side=left]:data-[scroll=body]:h-full data-[side=left]:data-[scroll=content]:h-full data-[side=right]:data-[scroll=body]:h-full data-[side=right]:data-[scroll=content]:h-full data-[side=left]:data-[scroll=portal]:min-h-full data-[side=right]:data-[scroll=portal]:min-h-full",
        "data-[scroll=body]:max-h-full data-[scroll=content]:max-h-full data-[scroll=body]:overflow-clip data-[scroll=portal]:overflow-clip data-[scroll=content]:overflow-y-auto",
        "transition duration-200 ease-in-out data-[side=left]:data-ending-style:-translate-x-10 data-[side=left]:data-starting-style:-translate-x-10 data-[side=right]:data-ending-style:translate-x-10 data-[side=right]:data-starting-style:translate-x-10 data-[side=bottom]:data-ending-style:translate-y-10 data-[side=bottom]:data-starting-style:translate-y-10 data-[side=top]:data-ending-style:-translate-y-10 data-[side=top]:data-starting-style:-translate-y-10 data-ending-style:opacity-0 data-starting-style:opacity-0",
        // Stacking: sheets behind the topmost one slide away from it and dim.
        "after:pointer-events-none after:absolute after:inset-0 after:z-30 after:bg-black/0 after:transition-colors data-[side=left]:data-nested-dialog-open:translate-x-[calc(1.5rem*var(--nested-dialogs))] data-[side=right]:data-nested-dialog-open:-translate-x-[calc(1.5rem*var(--nested-dialogs))] data-[side=bottom]:data-nested-dialog-open:-translate-y-[calc(1rem*var(--nested-dialogs))] data-[side=top]:data-nested-dialog-open:translate-y-[calc(1rem*var(--nested-dialogs))] data-nested-dialog-open:after:bg-black/5",
        className
      )}
      data-scroll={scroll}
      data-side={side}
      data-slot="sheet-content"
      {...props}
    />
  );
}

function SheetContent({
  className,
  children,
  scroll = "body",
  side = "right",
  showCloseButton = true,
  ...props
}: SheetPrimitive.Popup.Props & {
  scroll?: SheetScroll;
  side?: SheetSide;
  showCloseButton?: boolean;
}) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetViewport scroll={scroll} side={side}>
        <SheetPopup
          className={className}
          scroll={scroll}
          side={side}
          {...props}
        >
          {children}
          {showCloseButton && (
            <SheetPrimitive.Close
              data-slot="sheet-close"
              render={
                <Button
                  className="absolute top-3 right-3 z-20"
                  size="icon-sm"
                  variant="ghost"
                />
              }
            >
              <XIcon />
              <span className="sr-only">Close</span>
            </SheetPrimitive.Close>
          )}
        </SheetPopup>
      </SheetViewport>
    </SheetPortal>
  );
}

function SheetHeader({
  className,
  sticky = false,
  ...props
}: React.ComponentProps<"div"> & { sticky?: boolean }) {
  return (
    <div
      className={cn(
        "row-start-1 flex flex-col gap-0.5 p-4",
        sticky && "sticky top-0 z-10 bg-background",
        className
      )}
      data-slot="sheet-header"
      data-sticky={sticky || undefined}
      {...props}
    />
  );
}

function SheetBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "row-start-2 px-4 pb-4 first:pt-4 group-data-[scroll=body]/sheet-content:min-h-0 group-data-[scroll=body]/sheet-content:overflow-y-auto",
        className
      )}
      data-slot="sheet-body"
      {...props}
    />
  );
}

function SheetFooter({
  className,
  sticky = false,
  ...props
}: React.ComponentProps<"div"> & { sticky?: boolean }) {
  return (
    <div
      className={cn(
        "row-start-3 flex flex-col gap-2 p-4",
        sticky && "sticky bottom-0 z-10 bg-background",
        className
      )}
      data-slot="sheet-footer"
      data-sticky={sticky || undefined}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
  return (
    <SheetPrimitive.Title
      className={cn("font-medium text-base text-foreground", className)}
      data-slot="sheet-title"
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: SheetPrimitive.Description.Props) {
  return (
    <SheetPrimitive.Description
      className={cn("text-muted-foreground text-sm", className)}
      data-slot="sheet-description"
      {...props}
    />
  );
}

export {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPopup,
  SheetPortal,
  type SheetScroll,
  type SheetSide,
  SheetTitle,
  SheetTrigger,
  SheetViewport,
};
