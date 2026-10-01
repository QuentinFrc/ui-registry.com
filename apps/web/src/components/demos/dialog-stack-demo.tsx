"use client";

import { DialogStackProvider } from "@registry/dialog-stack/registry/base-nova/dialog-stack/dialog-stack";
import {
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@registry/kit/registry/base-nova/ui/dialog";
import {
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@registry/kit/registry/base-nova/ui/sheet";
import {
  createDialogStack,
  type DialogSlotProps,
  useDialogStack,
} from "@ui-registry/dialog-stack";
import { DemoFrame } from "@/components/demos/demo-controls";
import { Button } from "@/components/ui/button";

const MEMBERS = ["Ada Lovelace", "Grace Hopper", "Alan Turing"] as const;

type ConfirmDialogProps = DialogSlotProps & {
  description: string;
  onConfirm?: () => void;
  title: string;
};

function ConfirmDialog({
  title,
  description,
  onConfirm,
  close,
}: ConfirmDialogProps) {
  return (
    <DialogContent showCloseButton={false}>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button onClick={close} variant="outline">
          Cancel
        </Button>
        <Button
          onClick={() => {
            onConfirm?.();
            close();
          }}
        >
          Confirm
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function MembersSheet({ project }: DialogSlotProps & { project: string }) {
  const confirm = useConfirmDialog();

  return (
    <SheetContent>
      <SheetHeader>
        <SheetTitle>Members</SheetTitle>
        <SheetDescription>{project}</SheetDescription>
      </SheetHeader>
      <SheetBody>
        <ul className="flex flex-col divide-y">
          {MEMBERS.map((member) => (
            <li className="flex items-center justify-between py-2" key={member}>
              {member}
              <Button
                onClick={() =>
                  confirm.push({
                    title: `Remove ${member}?`,
                    description: "They lose access to this project.",
                  })
                }
                size="sm"
                variant="ghost"
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      </SheetBody>
    </SheetContent>
  );
}

function ProjectDialog({
  name,
  close,
  depth,
  stackSize,
}: DialogSlotProps & { name: string }) {
  const confirm = useConfirmDialog();
  const members = useMembersSheet();

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{name}</DialogTitle>
        <DialogDescription>
          {`depth ${depth} · ${stackSize} open`}
        </DialogDescription>
      </DialogHeader>
      <DialogBody>
        Open the members sheet, then remove someone: the confirm dialog stacks
        on top of the sheet, which stacks on top of this dialog.
      </DialogBody>
      <DialogFooter>
        <Button
          onClick={() =>
            confirm.push(
              {
                title: `Delete ${name}?`,
                description:
                  "Confirming closes this dialog too. Escape and outside clicks are disabled.",
                onConfirm: close,
              },
              { dismissible: false }
            )
          }
          variant="outline"
        >
          Delete
        </Button>
        <Button onClick={() => members.push({ project: name })}>Members</Button>
      </DialogFooter>
    </DialogContent>
  );
}

const useConfirmDialog = createDialogStack(ConfirmDialog);
const useMembersSheet = createDialogStack(MembersSheet);
const useProjectDialog = createDialogStack(ProjectDialog);

function StackTrigger() {
  const project = useProjectDialog();
  const { stack } = useDialogStack();

  return (
    <>
      <Button
        onClick={() => project.push({ name: "acme/web" })}
        variant="outline"
      >
        Open project
      </Button>
      <span className="font-mono text-muted-foreground text-xs">
        {`stack: ${stack.length}`}
      </span>
    </>
  );
}

export function DialogStackDemo() {
  return (
    <DialogStackProvider>
      <DemoFrame>
        <StackTrigger />
      </DemoFrame>
    </DialogStackProvider>
  );
}
