// ─── SVG Primitives ──────────────────────────────────────────────────────────
// Svg, G, SvgText and the shapes (Path, Rect, Circle…) accept className.
// react-pdf reads SVG presentation attributes (fill, stroke, strokeWidth…)
// from props, not from style, so those utilities (fill-primary, stroke-border,
// stroke-2) are passed as props; explicit props still win.
// Gradient and defs components are re-exported as-is.

import type {
	GProps as RPGProps,
	SVGProps as RPSVGProps,
	SVGTextProps as RPSVGTextProps,
} from "@react-pdf/renderer";
import {
	ClipPath,
	Defs,
	LinearGradient,
	RadialGradient,
	Circle as RPCircle,
	Ellipse as RPEllipse,
	G as RPG,
	Line as RPLine,
	Path as RPPath,
	Polygon as RPPolygon,
	Polyline as RPPolyline,
	Rect as RPRect,
	Svg as RPSvg,
	Text as RPSvgText,
	Stop,
	Tspan,
} from "@react-pdf/renderer";
import type React from "react";
import type { ComponentProps, ComponentType } from "react";

import type { Style } from "./styles";
import { useStyles } from "./styles";
import { useTw } from "./tailwind";

// ─── Presentation attributes from classes ────────────────────────────────────

const PRESENTATION_KEYS = ["fill", "stroke", "strokeWidth"] as const;

interface Presentation {
	fill?: string;
	fillOpacity?: number;
	stroke?: string;
	strokeOpacity?: number;
	strokeWidth?: number | string;
}

const RGBA = /^rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\s*\)$/;
const hex = (n: string) => Number(n).toString(16).padStart(2, "0");

// react-pdf's SVG paint doesn't understand rgba(): split `fill-primary/50`
// into a hex color and an opacity attribute.
const toPaint = (key: "fill" | "stroke", value: unknown): Presentation => {
	const match = typeof value === "string" ? value.match(RGBA) : null;
	if (!(match?.[1] && match[2] && match[3] && match[4])) {
		return { [key]: value as string };
	}
	return {
		[key]: `#${hex(match[1])}${hex(match[2])}${hex(match[3])}`,
		[`${key}Opacity`]: Number(match[4]),
	};
};

/** Splits tw output into SVG presentation props and the remaining style. */
const splitPresentation = (style: Record<string, unknown> | undefined) => {
	const presentation: Presentation = {};
	const rest: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(style ?? {})) {
		if ((PRESENTATION_KEYS as readonly string[]).includes(key)) {
			Object.assign(
				presentation,
				key === "strokeWidth"
					? { strokeWidth: value }
					: toPaint(key as "fill" | "stroke", value),
			);
		} else {
			rest[key] = value;
		}
	}
	return { presentation, rest };
};

const useSvgClass = (className?: string) => {
	const tw = useTw();
	return splitPresentation(className ? tw(className) : undefined);
};

/** A color from the document theme, e.g. `useThemeColor("primary")`. */
export const useThemeColor = (token: string): string | undefined => {
	const tw = useTw();
	const { color } = tw(`text-${token}`) as { color?: string };
	return color;
};

// Shapes take presentation attributes only; other classes are ignored.
const withClassName = <P extends object>(Shape: ComponentType<P>) => {
	const Wrapped = ({ className, ...props }: P & { className?: string }) => {
		const { presentation } = useSvgClass(className);
		return <Shape {...(presentation as Partial<P>)} {...(props as P)} />;
	};
	Wrapped.displayName = Shape.displayName ?? "SvgShape";
	return Wrapped;
};

export const Path = withClassName(RPPath);
export const Rect = withClassName(RPRect);
export const Circle = withClassName(RPCircle);
export const Ellipse = withClassName(RPEllipse);
export const Line = withClassName(RPLine);
export const Polygon = withClassName(RPPolygon);
export const Polyline = withClassName(RPPolyline);

export type PathProps = ComponentProps<typeof Path>;
export type RectProps = ComponentProps<typeof Rect>;
export type CircleProps = ComponentProps<typeof Circle>;

// ─── Svg ─────────────────────────────────────────────────────────────────────

export interface SvgProps extends Omit<RPSVGProps, "style"> {
	children?: React.ReactNode;
	className?: string;
	style?: Style;
}

export const Svg = ({ className, style, ...props }: SvgProps) => {
	const { presentation } = useSvgClass(className);
	const merged = useStyles(className, style);
	return <RPSvg style={merged} {...presentation} {...props} />;
};

// ─── G (Group) ───────────────────────────────────────────────────────────────

export interface GProps extends Omit<RPGProps, "style"> {
	children?: React.ReactNode;
	className?: string;
	style?: Style;
}

export const G = ({ className, style, ...props }: GProps) => {
	const { presentation } = useSvgClass(className);
	const merged = useStyles(className, style);
	return <RPG style={merged} {...presentation} {...props} />;
};

// ─── SvgText ─────────────────────────────────────────────────────────────────

export interface SvgTextProps extends Omit<RPSVGTextProps, "style"> {
	children?: React.ReactNode;
	className?: string;
	style?: Style;
}

export const SvgText = ({ className, style, ...props }: SvgTextProps) => {
	const { presentation } = useSvgClass(className);
	const merged = useStyles(className, style);
	return <RPSvgText style={merged} {...presentation} {...props} />;
};

// ─── Gradient & defs re-exports ─────────────────────────────────────────────

export { Tspan, Defs, ClipPath, Stop, LinearGradient, RadialGradient };
