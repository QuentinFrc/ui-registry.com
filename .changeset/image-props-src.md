---
"@ui-registries/pdf": patch
---

Fix `ImageProps` rejecting `src` and `source`: the props type now omits `style` from each member of react-pdf's union instead of from the union as a whole.
