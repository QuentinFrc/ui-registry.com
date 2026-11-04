import type React from "react";
import { createContext, useContext, useMemo } from "react";
import type { ThemeVars, TwFn } from "./tw";
import { createTw, tw as defaultTw } from "./tw";

// ─── Context ─────────────────────────────────────────────────────────────────

const TailwindContext = createContext<TwFn>(defaultTw);

// ─── <Tailwind> wrapper ──────────────────────────────────────────────────────
//
// Tailwind v4 convention: flat CSS variables as theme tokens.
//
//   <Tailwind theme={{
//     "--color-brand-500": "#0073e6",
//     "--color-brand-600": "#005bb5",
//     "--text-tiny": 5,
//     "--radius-pill": 50,
//     "--spacing-18": 72,
//     "--color-*": "initial",   // reset all default colors
//   }}>
//     <Document>...</Document>
//   </Tailwind>

export const Tailwind = ({
	theme,
	children,
}: {
	theme?: ThemeVars;
	children: React.ReactNode;
}) => {
	const tw = useMemo(() => (theme ? createTw(theme) : defaultTw), [theme]);
	return (
		<TailwindContext.Provider value={tw}>{children}</TailwindContext.Provider>
	);
};

// ─── useTw() ─────────────────────────────────────────────────────────────────

export const useTw = (): TwFn => useContext(TailwindContext);

export type { ThemeVars, TwFn } from "./tw";
