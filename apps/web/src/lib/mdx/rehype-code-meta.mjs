// Keeps the meta string of fenced code blocks (```tsx title="app.tsx") on the
// <code> element as `data-meta`, so the MDX `pre` component can read it.
// MDX stores it on `node.data.meta`, which does not reach React props.

const visit = (node, parent) => {
  if (
    node.type === "element" &&
    node.tagName === "code" &&
    parent?.tagName === "pre" &&
    node.data?.meta
  ) {
    node.properties = { ...node.properties, dataMeta: node.data.meta };
  }
  for (const child of node.children ?? []) {
    visit(child, node);
  }
};

export default function rehypeCodeMeta() {
  return (tree) => {
    visit(tree);
  };
}
