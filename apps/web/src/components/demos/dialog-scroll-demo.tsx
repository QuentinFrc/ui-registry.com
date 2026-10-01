"use client";

import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  type DialogScroll,
  DialogTitle,
  DialogTrigger,
} from "@registry/kit/registry/base-nova/ui/dialog";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  type SheetSide,
  SheetTitle,
  SheetTrigger,
} from "@registry/kit/registry/base-nova/ui/sheet";
import { useState } from "react";
import {
  DemoFrame,
  LongContent,
  Segmented,
  Toggle,
} from "@/components/demos/demo-controls";
import { Button } from "@/components/ui/button";

const SCROLL_MODES = ["body", "content", "portal"] as const;
const SIDES = ["right", "bottom", "left", "top"] as const;

export function DialogScrollDemo() {
  const [scroll, setScroll] = useState<DialogScroll>("body");
  const [sticky, setSticky] = useState(true);

  return (
    <DemoFrame
      controls={
        <>
          <Segmented
            label="scroll"
            onChange={setScroll}
            options={SCROLL_MODES}
            value={scroll}
          />
          <Toggle checked={sticky} label="sticky" onChange={setSticky} />
        </>
      }
    >
      <Dialog>
        <DialogTrigger render={<Button variant="outline" />}>
          Open dialog
        </DialogTrigger>
        <DialogContent scroll={scroll}>
          <DialogHeader sticky={sticky}>
            <DialogTitle>Workspace policies</DialogTitle>
            <DialogDescription>
              {`scroll="${scroll}"${sticky ? ", sticky header and footer" : ""}`}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <LongContent />
          </DialogBody>
          <DialogFooter sticky={sticky}>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <DialogClose render={<Button />}>Accept</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DemoFrame>
  );
}

export function SheetScrollDemo() {
  const [scroll, setScroll] = useState<DialogScroll>("body");
  const [side, setSide] = useState<SheetSide>("right");
  const [sticky, setSticky] = useState(true);

  return (
    <DemoFrame
      controls={
        <>
          <Segmented
            label="side"
            onChange={setSide}
            options={SIDES}
            value={side}
          />
          <Segmented
            label="scroll"
            onChange={setScroll}
            options={SCROLL_MODES}
            value={scroll}
          />
          <Toggle checked={sticky} label="sticky" onChange={setSticky} />
        </>
      }
    >
      <Sheet>
        <SheetTrigger render={<Button variant="outline" />}>
          Open sheet
        </SheetTrigger>
        <SheetContent scroll={scroll} side={side}>
          <SheetHeader sticky={sticky}>
            <SheetTitle>Workspace policies</SheetTitle>
            <SheetDescription>
              {`side="${side}", scroll="${scroll}"`}
            </SheetDescription>
          </SheetHeader>
          <SheetBody>
            <LongContent />
          </SheetBody>
          <SheetFooter sticky={sticky}>
            <SheetClose render={<Button />}>Done</SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </DemoFrame>
  );
}
