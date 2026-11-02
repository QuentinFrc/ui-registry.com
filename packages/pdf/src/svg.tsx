// ─── SVG Primitives ──────────────────────────────────────────────────────────
// Svg and G get className support (they accept full Style objects).
// Shape components (Path, Rect, Circle, etc.) and gradient/defs components
// are re-exported as-is — they use SVGPresentationAttributes which are
// set via props (fill, stroke, etc.), not CSS classes.

import type {
	GProps as RPGProps,
	SVGProps as RPSVGProps,
	SVGTextProps as RPSVGTextProps,
} from "@react-pdf/renderer";
import {
	Circle,
	ClipPath,
	Defs,
	Ellipse,
	Line,
	LinearGradient,
	Path,
	Polygon,
	Polyline,
	RadialGradient,
	Rect,
	G as RPG,
	Svg as RPSvg,
	Text as RPSvgText,
	Stop,
	Tspan,
} from "@react-pdf/renderer";
import type React from "react";

import type { Style } from "./styles";
import { useStyles } from "./styles";

// ─── Svg ─────────────────────────────────────────────────────────────────────

export interface SvgProps extends Omit<RPSVGProps, "style"> {
	children?: React.ReactNode;
	className?: string;
	style?: Style;
}

export const Svg = ({ className, style, ...props }: SvgProps) => {
	const merged = useStyles(className, style);
	return <RPSvg style={merged} {...props} />;
};

// ─── G (Group) ───────────────────────────────────────────────────────────────

export interface GProps extends Omit<RPGProps, "style"> {
	children?: React.ReactNode;
	className?: string;
	style?: Style;
}

export const G = ({ className, style, ...props }: GProps) => {
	const merged = useStyles(className, style);
	return <RPG style={merged} {...props} />;
};

// ─── SvgText ─────────────────────────────────────────────────────────────────

export interface SvgTextProps extends Omit<RPSVGTextProps, "style"> {
	children?: React.ReactNode;
	className?: string;
	style?: Style;
}

export const SvgText = ({ className, style, ...props }: SvgTextProps) => {
	const merged = useStyles(className, style);
	return <RPSvgText style={merged} {...props} />;
};

// ─── Shape & gradient re-exports (no className — use SVG props directly) ────

export {
	Path,
	Rect,
	Circle,
	Ellipse,
	Line,
	Polyline,
	Polygon,
	Tspan,
	Defs,
	ClipPath,
	Stop,
	LinearGradient,
	RadialGradient,
};
