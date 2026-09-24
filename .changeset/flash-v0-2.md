---
"@ui-registry/flash": minor
---

v0.2 — breaking: the global `appendFlash` / `readFlash` / `stripFlash` / `consumeFlash` functions are replaced by a single `createFlash` factory whose configuration is entirely optional.

- `Flash<T>` is now an envelope (`{ payload, id, createdAt }`) and the payload shape is free; `ToastFlash` is provided for toasts.
- Pluggable `FlashStore` contract with `searchParam`, `hash`, `sessionStorage`, `cookie` and `memory` adapters.
- Standard Schema validation (`schema`), message catalogs (`defineCatalog`), HMAC and Ed25519 signatures.
- Expiration, destination scoping, single-use nonce, size limits and an `onReject` hook.
- `presets.safe` and `presets.strict`. The v0.1 URL format is still read by the soft instance.
