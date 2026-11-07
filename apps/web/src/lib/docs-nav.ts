import type {
  DocsNavLink,
  DocsNavSection,
} from "@/components/docs/docs-sidebar";

/** Every page of a nav, in reading order (previous / next links). */
export const flattenNav = (
  sections: readonly DocsNavSection[]
): readonly DocsNavLink[] => sections.flatMap((section) => section.links);
