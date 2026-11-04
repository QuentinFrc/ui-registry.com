// ─── defineFont ──────────────────────────────────────────────────────────────
// next/font-inspired API for registering fonts with @react-pdf/renderer.

import { Font } from "@react-pdf/renderer";

type FontStyle = "normal" | "italic" | "oblique";
type FontWeight =
	| number
	| "thin"
	| "ultralight"
	| "light"
	| "normal"
	| "medium"
	| "semibold"
	| "bold"
	| "ultrabold"
	| "heavy";

export interface FontVariant {
	/** HTTP body for remote fonts */
	body?: unknown;
	/** HTTP headers for remote fonts */
	headers?: Record<string, string>;
	/** HTTP method for remote fonts */
	method?: "GET" | "HEAD" | "POST" | "PUT" | "DELETE" | "PATCH";
	/** PostScript name override */
	postscriptName?: string;
	src: string;
	style?: FontStyle;
	weight?: FontWeight;
}

export interface DefineFontOptions {
	/** Font family name */
	family: string;
	/** Single source path/URL, or array of variants */
	src: string | FontVariant[];
}

export interface FontResult {
	/** Ready-to-use className: `font-[FamilyName]` */
	className: string;
	/** The registered family name */
	family: string;
	/** Inline style object: `{ fontFamily: "FamilyName" }` */
	style: { fontFamily: string };
}

export const defineFont = (options: DefineFontOptions): FontResult => {
	const { family, src } = options;

	if (typeof src === "string") {
		Font.register({ family, src });
	} else {
		Font.register({
			family,
			fonts: src.map(({ src: fontSrc, weight, style, ...rest }) => ({
				fontStyle: style,
				fontWeight: weight,
				src: fontSrc,
				...rest,
			})),
		});
	}

	return {
		className: `font-[${family}]`,
		family,
		style: { fontFamily: family },
	};
};

/**
 * Turns off react-pdf's automatic hyphenation ("pay-ment") for every document
 * rendered afterwards: words then only wrap at spaces. react-pdf only offers a
 * global setting, so call it once at startup, next to `defineFont`.
 */
export const disableHyphenation = (): void => {
	Font.registerHyphenationCallback((word) => [word]);
};
