import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { Logo } from "@/components/logo";
import { siteConfig } from "./site.config";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <>
          <Logo className="size-5" />
          <span className="font-medium font-mono text-sm">
            {siteConfig.name}
          </span>
        </>
      ),
    },
    searchToggle: {
      enabled: false,
    },
    links: siteConfig.nav.map((item) => ({
      type: "main",
      text: item.label,
      url: item.href,
    })),
    githubUrl: `https://github.com/${siteConfig.github.user}/${siteConfig.github.repo}`,
  };
}
