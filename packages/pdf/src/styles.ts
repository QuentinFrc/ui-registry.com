// ─── Shared style helpers ────────────────────────────────────────────────────

import type { ViewProps } from "@react-pdf/renderer";

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
