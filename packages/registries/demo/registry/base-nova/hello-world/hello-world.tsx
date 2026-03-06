"use client";

import { Button } from "@/components/ui/button";

export function HelloWorld() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <h2 className="font-bold text-2xl">Hello World</h2>
      <p className="text-muted-foreground">
        This is a demo registry component.
      </p>
      <Button onClick={() => alert("Hello from the registry!")}>
        Click me
      </Button>
    </div>
  );
}
