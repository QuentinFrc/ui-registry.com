import type { ThemeVars } from "@ui-registries/pdf";
import { Block, cn, Document, Link, Page, Text } from "@ui-registries/pdf";
import type { ReactNode } from "react";

import { Badge } from "./badge";
import { Heading } from "./heading";

export interface ResumeLink {
  /** Text shown in the document, e.g. "linkedin.com/in/jane". */
  label: string;
  url: string;
}

export interface ResumeExperience {
  company: string;
  /** Leave empty for a current position ("Present"). */
  end?: Date;
  /** Bullet points: achievements, scope, impact. */
  highlights?: string[];
  location?: string;
  role: string;
  start: Date;
  /** Short paragraph shown above the highlights. */
  summary?: string;
}

export interface ResumeEducation {
  degree: string;
  /** Extra line: honours, thesis, focus… */
  details?: string;
  end?: Date;
  location?: string;
  school: string;
  start: Date;
}

export interface ResumeSkillGroup {
  items: string[];
  name: string;
}

export interface ResumeLanguage {
  /** Free text, e.g. "Native", "C1", "Professional". */
  level: string;
  name: string;
  /** Optional 1–5 rating, drawn as dots. */
  rating?: number;
}

export interface ResumeProject {
  description: string;
  name: string;
  /** Technologies, shown as a single line under the description. */
  stack?: string[];
  url?: string;
}

export interface ResumeCertification {
  date?: Date;
  issuer: string;
  name: string;
  url?: string;
}

export interface ResumeData {
  certifications?: ResumeCertification[];
  education?: ResumeEducation[];
  email?: string;
  experience: ResumeExperience[];
  /** Job title or one-line positioning, under the name. */
  headline: string;
  languages?: ResumeLanguage[];
  /** Website, LinkedIn, GitHub… rendered as links. */
  links?: ResumeLink[];
  /** BCP 47 locale used for dates, e.g. "en-US". */
  locale?: string;
  location?: string;
  name: string;
  phone?: string;
  projects?: ResumeProject[];
  skills?: ResumeSkillGroup[];
  summary?: string;
}

export interface ResumeLabels {
  certifications: string;
  contact: string;
  education: string;
  experience: string;
  languages: string;
  present: string;
  profile: string;
  projects: string;
  skills: string;
}

const defaultLabels: ResumeLabels = {
  certifications: "Certifications",
  contact: "Contact",
  education: "Education",
  experience: "Experience",
  languages: "Languages",
  present: "Present",
  profile: "Profile",
  projects: "Projects",
  skills: "Skills",
};

// Some locales (fr-FR…) format with a narrow no-break space (U+202F) or a
// minus sign (U+2212), which the built-in PDF fonts lack. Swap them for a
// regular no-break space and a hyphen-minus.
const NARROW_NO_BREAK_SPACE = /\u202f/g;
const MINUS_SIGN = /\u2212/g;

const pdfSafe = <T,>(formatter: { format: (value: T) => string }) => ({
  format: (value: T) =>
    formatter
      .format(value)
      .replace(NARROW_NO_BREAK_SPACE, "\u00a0")
      .replace(MINUS_SIGN, "-"),
});

type Formatter = ReturnType<typeof pdfSafe<Date>>;

const MAX_RATING = 5;
const RATING_STEPS = Array.from({ length: MAX_RATING }, (_, i) => i + 1);
const WHITESPACE = /\s+/g;
const PROTOCOL = /^(https?:)?\/\//;

const initialsOf = (name: string) =>
  name
    .split(WHITESPACE)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");

const stripProtocol = (url: string) => url.replace(PROTOCOL, "");

const joinDot = (...parts: (string | undefined)[]) =>
  parts.filter(Boolean).join(" · ");

// ─── Building blocks ─────────────────────────────────────────────────────────

const SectionTitle = ({ children }: { children: string }) => (
  <Block className="mb-4 flex-row items-center gap-3">
    <Text className="font-bold text-primary text-xs uppercase tracking-widest">
      {children}
    </Text>
    <Block className="flex-1 border-border border-b" />
  </Block>
);

interface SectionProps<T> {
  className?: string;
  getKey: (item: T) => string;
  items?: T[];
  render: (item: T) => ReactNode;
  title: string;
}

// The title is kept on the same page as the first entry, so it is never
// orphaned at the bottom of a page. Sections are spaced with the parent's
// `gap` rather than margins, which would carry over to the top of a new page.
const Section = <T,>({
  className,
  getKey,
  items,
  render,
  title,
}: SectionProps<T>) => {
  const [first, ...rest] = items ?? [];
  if (first === undefined) {
    return null;
  }
  return (
    <Block className={cn("gap-5", className)}>
      <Block breakable={false}>
        <SectionTitle>{title}</SectionTitle>
        {render(first)}
      </Block>
      {rest.map((item) => (
        <Block breakable={false} key={getKey(item)}>
          {render(item)}
        </Block>
      ))}
    </Block>
  );
};

const SidebarTitle = ({ children }: { children: string }) => (
  <Text className="mb-1 font-bold text-primary text-xs uppercase tracking-widest">
    {children}
  </Text>
);

const Rating = ({ value }: { value: number }) => (
  <Block className="flex-row gap-1">
    {RATING_STEPS.map((step) => (
      <Block
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          step <= value ? "bg-primary" : "bg-border"
        )}
        key={step}
      />
    ))}
  </Block>
);

const Bullet = ({ children }: { children: string }) => (
  <Block className="flex-row gap-2">
    <Block className="mt-[5] h-1 w-1 rounded-full bg-muted-foreground" />
    <Text className="flex-1 text-sm leading-snug">{children}</Text>
  </Block>
);

const EntryHeader = ({
  aside,
  children,
  className,
}: {
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) => (
  <Block className="flex-row items-baseline justify-between gap-4">
    <Text className={cn("flex-1 font-semibold", className)}>{children}</Text>
    {aside}
  </Block>
);

const Muted = ({ children }: { children: string }) => (
  <Text className="text-muted-foreground text-xs">{children}</Text>
);

// ─── Entries ─────────────────────────────────────────────────────────────────

const ExperienceEntry = ({
  job,
  range,
}: {
  job: ResumeExperience;
  range: string;
}) => (
  <Block className="gap-1">
    <EntryHeader aside={<Muted>{range}</Muted>} className="text-base">
      {job.role}
    </EntryHeader>
    <Text className="font-medium text-primary">
      {joinDot(job.company, job.location)}
    </Text>
    {job.summary && (
      <Text className="mt-1 text-muted-foreground text-sm leading-snug">
        {job.summary}
      </Text>
    )}
    {job.highlights && job.highlights.length > 0 && (
      <Block className="mt-1.5 gap-1.5">
        {job.highlights.map((highlight) => (
          <Bullet key={highlight}>{highlight}</Bullet>
        ))}
      </Block>
    )}
  </Block>
);

const EducationEntry = ({
  period,
  school,
}: {
  period: string;
  school: ResumeEducation;
}) => (
  <Block className="gap-1">
    <EntryHeader aside={<Muted>{period}</Muted>}>{school.degree}</EntryHeader>
    <Text className="text-muted-foreground">
      {joinDot(school.school, school.location)}
    </Text>
    {school.details && <Muted>{school.details}</Muted>}
  </Block>
);

const ProjectEntry = ({ project }: { project: ResumeProject }) => (
  <Block className="gap-1">
    <EntryHeader
      aside={
        project.url && (
          <Link
            className="text-muted-foreground text-xs no-underline"
            src={project.url}
          >
            {stripProtocol(project.url)}
          </Link>
        )
      }
    >
      {project.name}
    </EntryHeader>
    <Text className="text-muted-foreground text-sm leading-snug">
      {project.description}
    </Text>
    {project.stack && project.stack.length > 0 && (
      <Text className="mt-0.5 font-medium text-primary text-xs">
        {project.stack.join(" · ")}
      </Text>
    )}
  </Block>
);

const CertificationEntry = ({
  cert,
  date,
}: {
  cert: ResumeCertification;
  date?: string;
}) => (
  <Block className="flex-row items-baseline justify-between gap-4">
    <Block className="flex-1 gap-0.5">
      {cert.url ? (
        <Link
          className="font-semibold text-foreground no-underline"
          src={cert.url}
        >
          {cert.name}
        </Link>
      ) : (
        <Text className="font-semibold">{cert.name}</Text>
      )}
      <Text className="text-muted-foreground">{cert.issuer}</Text>
    </Block>
    {date && <Muted>{date}</Muted>}
  </Block>
);

const ContactList = ({ data }: { data: ResumeData }) => (
  <>
    {data.email && (
      <Link
        className="text-foreground no-underline"
        src={`mailto:${data.email}`}
      >
        {data.email}
      </Link>
    )}
    {data.phone && (
      <Link
        className="text-foreground no-underline"
        src={`tel:${data.phone.replace(WHITESPACE, "")}`}
      >
        {data.phone}
      </Link>
    )}
    {data.location && <Text>{data.location}</Text>}
    {data.links?.map((link) => (
      <Link
        className="text-foreground no-underline"
        key={link.url}
        src={link.url}
      >
        {link.label || stripProtocol(link.url)}
      </Link>
    ))}
  </>
);

const SkillGroup = ({ group }: { group: ResumeSkillGroup }) => (
  <Block breakable={false} className="gap-2">
    <Text className="font-semibold">{group.name}</Text>
    <Block className="flex-row flex-wrap gap-1">
      {group.items.map((item) => (
        <Badge
          className="bg-background font-normal"
          key={item}
          variant="outline"
        >
          {item}
        </Badge>
      ))}
    </Block>
  </Block>
);

const LanguageItem = ({ language }: { language: ResumeLanguage }) => (
  <Block
    breakable={false}
    className="flex-row items-center justify-between gap-3"
  >
    <Block className="gap-0.5">
      <Text className="font-semibold">{language.name}</Text>
      <Text className="text-muted-foreground">{language.level}</Text>
    </Block>
    {language.rating !== undefined && <Rating value={language.rating} />}
  </Block>
);

const SIDEBAR_WIDTH = "w-[184]";

const Sidebar = ({ data, l }: { data: ResumeData; l: ResumeLabels }) => (
  <Block className={cn(SIDEBAR_WIDTH, "gap-9 px-8 text-xs")}>
    <Block className="h-14 w-14 items-center justify-center rounded-full bg-primary">
      <Text className="font-bold text-lg text-primary-foreground tracking-wide">
        {initialsOf(data.name)}
      </Text>
    </Block>

    <Block className="gap-2.5">
      <SidebarTitle>{l.contact}</SidebarTitle>
      <ContactList data={data} />
    </Block>

    {data.skills && data.skills.length > 0 && (
      <Block className="gap-4">
        <SidebarTitle>{l.skills}</SidebarTitle>
        {data.skills.map((group) => (
          <SkillGroup group={group} key={group.name} />
        ))}
      </Block>
    )}

    {data.languages && data.languages.length > 0 && (
      <Block className="gap-3">
        <SidebarTitle>{l.languages}</SidebarTitle>
        {data.languages.map((language) => (
          <LanguageItem key={language.name} language={language} />
        ))}
      </Block>
    )}
  </Block>
);

// ─── Resume ──────────────────────────────────────────────────────────────────

export interface ResumeProps {
  data: ResumeData;
  labels?: Partial<ResumeLabels>;
  /**
   * "sidebar" (default): contact, skills and languages in a tinted left
   * column. "single": one column, contact line under the name and skills
   * and languages at the end.
   */
  layout?: "sidebar" | "single";
  theme?: ThemeVars;
}

export const Resume = ({
  data,
  labels,
  layout = "sidebar",
  theme,
}: ResumeProps) => {
  const l = { ...defaultLabels, ...labels };
  const month: Formatter = pdfSafe(
    new Intl.DateTimeFormat(data.locale, { month: "short", year: "numeric" })
  );
  const year: Formatter = pdfSafe(
    new Intl.DateTimeFormat(data.locale, { year: "numeric" })
  );
  const range = (format: Formatter, start: Date, end?: Date) =>
    `${format.format(start)} – ${end ? format.format(end) : l.present}`;
  const withSidebar = layout === "sidebar";

  return (
    <Document author={data.name} theme={theme} title={data.name}>
      <Page
        className={cn(
          "bg-background py-12 text-foreground text-sm",
          !withSidebar && "px-12"
        )}
        size="A4"
      >
        {/* Sidebar tint, repeated on every page so overflow pages stay whole */}
        {withSidebar && (
          <Block
            className={cn(
              SIDEBAR_WIDTH,
              "absolute top-0 bottom-0 left-0 bg-muted"
            )}
            fixed
          />
        )}

        <Block className={cn(withSidebar && "flex-row")}>
          {withSidebar && <Sidebar data={data} l={l} />}

          {/* flex-1 only in the row: in a column it collapses on page breaks */}
          <Block className={cn("gap-9", withSidebar && "flex-1 px-10")}>
            <Block className="gap-2">
              <Heading className="text-4xl tracking-tight" level={1}>
                {data.name}
              </Heading>
              <Text className="text-base text-muted-foreground">
                {data.headline}
              </Text>
              {!withSidebar && (
                <Block className="mt-2 flex-row flex-wrap gap-x-4 gap-y-1 text-xs">
                  <ContactList data={data} />
                </Block>
              )}
            </Block>

            {data.summary && (
              <Block>
                <SectionTitle>{l.profile}</SectionTitle>
                <Text className="text-muted-foreground text-sm leading-relaxed">
                  {data.summary}
                </Text>
              </Block>
            )}

            <Section
              className="gap-6"
              getKey={(job) => `${job.company}-${job.start.toISOString()}`}
              items={data.experience}
              render={(job) => (
                <ExperienceEntry
                  job={job}
                  range={range(month, job.start, job.end)}
                />
              )}
              title={l.experience}
            />

            <Section
              getKey={(school) => `${school.school}-${school.degree}`}
              items={data.education}
              render={(school) => (
                <EducationEntry
                  period={range(
                    school.end ? year : month,
                    school.start,
                    school.end
                  )}
                  school={school}
                />
              )}
              title={l.education}
            />

            <Section
              getKey={(project) => project.name}
              items={data.projects}
              render={(project) => <ProjectEntry project={project} />}
              title={l.projects}
            />

            <Section
              className="gap-3"
              getKey={(cert) => `${cert.issuer}-${cert.name}`}
              items={data.certifications}
              render={(cert) => (
                <CertificationEntry
                  cert={cert}
                  date={cert.date && month.format(cert.date)}
                />
              )}
              title={l.certifications}
            />

            {/* Single layout: sidebar sections flow after the main content */}
            {!withSidebar && (
              <>
                <Section
                  className="gap-3 text-xs"
                  getKey={(group) => group.name}
                  items={data.skills}
                  render={(group) => <SkillGroup group={group} />}
                  title={l.skills}
                />
                <Section
                  className="gap-3 text-xs"
                  getKey={(language) => language.name}
                  items={data.languages}
                  render={(language) => <LanguageItem language={language} />}
                  title={l.languages}
                />
              </>
            )}
          </Block>
        </Block>
      </Page>
    </Document>
  );
};
