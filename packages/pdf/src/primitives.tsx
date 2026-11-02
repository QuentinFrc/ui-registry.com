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

import type { Style } from "./styles";
import { useStyles } from "./styles";
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
	const merged = useStyles(className, style);
	return <RPView style={merged} {...wrapProp(breakable)} {...props} />;
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
	const merged = useStyles(className, style);
	return <RPText style={merged} {...props} />;
};

// ─── Page ────────────────────────────────────────────────────────────────────

export interface PageProps extends Omit<RPPageProps, "style" | "wrap"> {
	breakable?: boolean;
	children?: React.ReactNode;
	className?: string;
	style?: Style;
}

export const Page = ({ className, style, breakable, ...props }: PageProps) => {
	const merged = useStyles(className, style);
	return <RPPage style={merged} {...wrapProp(breakable)} {...props} />;
};

// ─── Image ───────────────────────────────────────────────────────────────────

export interface ImageProps extends Omit<RPImageProps, "style"> {
	className?: string;
	style?: Style;
}

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
	const merged = useStyles(className, style);
	return <RPLink style={merged} {...props} />;
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
	const merged = useStyles(className, style);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const renderFn = render
		? (p: any) => render({ pageNumber: p.pageNumber, totalPages: p.totalPages })
		: ({ pageNumber, totalPages }: any) => `${pageNumber} / ${totalPages}`;
	return <RPText render={renderFn} style={merged} {...props} />;
};
