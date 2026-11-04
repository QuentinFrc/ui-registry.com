"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

interface TocItem {
  depth: 2 | 3;
  id: string;
  title: string;
}

// Headings are read from the rendered article: MDX pages are plain modules,
// so the DOM is the simplest shared source for every docs page.
const HEADINGS_SELECTOR =
  "[data-docs-content] h2[id], [data-docs-content] h3[id]";
// A heading counts as "current" once it crosses the top fifth of the screen.
const ACTIVE_ROOT_MARGIN = "0px 0px -80% 0px";

export function TableOfContents() {
  const pathname = usePathname();
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>();

  // pathname is not read inside: it re-runs the effect after each client-side
  // navigation, when the article (and its headings) changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    const headings = Array.from(
      document.querySelectorAll<HTMLHeadingElement>(HEADINGS_SELECTOR)
    );
    setItems(
      headings.map((heading) => ({
        id: heading.id,
        title: heading.textContent ?? "",
        depth: heading.tagName === "H3" ? 3 : 2,
      }))
    );
    setActiveId(headings[0]?.id);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: ACTIVE_ROOT_MARGIN }
    );
    for (const heading of headings) {
      observer.observe(heading);
    }
    return () => observer.disconnect();
  }, [pathname]);

  if (items.length === 0) {
    return null;
  }

  return (
    <nav aria-label="On this page" className="flex flex-col gap-3">
      <p className="font-medium text-foreground text-xs">On this page</p>
      <ul className="flex flex-col gap-0.5 text-[13px]">
        {items.map((item) => (
          <li key={item.id}>
            <a
              className={cn(
                "block py-1 leading-snug transition-colors",
                item.depth === 3 && "pl-3",
                item.id === activeId
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              href={`#${item.id}`}
            >
              {item.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
