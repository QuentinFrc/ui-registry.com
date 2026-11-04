import Image from "next/image";
import { cn } from "@/lib/cn";

// Three A4 pages fanned out: the last one sits in front, the others peek out
// behind it and spread when a `group` ancestor is hovered.
const PAGE_POSES = [
  "-translate-x-[42%] -rotate-6 group-hover:-translate-x-[50%] group-hover:-rotate-9",
  "translate-x-[42%] rotate-6 group-hover:translate-x-[50%] group-hover:rotate-9",
  "-translate-y-1 group-hover:-translate-y-3",
] as const;

// Rendered previews are A4 at 1.5x (see pdf:previews).
const PAGE_WIDTH = 629;
const PAGE_HEIGHT = 892;

interface PagesFanProps {
  alt: string;
  className?: string;
  /** Width of each page, as a share of the container (Tailwind class). */
  pageClassName?: string;
  srcs: readonly string[];
}

export function PagesFan({
  alt,
  className,
  pageClassName = "top-[12%] w-[34%]",
  srcs,
}: PagesFanProps) {
  return (
    <div
      aria-label={alt}
      className={cn(
        "relative flex h-full w-full items-end justify-center overflow-hidden",
        className
      )}
      role="img"
    >
      {srcs.slice(0, PAGE_POSES.length).map((src, index) => (
        <Image
          alt=""
          className={cn(
            "absolute h-auto bg-white shadow-xl ring-1 ring-black/10 transition-transform duration-500 ease-out",
            pageClassName,
            PAGE_POSES[index]
          )}
          height={PAGE_HEIGHT}
          key={src}
          sizes="(min-width: 640px) 200px, 34vw"
          src={src}
          width={PAGE_WIDTH}
        />
      ))}
    </div>
  );
}
