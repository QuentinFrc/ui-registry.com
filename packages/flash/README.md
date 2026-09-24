# @ui-registry/flash

Carry a flash message across a redirect — the Rails / Laravel pattern, for React and Next.js. Typed payloads, pluggable stores, message catalogs and signatures when it matters.

> Status: alpha. v0.2 is a breaking change from v0.1.

## Install

```sh
pnpm add @ui-registry/flash
```

## Usage

Declare one instance, once, and import it everywhere.

```ts
// lib/flash.ts
import { createFlash, type ToastFlash } from "@ui-registry/flash";

export const flash = createFlash<ToastFlash>();
```

```ts
// Producer (Server Action, route handler, client code)
redirect(flash.append("/login", { message: "Signed out", level: "info" }));

// Consumer
flash.read(url);    // Flash<ToastFlash> | null — { payload, id, createdAt }
flash.consume();    // browser: read + strip from history + remember the nonce
flash.strip(url);   // URL without the flash
```

Add protections through options, without changing the API:

| Option | Effect |
| --- | --- |
| `store` | `searchParam()` (default), `hash()`, `sessionStorage()`, `cookie()`, `memory()` or your own |
| `schema` | any [Standard Schema](https://standardschema.dev) (Zod, Valibot, ArkType) — infers `T` |
| `catalog` | message codes instead of free text, see `defineCatalog` |
| `signer` / `verifier` | `hmac({ secret })`, `ed25519.signer()` / `ed25519.verifier()` |
| `ttl`, `scope`, `maxBytes`, `onReject` | expiry, destination check, size limit, rejection hook |

Presets: `createFlash(presets.safe(catalog))` for public apps, `presets.strict({ keys })` for high-stakes messages.

See [ui-registry.com/packages/flash](https://ui-registry.com/packages/flash) for the full guide, the security model and the React integration.
