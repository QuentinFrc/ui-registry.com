"use client";

import { Button } from "@repo/ui/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@repo/ui/components/ui/collapsible";
import { Separator } from "@repo/ui/components/ui/separator";
import * as React from "react";
import { cn } from "@/lib/cn";

export function CodeCollapsibleWrapper({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const [isOpened, setIsOpened] = React.useState(false);

  return (
    <Collapsible
      className={cn("group/collapsible relative md:-mx-1", className)}
      onOpenChange={setIsOpened}
      open={isOpened}
    >
      <CollapsibleTrigger
        render={
          <div className="absolute top-1.5 right-9 z-10 flex items-center">
            <Button
              className="h-7 rounded-md px-2 text-muted-foreground"
              size="sm"
              variant="ghost"
            >
              {isOpened ? "Collapse" : "Expand"}
            </Button>
            <Separator className="mx-1.5 h-4!" orientation="vertical" />
          </div>
        }
      />
      <CollapsibleContent className="relative mt-6 overflow-hidden [&>figure]:mt-0 [&>figure]:md:mx-0!">
        {children}
      </CollapsibleContent>
      <CollapsibleTrigger className="absolute inset-x-0 -bottom-2 flex h-20 items-center justify-center rounded-b-lg bg-gradient-to-b from-code/70 to-code text-muted-foreground text-sm group-data-[state=open]/collapsible:hidden">
        {isOpened ? "Collapse" : "Expand"}
      </CollapsibleTrigger>
    </Collapsible>
  );
}
