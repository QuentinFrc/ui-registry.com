// ─── PDF Primitives ──────────────────────────────────────────────────────────
// Thin wrappers around @react-pdf/renderer that add className (Tailwind) support.
// These are the base building blocks — the equivalent of HTML elements for PDF.

import type {
	CanvasProps as RPCanvasProps,
	DocumentProps as RPDocumentProps,
	ImageProps as RPImageProps,
	LinkProps as RPLinkProps,
	NoteProps as RPNoteProps,
	PageProps as RPPageProps,
	TextProps as RPTextProps,
	ViewProps as RPViewProps,
} from "@react-pdf/renderer";
import {
	Canvas as RPCanvas,
	Document as RPDocument,
	Image as RPImage,
	Link as RPLink,
	Note as RPNote,
	Page as RPPage,
	Text as RPText,
	View as RPView,
} from "@react-pdf/renderer";
import type React from "react";

import { type PageSizeProp, resolvePageSize } from "./page-size";

import type { Style } from "./styles";
import { TypographyProvider, useStyles, useTypography } from "./styles";
import type { ThemeVars } from "./tailwind";
import { Tailwind } from "./tailwind";

// react-pdf checks `"wrap" in props`: an explicit `wrap={undefined}` makes the
// node unbreakable, so only pass the prop when `breakable` is set.
const wrapProp = (breakable?: boolean) =>
	breakable === undefined ? {} : { wrap: breakable };

// ─── Block (formerly View) ──────────────────────────────────────────────────

export interface BlockProps extends Omit<RPViewProps, "style" | "wrap"> {
	breakable?: boolean;
	children?: React.ReactNode;
	className?: string;
	style?: Style;
}

export const Block = ({
	className,
	style,
	breakable,
	...props
}: BlockProps) => {
	const t = useTypography(useStyles(className, style));
	return (
		<TypographyProvider parent={t.parent} value={t.typography}>
			<RPView style={t.style} {...wrapProp(breakable)} {...props} />
		</TypographyProvider>
	);
};

/** @deprecated Use `Block` instead */
export const View = Block;

// ─── Text ────────────────────────────────────────────────────────────────────

export interface TextProps extends Omit<RPTextProps, "style"> {
	children?: React.ReactNode;
	className?: string;
	style?: Style;
}

export const Text = ({ className, style, ...props }: TextProps) => {
	const t = useTypography(useStyles(className, style));
	return (
		<TypographyProvider parent={t.parent} value={t.typography}>
			<RPText style={t.style} {...props} />
		</TypographyProvider>
	);
};

// ─── Page ────────────────────────────────────────────────────────────────────

export interface PageProps extends Omit<RPPageProps, "style" | "wrap"> {
	breakable?: boolean;
	children?: React.ReactNode;
	className?: string;
	style?: Style;
}

export const Page = ({ className, style, breakable, ...props }: PageProps) => {
	const t = useTypography(useStyles(className, style));
	const { height } = resolvePageSize({
		dpi: props.dpi,
		orientation: props.orientation,
		size: props.size as PageSizeProp | undefined,
	});
	// react-pdf sizes an unbreakable page to its content and ignores the
	// requested height: pin it with min/max height (overflow is cut off).
	const keepHeight = breakable === false && height !== undefined;
	const pageStyle = keepHeight
		? [
				...(Array.isArray(t.style) ? t.style : [t.style]).filter(Boolean),
				{ maxHeight: height, minHeight: height },
			]
		: t.style;
	// A page without a height grows with its content and never breaks; react-pdf
	// still tries to paginate it and pushes every unbreakable node (Svg, Image,
	// unbreakable Block) onto a page of its own, so turn pagination off.
	const autoHeight = height === undefined;
	return (
		<TypographyProvider parent={t.parent} value={t.typography}>
			<RPPage
				style={pageStyle}
				{...wrapProp(autoHeight ? false : breakable)}
				{...props}
			/>
		</TypographyProvider>
	);
};

// ─── Image ───────────────────────────────────────────────────────────────────

// react-pdf's ImageProps is a union (src | source); a plain Omit would keep
// only the keys shared by every member and drop both.
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
	? Omit<T, K>
	: never;

export type ImageProps = DistributiveOmit<RPImageProps, "style"> & {
	className?: string;
	style?: Style;
};

export const Image = ({ className, style, ...props }: ImageProps) => {
	const merged = useStyles(className, style);
	return <RPImage style={merged} {...(props as RPImageProps)} />;
};

// ─── Link ────────────────────────────────────────────────────────────────────

export interface LinkProps extends Omit<RPLinkProps, "style"> {
	children?: React.ReactNode;
	className?: string;
	style?: Style;
}

export const Link = ({ className, style, ...props }: LinkProps) => {
	const t = useTypography(useStyles(className, style));
	return (
		<TypographyProvider parent={t.parent} value={t.typography}>
			<RPLink style={t.style} {...props} />
		</TypographyProvider>
	);
};

// ─── Document ────────────────────────────────────────────────────────────────
// `theme` wraps the tree in <Tailwind>. Prefer it over an outer <Tailwind>:
// PDFViewer, usePDF, pdf() etc. render in a separate React root, so context
// from outside them never reaches the document.

export interface DocumentProps extends RPDocumentProps {
	children?: React.ReactNode;
	theme?: ThemeVars;
}

export const Document = ({ theme, ...props }: DocumentProps) =>
	theme ? (
		<Tailwind theme={theme}>
			<RPDocument {...props} />
		</Tailwind>
	) : (
		<RPDocument {...props} />
	);

// ─── Canvas ─────────────────────────────────────────────────────────────────

export interface CanvasProps extends Omit<RPCanvasProps, "style"> {
	className?: string;
	style?: Style;
}

export const Canvas = ({ className, style, ...props }: CanvasProps) => {
	const merged = useStyles(className, style);
	return <RPCanvas style={merged} {...props} />;
};

// ─── Note ───────────────────────────────────────────────────────────────────

export interface NoteProps extends Omit<RPNoteProps, "style"> {
	className?: string;
	style?: Style;
}

export const Note = ({ className, style, ...props }: NoteProps) => {
	const merged = useStyles(className, style);
	return <RPNote style={merged} {...props} />;
};

// ─── PageNumber ──────────────────────────────────────────────────────────────

export interface PageNumberProps
	extends Omit<RPTextProps, "style" | "children" | "render"> {
	className?: string;
	render?: (info: {
		pageNumber: number;
		totalPages: number;
	}) => React.ReactNode;
	style?: Style;
}

export const PageNumber = ({
	className,
	style,
	render,
	...props
}: PageNumberProps) => {
	const typography = useTypography(useStyles(className, style));
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const renderFn = render
		? (p: any) => render({ pageNumber: p.pageNumber, totalPages: p.totalPages })
		: ({ pageNumber, totalPages }: any) => `${pageNumber} / ${totalPages}`;
	return <RPText render={renderFn} style={typography.style} {...props} />;
};
