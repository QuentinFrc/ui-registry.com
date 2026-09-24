# @ui-registry/flash

Encode a flash message into the URL so it survives a redirect — Rails/Laravel-style, for React and Next.js apps.

> Status: pre-release scaffold. API will change.

## Install

```sh
pnpm add @ui-registry/flash
```

## Usage

```ts
import { encodeFlash, decodeFlash, FLASH_PARAM } from "@ui-registry/flash";

// Producer side (before redirect)
const url = `/login?${FLASH_PARAM}=${encodeFlash({
  message: "Welcome back",
  level: "success",
})}`;

// Consumer side (after redirect)
const flash = decodeFlash(new URL(window.location.href).searchParams.get(FLASH_PARAM));
```

See [ui-registry.com/packages/flash](https://ui-registry.com/packages/flash) for the case study.
