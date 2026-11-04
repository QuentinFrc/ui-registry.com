// ─── Shared style helpers ────────────────────────────────────────────────────

import type { ViewProps } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import { createContext, useContext } from "react";

import { useTw } from "./tailwind";

/** A react-pdf style object, or an array of them (later entries win). */
export type Style = NonNullable<ViewProps["style"]>;

// Merge className (tw) + style: explicit style wins over classes.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useStyles = (className?: string, style?: Style): any => {
	const tw = useTw();
	const twStyle = className ? tw(className) : undefined;
	const styleArr = Array.isArray(style) ? style : style ? [style] : [];
	return twStyle
		? [twStyle, ...styleArr]
		: styleArr.length
			? styleArr
			: undefined;
};

// ─── Line height ─────────────────────────────────────────────────────────────
//
// react-pdf resolves a unitless lineHeight (`leading-relaxed` → 1.625) against
// the element's *own* fontSize — or 18 when the size is inherited — and then
// passes the result down as an absolute value. CSS keeps the multiplier
// instead, so a `text-2xl` heading inside a `text-sm leading-relaxed` page gets
// a line height that matches its own size.
//
// To get the CSS behavior, primitives track the effective font size and line
// height multiplier in context, and turn multipliers into absolute points
// against the right font size.

/** react-pdf's default font size, in pt. */
export const DEFAULT_FONT_SIZE = 18;

export interface Typography {
	/** Effective font size, in pt. */
	fontSize: number;
	/** Unitless line height in effect, if any (inherited like in CSS). */
	leading?: number;
}

const TypographyContext = createContext<Typography>({
	fontSize: DEFAULT_FONT_SIZE,
});

const PT = /^(-?\d*\.?\d+)pt$/;
const PX = /^(-?\d*\.?\d+)px$/;
const PERCENT = /^(-?\d*\.?\d+)%$/;
const PX_TO_PT = 0.75;

/** A font size in pt, or undefined when it can't be resolved statically. */
const toPoints = (value: unknown): number | undefined => {
	if (typeof value === "number") {
		return value;
	}
	if (typeof value !== "string") {
		return;
	}
	const pt = value.match(PT);
	if (pt?.[1]) {
		return Number(pt[1]);
	}
	const px = value.match(PX);
	if (px?.[1]) {
		return Number(px[1]) * PX_TO_PT;
	}
	return Number.isNaN(Number(value)) ? undefined : Number(value);
};

const EM = /^(-?\d*\.?\d+)em$/;

/** The em factor of a value like "0.1em", if it is one. */
const parseEm = (value: unknown): number | undefined => {
	const match = typeof value === "string" ? value.match(EM) : null;
	return match?.[1] ? Number(match[1]) : undefined;
};

const toPt = (value: number) => `${Math.round(value * 100) / 100}pt`;

type LineHeight =
	| { kind: "multiplier"; value: number }
	| { kind: "absolute" }
	| undefined;

const parseLineHeight = (value: unknown): LineHeight => {
	if (value === undefined || value === null || value === "") {
		return;
	}
	if (typeof value === "number") {
		return { kind: "multiplier", value };
	}
	if (typeof value === "string") {
		const percent = value.match(PERCENT);
		if (percent?.[1]) {
			return { kind: "multiplier", value: Number(percent[1]) / 100 };
		}
		if (!Number.isNaN(Number(value))) {
			return { kind: "multiplier", value: Number(value) };
		}
	}
	return { kind: "absolute" };
};

// biome-ignore lint/suspicious/noExplicitAny: react-pdf style objects are loosely typed
const flatten = (style: any): Record<string, unknown> => {
	if (!style) {
		return {};
	}
	if (Array.isArray(style)) {
		return Object.assign({}, ...style.map(flatten));
	}
	return style;
};

/**
 * Resolves the typography of an element from its parent's and its own style.
 * Returns the style to render (with multipliers turned into points when
 * needed) and the typography its children inherit.
 */
export const resolveTypography = (
	parent: Typography,
	// biome-ignore lint/suspicious/noExplicitAny: see useStyles
	style: any,
	// biome-ignore lint/suspicious/noExplicitAny: see useStyles
): { style: any; typography: Typography } => {
	const flat = flatten(style);
	const ownFontSize = toPoints(flat.fontSize);
	const ownLineHeight = parseLineHeight(flat.lineHeight);
	const emLetterSpacing = parseEm(flat.letterSpacing);

	if (
		ownFontSize === undefined &&
		ownLineHeight === undefined &&
		emLetterSpacing === undefined
	) {
		return { style, typography: parent };
	}

	const fontSize = ownFontSize ?? parent.fontSize;
	const styles = Array.isArray(style) ? style : style ? [style] : [];
	const overrides: Record<string, string> = {};
	if (emLetterSpacing !== undefined) {
		overrides.letterSpacing = toPt(emLetterSpacing * fontSize);
	}
	let leading: number | undefined;
	if (ownLineHeight?.kind === "multiplier") {
		leading = ownLineHeight.value;
	} else if (ownLineHeight === undefined) {
		leading = parent.leading;
	}

	const typography: Typography = { fontSize, leading };
	// An absolute line height is fine as is; otherwise pin the multiplier in
	// effect to this element's font size.
	if (leading !== undefined && ownLineHeight?.kind !== "absolute") {
		overrides.lineHeight = toPt(leading * fontSize);
	}
	if (Object.keys(overrides).length === 0) {
		return { style, typography };
	}
	return { style: [...styles, overrides], typography };
};

/** `useStyles` plus line-height resolution; wrap children with `Provider`. */
export const useTypography = (
	// biome-ignore lint/suspicious/noExplicitAny: see useStyles
	style: any,
) => {
	const parent = useContext(TypographyContext);
	return { parent, ...resolveTypography(parent, style) };
};

export const TypographyProvider = ({
	children,
	parent,
	value,
}: {
	children: ReactNode;
	parent: Typography;
	value: Typography;
}) =>
	value === parent ? (
		children
	) : (
		<TypographyContext.Provider value={value}>
			{children}
		</TypographyContext.Provider>
	);
