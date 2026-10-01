import { describe, expectTypeOf, it } from "vitest";
import { createDialogStack, type DialogSlotProps } from "../src/index.js";

const Confirm = ({
  title,
  description,
  pop,
}: { title: string; description?: string } & Pick<DialogSlotProps, "pop">) => (
  <button onClick={pop} type="button">
    {title}
    {description}
  </button>
);
const Settings = ({ tab }: { tab?: "general" | "billing" }) => <p>{tab}</p>;
const WrongSlot = ({ depth }: { depth: string }) => <p>{depth}</p>;

describe("createDialogStack types", () => {
  it("types push to the component's own props, without slot props", () => {
    const useConfirm = createDialogStack(Confirm);
    const confirm = useConfirm();
    expectTypeOf(confirm.push).parameter(0).toEqualTypeOf<{
      title: string;
      description?: string;
    }>();
    // @ts-expect-error title is required
    confirm.push({});
    // @ts-expect-error slot props are injected by the stack
    confirm.push({ title: "Sure?", pop: () => undefined });
  });

  it("makes props optional when the component has no required prop", () => {
    const settings = createDialogStack(Settings)();
    expectTypeOf(settings.push()).toEqualTypeOf<string>();
    settings.push({ tab: "billing" }, { dismissible: false });
  });

  it("rejects components with incompatible slot props", () => {
    // @ts-expect-error depth must be a number
    createDialogStack(WrongSlot);
  });
});
