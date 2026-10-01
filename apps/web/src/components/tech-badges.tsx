import { TECH, type TechId } from "@/lib/tech";

const TechIcon = ({ path, title }: { path: string; title: string }) => (
  <svg
    aria-hidden="true"
    className="size-3 shrink-0 fill-current"
    role="img"
    viewBox="0 0 24 24"
  >
    <title>{title}</title>
    <path d={path} />
  </svg>
);

export const TechBadge = ({ id }: { id: TechId }) => {
  const tech = TECH[id];
  return (
    <a
      className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
      href={tech.href}
      rel="noopener"
      target="_blank"
    >
      <TechIcon path={tech.iconPath} title={tech.label} />
      {tech.label}
    </a>
  );
};

export function TechBadges({ techs }: { techs: readonly TechId[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {techs.map((id) => (
        <TechBadge id={id} key={id} />
      ))}
    </div>
  );
}
