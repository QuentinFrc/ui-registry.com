# @ui-registry/dialog-stack

Imperative, type-safe dialog stack for React. Push dialogs from anywhere; they
render in one place, nested, so the underlying dialog library (e.g. Base UI)
handles focus trapping, Escape and nested styling on its own.

```bash
pnpm add @ui-registry/dialog-stack
```

## Setup

The provider takes a `root` adapter: a controlled dialog root, rendered once
per stack entry. The `dialog-stack` registry item ships one for Base UI.

```tsx
import { Dialog } from "@base-ui/react/dialog";
import {
  DialogStackProvider,
  type DialogStackRootProps,
} from "@ui-registry/dialog-stack";

const Root = ({ dismissible, onOpenChange, ...props }: DialogStackRootProps) => (
  <Dialog.Root
    {...props}
    disablePointerDismissal={!dismissible}
    onOpenChange={(open) => onOpenChange(open)}
  />
);

<DialogStackProvider root={Root}>
  <App />
</DialogStackProvider>;
```

## Usage

A stacked component renders the dialog **content** only. The stack owns the
root and injects `DialogSlotProps`.

```tsx
import { createDialogStack, type DialogSlotProps } from "@ui-registry/dialog-stack";

function ConfirmDialog({ title, onConfirm, close }: { title: string; onConfirm: () => void } & DialogSlotProps) {
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
      <DialogFooter>
        <Button onClick={() => { onConfirm(); close(); }}>Confirm</Button>
      </DialogFooter>
    </DialogContent>
  );
}

export const useConfirmDialog = createDialogStack(ConfirmDialog);

const confirm = useConfirmDialog();
confirm.push({ title: "Delete?", onConfirm }, { dismissible: false });
```

## API

- `createDialogStack(Component)` returns a hook with `push`, `replace`, `pop`,
  `popTo`, `clear` and `stack`. `push` / `replace` are typed to the component
  props minus `DialogSlotProps`, and return the entry id.
- `PushOptions`: `id`, `dismissible` (default `true`), `onClose` (called once
  the entry has left the stack, after its exit animation).
- `DialogSlotProps`: `dialogId`, `depth` (0 = topmost), `stackSize`, `close()`
  (this dialog and those above), `pop()`, `popTo(id)`.
- `useDialogStack()`: untyped controls (`pop`, `popTo`, `clear`, `stack`).

Closing marks an entry as closing; it is removed when the root reports
`onOpenChangeComplete(false)`, so exit animations play. Pushing drops entries
that are still animating out, so a new dialog never nests under them.
