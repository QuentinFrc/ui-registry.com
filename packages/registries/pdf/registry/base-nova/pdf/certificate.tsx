import type { ThemeVars } from "@ui-registries/pdf";
import {
  Block,
  Circle,
  cn,
  Document,
  Image,
  Link,
  Page,
  Polygon,
  Svg,
  Text,
  useTw,
} from "@ui-registries/pdf";
import type { ReactNode } from "react";

export interface CertificateSignature {
  /** Optional image of the handwritten signature (URL, path or data URI). */
  image?: string;
  name: string;
  /** Title shown under the name, e.g. "Program Director". */
  role: string;
}

export interface CertificateSeal {
  /** Small uppercase line under the main text, e.g. "Certified". */
  caption?: string;
  /** Main text, e.g. a year or a short word. Keep it short. */
  text: string;
}

export interface CertificateData {
  /** Course, program or achievement name, shown prominently. */
  achievement: string;
  credentialId?: string;
  /** Sentence shown under the achievement: scope, hours, grade… */
  description?: string;
  issueDate: Date;
  /** Issuing organization, shown at the top. */
  issuer: string;
  /** BCP 47 locale used for the date, e.g. "en-US". */
  locale?: string;
  recipient: string;
  /** Draws a rosette seal between the signatures. */
  seal?: CertificateSeal;
  /** One or two signatures. */
  signatures?: CertificateSignature[];
  /** Verification URL, rendered as a link in the footer. */
  verifyUrl?: string;
}

export interface CertificateLabels {
  certifies: string;
  completed: string;
  credentialId: string;
  date: string;
  subtitle: string;
  title: string;
  verify: string;
}

const defaultLabels: CertificateLabels = {
  certifies: "This certifies that",
  completed: "has successfully completed",
  credentialId: "Credential ID",
  date: "Date",
  subtitle: "of Completion",
  title: "Certificate",
  verify: "Verify at",
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

const PROTOCOL = /^(https?:)?\/\//;

// ─── Seal ────────────────────────────────────────────────────────────────────

const SEAL_SIZE = 100;
const SEAL_POINTS = 36;
const SEAL_OUTER = 49;
const SEAL_INNER = 45;
const SEAL_CENTER = SEAL_SIZE / 2;
const RIBBON_DROP = 36;

const rosette = Array.from({ length: SEAL_POINTS * 2 }, (_, i) => {
  const radius = i % 2 === 0 ? SEAL_OUTER : SEAL_INNER;
  const angle = (Math.PI * i) / SEAL_POINTS;
  const x = SEAL_CENTER + radius * Math.sin(angle);
  const y = SEAL_CENTER - radius * Math.cos(angle);
  return `${x.toFixed(2)},${y.toFixed(2)}`;
}).join(" ");

// Two ribbon tails with a notched end, hanging behind the rosette.
const ribbon = (side: -1 | 1) => {
  const top = SEAL_CENTER + 12;
  const bottom = SEAL_CENTER + SEAL_OUTER + RIBBON_DROP / 2;
  const inner = SEAL_CENTER + side * 6;
  const outer = SEAL_CENTER + side * 29;
  return [
    `${inner},${top}`,
    `${inner + side * 16},${top - 4}`,
    `${outer},${bottom}`,
    `${outer - side * 9},${bottom - 7}`,
    `${outer - side * 19},${bottom + 2}`,
  ].join(" ");
};

const colorOf = (style: Record<string, unknown>, key: string) => {
  const value = style[key];
  return typeof value === "string" ? value : undefined;
};

const Seal = ({ seal }: { seal: CertificateSeal }) => {
  // SVG shapes take colors as props, not classes: resolve the theme tokens.
  const tw = useTw();
  const primary = colorOf(tw("bg-primary"), "backgroundColor");
  const foreground = colorOf(tw("bg-primary-foreground"), "backgroundColor");
  const height = SEAL_SIZE + RIBBON_DROP / 2 + 4;

  return (
    <Block className="relative" style={{ height, width: SEAL_SIZE }}>
      <Svg
        height={height}
        viewBox={`0 0 ${SEAL_SIZE} ${height}`}
        width={SEAL_SIZE}
      >
        <Polygon fill={primary} opacity={0.85} points={ribbon(-1)} />
        <Polygon fill={primary} opacity={0.85} points={ribbon(1)} />
        <Polygon fill={primary} points={rosette} />
        <Circle
          cx={SEAL_CENTER}
          cy={SEAL_CENTER}
          fill="none"
          r={39.5}
          stroke={foreground}
          strokeWidth={0.75}
        />
        <Circle
          cx={SEAL_CENTER}
          cy={SEAL_CENTER}
          fill="none"
          r={36}
          stroke={foreground}
          strokeDasharray="1.5 2"
          strokeWidth={0.75}
        />
      </Svg>
      <Block
        className="absolute top-0 left-0 items-center justify-center gap-0.5"
        style={{ height: SEAL_SIZE, width: SEAL_SIZE }}
      >
        <Text className="font-bold font-serif text-primary-foreground text-xl">
          {seal.text}
        </Text>
        {seal.caption && (
          <Text className="font-bold text-[6] text-primary-foreground uppercase tracking-widest">
            {seal.caption}
          </Text>
        )}
      </Block>
    </Block>
  );
};

// ─── Pieces ──────────────────────────────────────────────────────────────────

// A value written over a rule, with a caption underneath: used for the
// signatures and, when there is room, the date.
const Slot = ({
  caption,
  children,
  title,
}: {
  caption?: string;
  children: ReactNode;
  title: string;
}) => (
  <Block className="w-[180] items-center">
    <Block className="h-10 w-full items-center justify-end">{children}</Block>
    <Block className="mt-1.5 w-full border-foreground border-b" />
    <Block className="h-[26] items-center">
      <Text className="mt-2 font-semibold text-xs">{title}</Text>
      {caption && (
        <Text className="mt-0.5 text-[8] text-muted-foreground uppercase tracking-wider">
          {caption}
        </Text>
      )}
    </Block>
  </Block>
);

const Signature = ({ signature }: { signature: CertificateSignature }) => (
  <Slot caption={signature.role} title={signature.name}>
    {signature.image ? (
      <Image className="h-10 object-contain" src={signature.image} />
    ) : (
      <Text className="font-serif text-2xl text-foreground italic">
        {signature.name}
      </Text>
    )}
  </Slot>
);

const Ornament = ({ className }: { className?: string }) => (
  <Block className={cn("flex-row items-center gap-2", className)}>
    <Block className="w-10 border-primary border-b" />
    <Block className="h-1.5 w-1.5 rotate-45 bg-primary" />
    <Block className="w-10 border-primary border-b" />
  </Block>
);

const Corner = ({ className }: { className: string }) => (
  <Block
    className={cn("absolute h-2.5 w-2.5 rotate-45 bg-primary", className)}
  />
);

// ─── Certificate ─────────────────────────────────────────────────────────────

export interface CertificateProps {
  data: CertificateData;
  labels?: Partial<CertificateLabels>;
  theme?: ThemeVars;
}

export const Certificate = ({ data, labels, theme }: CertificateProps) => {
  const l = { ...defaultLabels, ...labels };
  const date = pdfSafe(
    new Intl.DateTimeFormat(data.locale, { dateStyle: "long" })
  );
  const [first, second] = data.signatures ?? [];
  const issued = date.format(data.issueDate);
  // With fewer than two signatures, the date takes the left slot.
  const dateInSlot = second === undefined;

  return (
    <Document
      author={data.issuer}
      theme={theme}
      title={`${l.title} ${l.subtitle} — ${data.recipient}`}
    >
      <Page
        className="bg-background px-24 pt-16 pb-12 text-foreground text-sm"
        orientation="landscape"
        size="A4"
      >
        {/* Frame: thick outer rule, hairline inner rule, diamond corners */}
        <Block className="absolute inset-5 border-4 border-primary" />
        <Block className="absolute inset-8 border border-primary/40" />
        <Corner className="top-[20] left-[20]" />
        <Corner className="top-[20] right-[20]" />
        <Corner className="bottom-[20] left-[20]" />
        <Corner className="right-[20] bottom-[20]" />

        <Block className="flex-1 items-center">
          {/* Header */}
          <Text className="font-bold text-muted-foreground text-xs uppercase tracking-widest">
            {data.issuer}
          </Text>
          <Text className="mt-4 font-serif text-[56] text-foreground leading-none">
            {l.title}
          </Text>
          <Text className="mt-2 font-semibold text-primary text-sm uppercase tracking-widest">
            {l.subtitle}
          </Text>
          <Ornament className="mt-4" />

          {/* Recipient & achievement, centered in the remaining space */}
          <Block className="w-full flex-1 items-center justify-center">
            <Text className="font-serif text-base text-muted-foreground italic">
              {l.certifies}
            </Text>
            <Text className="mt-2 text-center font-serif text-[46] text-foreground italic leading-tight">
              {data.recipient}
            </Text>
            <Block className="mt-1 w-[380] border-border border-b" />
            <Text className="mt-5 font-serif text-base text-muted-foreground italic">
              {l.completed}
            </Text>
            <Text className="mt-2 text-center font-bold text-2xl text-foreground">
              {data.achievement}
            </Text>
            {data.description && (
              <Text className="mt-2.5 w-[460] text-center text-muted-foreground text-sm leading-normal">
                {data.description}
              </Text>
            )}
          </Block>

          {/* Signatures & seal */}
          <Block className="w-full flex-row items-end justify-between">
            {dateInSlot ? (
              <Slot title={l.date}>
                <Text className="font-serif text-foreground text-lg">
                  {issued}
                </Text>
              </Slot>
            ) : (
              first && <Signature signature={first} />
            )}
            {data.seal && <Seal seal={data.seal} />}
            <Block className="w-[180]">
              {dateInSlot && first && <Signature signature={first} />}
              {second && <Signature signature={second} />}
            </Block>
          </Block>

          {/* Footer */}
          <Block className="mt-5 flex-row flex-wrap justify-center gap-x-5 text-[8] text-muted-foreground uppercase tracking-wider">
            {!dateInSlot && (
              <Text>
                {l.date} · {issued}
              </Text>
            )}
            {data.credentialId && (
              <Text>
                {l.credentialId} · {data.credentialId}
              </Text>
            )}
            {data.verifyUrl && (
              <Text>
                {l.verify}{" "}
                <Link
                  className="text-muted-foreground normal-case no-underline"
                  src={data.verifyUrl}
                >
                  {data.verifyUrl.replace(PROTOCOL, "")}
                </Link>
              </Text>
            )}
          </Block>
        </Block>
      </Page>
    </Document>
  );
};
