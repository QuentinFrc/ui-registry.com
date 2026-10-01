import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  createDialogStack,
  DialogStackProvider,
  type DialogStackRootProps,
  useDialogStack,
} from "../src/index.js";

const Root = ({ children }: DialogStackRootProps) => <>{children}</>;
const Confirm = ({ title }: { title: string }) => <p>{title}</p>;
const useConfirm = createDialogStack(Confirm);

describe("DialogStackProvider", () => {
  it("renders its children and an empty stack", () => {
    expect(
      renderToStaticMarkup(
        <DialogStackProvider root={Root}>
          <main>app</main>
        </DialogStackProvider>
      )
    ).toBe("<main>app</main>");
  });

  it("exposes controls to descendants", () => {
    const Probe = () => {
      const confirm = useConfirm();
      return <span>{`${typeof confirm.push}:${confirm.stack.length}`}</span>;
    };
    expect(
      renderToStaticMarkup(
        <DialogStackProvider root={Root}>
          <Probe />
        </DialogStackProvider>
      )
    ).toBe("<span>function:0</span>");
  });

  it("throws outside the provider", () => {
    const Probe = () => {
      useDialogStack();
      return null;
    };
    expect(() => renderToStaticMarkup(<Probe />)).toThrow(
      "useDialogStack must be used within <DialogStackProvider>."
    );
  });
});
