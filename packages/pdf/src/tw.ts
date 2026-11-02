declare const process: { env?: Record<string, string | undefined> } | undefined;

// ─── tw() ────────────────────────────────────────────────────────────────────
// Tailwind v4–style utility → @react-pdf/renderer style objects.
// Theme is defined as flat CSS variables: --color-*, --spacing-*, --text-*, etc.

export type StyleValue = string | number;
export type StyleObject = Record<string, StyleValue>;

// ─── Theme variable convention (mirrors Tailwind v4 @theme) ──────────────────
//
//   --color-brand-500: "#0073e6"       → bg-brand-500, text-brand-500
//   --color-white: "#ffffff"           → bg-white, text-white
//   --text-tiny: 5                     → text-tiny
//   --radius-pill: 50                  → rounded-pill
//   --spacing: 4                       → base unit (1 = 4pt)
//   --spacing-18: 72                   → gap-18, p-18, m-18
//   --font-weight-black: 950           → font-black
//   --leading-extra: 3                 → leading-extra
//   --tracking-extra: 2                → tracking-extra
//   --color-*: initial                 → reset all default colors
//
export type ThemeVars = Record<string, string | number | "initial">;

// ─── Color normalization (oklch → hex for react-pdf) ─────────────────────────

function oklchToRgb(L: number, C: number, H: number): [number, number, number] {
	const hRad = (H * Math.PI) / 180;
	const a = C * Math.cos(hRad);
	const b = C * Math.sin(hRad);

	const l_ = L + 0.396_337_777_4 * a + 0.215_803_757_3 * b;
	const m_ = L - 0.105_561_345_8 * a - 0.063_854_172_8 * b;
	const s_ = L - 0.089_484_177_5 * a - 1.291_485_548 * b;

	const l = l_ * l_ * l_;
	const m = m_ * m_ * m_;
	const s = s_ * s_ * s_;

	const r = +4.076_741_662_1 * l - 3.307_711_591_3 * m + 0.230_969_929_2 * s;
	const g = -1.268_438_004_6 * l + 2.609_757_401_1 * m - 0.341_319_396_5 * s;
	const bl = -0.004_196_086_3 * l - 0.703_418_614_7 * m + 1.707_614_701 * s;

	const toSRGB = (c: number) =>
		c <= 0.003_130_8 ? 12.92 * c : 1.055 * Math.max(0, c) ** (1 / 2.4) - 0.055;

	return [
		Math.round(Math.max(0, Math.min(1, toSRGB(r))) * 255),
		Math.round(Math.max(0, Math.min(1, toSRGB(g))) * 255),
		Math.round(Math.max(0, Math.min(1, toSRGB(bl))) * 255),
	];
}

function normalizeColor(value: string): string {
	if (!value || value.startsWith("#") || value === "transparent") {
		return value;
	}

	// oklch(L C H) or oklch(L C H / alpha)
	const m = value.match(
		/^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/,
	);
	if (m) {
		const [r, g, b] = oklchToRgb(Number(m[1]), Number(m[2]), Number(m[3]));
		if (m[4]) {
			const alpha = m[4].endsWith("%")
				? Number(m[4].slice(0, -1)) / 100
				: Number(m[4]);
			return `rgba(${r}, ${g}, ${b}, ${alpha})`;
		}
		return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
	}

	// rgb/rgba/hsl/hsla pass through (react-pdf supports these)
	return value;
}

function hexToRgba(color: string, alpha: number): string {
	// Handle hex
	if (color.startsWith("#")) {
		const hex = color.slice(1);
		const r = Number.parseInt(hex.slice(0, 2), 16);
		const g = Number.parseInt(hex.slice(2, 4), 16);
		const b = Number.parseInt(hex.slice(4, 6), 16);
		return `rgba(${r}, ${g}, ${b}, ${alpha})`;
	}
	// Handle existing rgba → replace alpha
	const rgbaMatch = color.match(/^rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)/);
	if (rgbaMatch) {
		return `rgba(${rgbaMatch[1]}, ${rgbaMatch[2]}, ${rgbaMatch[3]}, ${alpha})`;
	}
	return color;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

// PDF uses points (pt). Web uses pixels (px).
// 1 inch = 72pt = 96px → 1px = 0.75pt
// Tailwind base: 1 unit = 0.25rem = 4px = 3pt
const PX_TO_PT = 0.75;

const DEFAULT_SPACING_BASE = 3; // 1 unit = 3pt (= 4px)

const defaultSpacingSteps: Record<string, number> = {
	"0": 0,
	"0.5": 1.5,
	"1": 3,
	"1.5": 4.5,
	"10": 30,
	"11": 33,
	"12": 36,
	"14": 42,
	"16": 48,
	"2": 6,
	"2.5": 7.5,
	"20": 60,
	"24": 72,
	"28": 84,
	"3": 9,
	"3.5": 10.5,
	"32": 96,
	"36": 108,
	"4": 12,
	"40": 120,
	"44": 132,
	"48": 144,
	"5": 15,
	"52": 156,
	"56": 168,
	"6": 18,
	"60": 180,
	"64": 192,
	"7": 21,
	"72": 216,
	"8": 24,
	"80": 240,
	"9": 27,
	"96": 288,
	px: PX_TO_PT,
};

// Tailwind v4 font sizes: rem → px → pt (×0.75)
const defaultFontSize: Record<string, number> = {
	xs: 9, // 12px
	sm: 10.5, // 14px
	base: 12, // 16px
	lg: 13.5, // 18px
	xl: 15, // 20px
	"2xl": 18, // 24px
	"3xl": 22.5, // 30px
	"4xl": 27, // 36px
	"5xl": 36, // 48px
};

// Tailwind v4 border-radius: rem → px → pt (×0.75)
const defaultRadius: Record<string, number> = {
	none: 0,
	xs: 0.75, // 1px
	sm: 1.5, // 2px
	DEFAULT: 3, // 4px
	md: 4.5, // 6px
	lg: 6, // 8px
	xl: 9, // 12px
	"2xl": 12, // 16px
	"3xl": 18, // 24px
	"4xl": 24, // 32px
	full: 999,
};

const defaultFontWeight: Record<string, number> = {
	black: 900,
	bold: 700,
	extrabold: 800,
	extralight: 200,
	light: 300,
	medium: 500,
	normal: 400,
	semibold: 600,
	thin: 100,
};

const defaultOpacity: Record<string, number> = {
	"0": 0,
	"10": 0.1,
	"100": 1,
	"15": 0.15,
	"20": 0.2,
	"25": 0.25,
	"30": 0.3,
	"35": 0.35,
	"40": 0.4,
	"45": 0.45,
	"5": 0.05,
	"50": 0.5,
	"55": 0.55,
	"60": 0.6,
	"65": 0.65,
	"70": 0.7,
	"75": 0.75,
	"80": 0.8,
	"85": 0.85,
	"90": 0.9,
	"95": 0.95,
};

const defaultLineHeight: Record<string, number> = {
	loose: 2,
	none: 1,
	normal: 1.5,
	relaxed: 1.625,
	snug: 1.375,
	tight: 1.25,
};

// Tailwind v4 letter-spacing in pt (based on em at ~12pt base)
const defaultLetterSpacing: Record<string, number> = {
	normal: 0,
	tight: -0.3,
	tighter: -0.6,
	wide: 0.3,
	wider: 0.6,
	widest: 1.2,
};

const defaultFontFamily: Record<string, string> = {
	mono: "Courier",
	sans: "Helvetica",
	serif: "Times-Roman",
};

// Default color palette (flat map: "red-500" → "#ef4444")
function buildDefaultColors(): Record<string, string> {
	const palette: Record<string, Record<string, string>> = {
		amber: {
			100: "#fef3c7",
			200: "#fde68a",
			300: "#fcd34d",
			400: "#fbbf24",
			50: "#fffbeb",
			500: "#f59e0b",
			600: "#d97706",
			700: "#b45309",
			800: "#92400e",
			900: "#78350f",
			950: "#451a03",
		},
		blue: {
			100: "#dbeafe",
			200: "#bfdbfe",
			300: "#93c5fd",
			400: "#60a5fa",
			50: "#eff6ff",
			500: "#3b82f6",
			600: "#2563eb",
			700: "#1d4ed8",
			800: "#1e40af",
			900: "#1e3a8a",
			950: "#172554",
		},
		cyan: {
			100: "#cffafe",
			200: "#a5f3fc",
			300: "#67e8f9",
			400: "#22d3ee",
			50: "#ecfeff",
			500: "#06b6d4",
			600: "#0891b2",
			700: "#0e7490",
			800: "#155e75",
			900: "#164e63",
			950: "#083344",
		},
		emerald: {
			100: "#d1fae5",
			200: "#a7f3d0",
			300: "#6ee7b7",
			400: "#34d399",
			50: "#ecfdf5",
			500: "#10b981",
			600: "#059669",
			700: "#047857",
			800: "#065f46",
			900: "#064e3b",
			950: "#022c22",
		},
		fuchsia: {
			100: "#fae8ff",
			200: "#f5d0fe",
			300: "#f0abfc",
			400: "#e879f9",
			50: "#fdf4ff",
			500: "#d946ef",
			600: "#c026d3",
			700: "#a21caf",
			800: "#86198f",
			900: "#701a75",
			950: "#4a044e",
		},
		gray: {
			100: "#f3f4f6",
			200: "#e5e7eb",
			300: "#d1d5db",
			400: "#9ca3af",
			50: "#f9fafb",
			500: "#6b7280",
			600: "#4b5563",
			700: "#374151",
			800: "#1f2937",
			900: "#111827",
			950: "#030712",
		},
		green: {
			100: "#dcfce7",
			200: "#bbf7d0",
			300: "#86efac",
			400: "#4ade80",
			50: "#f0fdf4",
			500: "#22c55e",
			600: "#16a34a",
			700: "#15803d",
			800: "#166534",
			900: "#14532d",
			950: "#052e16",
		},
		indigo: {
			100: "#e0e7ff",
			200: "#c7d2fe",
			300: "#a5b4fc",
			400: "#818cf8",
			50: "#eef2ff",
			500: "#6366f1",
			600: "#4f46e5",
			700: "#4338ca",
			800: "#3730a3",
			900: "#312e81",
			950: "#1e1b4b",
		},
		lime: {
			100: "#ecfccb",
			200: "#d9f99d",
			300: "#bef264",
			400: "#a3e635",
			50: "#f7fee7",
			500: "#84cc16",
			600: "#65a30d",
			700: "#4d7c0f",
			800: "#3f6212",
			900: "#365314",
			950: "#1a2e05",
		},
		neutral: {
			100: "#f5f5f5",
			200: "#e5e5e5",
			300: "#d4d4d4",
			400: "#a3a3a3",
			50: "#fafafa",
			500: "#737373",
			600: "#525252",
			700: "#404040",
			800: "#262626",
			900: "#171717",
			950: "#0a0a0a",
		},
		orange: {
			100: "#ffedd5",
			200: "#fed7aa",
			300: "#fdba74",
			400: "#fb923c",
			50: "#fff7ed",
			500: "#f97316",
			600: "#ea580c",
			700: "#c2410c",
			800: "#9a3412",
			900: "#7c2d12",
			950: "#431407",
		},
		pink: {
			100: "#fce7f3",
			200: "#fbcfe8",
			300: "#f9a8d4",
			400: "#f472b6",
			50: "#fdf2f8",
			500: "#ec4899",
			600: "#db2777",
			700: "#be185d",
			800: "#9d174d",
			900: "#831843",
			950: "#500724",
		},
		purple: {
			100: "#f3e8ff",
			200: "#e9d5ff",
			300: "#d8b4fe",
			400: "#c084fc",
			50: "#faf5ff",
			500: "#a855f7",
			600: "#9333ea",
			700: "#7e22ce",
			800: "#6b21a8",
			900: "#581c87",
			950: "#3b0764",
		},
		red: {
			100: "#fee2e2",
			200: "#fecaca",
			300: "#fca5a5",
			400: "#f87171",
			50: "#fef2f2",
			500: "#ef4444",
			600: "#dc2626",
			700: "#b91c1c",
			800: "#991b1b",
			900: "#7f1d1d",
			950: "#450a0a",
		},
		rose: {
			100: "#ffe4e6",
			200: "#fecdd3",
			300: "#fda4af",
			400: "#fb7185",
			50: "#fff1f2",
			500: "#f43f5e",
			600: "#e11d48",
			700: "#be123c",
			800: "#9f1239",
			900: "#881337",
			950: "#4c0519",
		},
		sky: {
			100: "#e0f2fe",
			200: "#bae6fd",
			300: "#7dd3fc",
			400: "#38bdf8",
			50: "#f0f9ff",
			500: "#0ea5e9",
			600: "#0284c7",
			700: "#0369a1",
			800: "#075985",
			900: "#0c4a6e",
			950: "#082f49",
		},
		slate: {
			100: "#f1f5f9",
			200: "#e2e8f0",
			300: "#cbd5e1",
			400: "#94a3b8",
			50: "#f8fafc",
			500: "#64748b",
			600: "#475569",
			700: "#334155",
			800: "#1e293b",
			900: "#0f172a",
			950: "#020617",
		},
		stone: {
			100: "#f5f5f4",
			200: "#e7e5e3",
			300: "#d6d3d1",
			400: "#a8a29e",
			50: "#fafaf9",
			500: "#78716c",
			600: "#57534e",
			700: "#44403c",
			800: "#292524",
			900: "#1c1917",
			950: "#0c0a09",
		},
		teal: {
			100: "#ccfbf1",
			200: "#99f6e4",
			300: "#5eead4",
			400: "#2dd4bf",
			50: "#f0fdfa",
			500: "#14b8a6",
			600: "#0d9488",
			700: "#0f766e",
			800: "#115e59",
			900: "#134e4a",
			950: "#042f2e",
		},
		violet: {
			100: "#ede9fe",
			200: "#ddd6fe",
			300: "#c4b5fd",
			400: "#a78bfa",
			50: "#f5f3ff",
			500: "#8b5cf6",
			600: "#7c3aed",
			700: "#6d28d9",
			800: "#5b21b6",
			900: "#4c1d95",
			950: "#2e1065",
		},
		yellow: {
			100: "#fef9c3",
			200: "#fef08a",
			300: "#fde047",
			400: "#facc15",
			50: "#fefce8",
			500: "#eab308",
			600: "#ca8a04",
			700: "#a16207",
			800: "#854d0e",
			900: "#713f12",
			950: "#422006",
		},
		zinc: {
			100: "#f4f4f5",
			200: "#e4e4e7",
			300: "#d4d4d8",
			400: "#a1a1aa",
			50: "#fafafa",
			500: "#71717a",
			600: "#52525b",
			700: "#3f3f46",
			800: "#27272a",
			900: "#18181b",
			950: "#09090b",
		},
	};

	// react-pdf does not support the "transparent" keyword — use rgba(0,0,0,0) instead
	const flat: Record<string, string> = {
		black: "#000000",
		transparent: "rgba(0,0,0,0)",
		white: "#ffffff",
	};
	for (const [family, shades] of Object.entries(palette)) {
		for (const [shade, hex] of Object.entries(shades)) {
			flat[`${family}-${shade}`] = hex;
		}
	}

	// Shadcn semantic tokens (light theme defaults)
	flat.background = "#ffffff";
	flat.foreground = "#0a0a0a";
	flat.card = "#ffffff";
	flat["card-foreground"] = "#0a0a0a";
	flat.primary = "#171717";
	flat["primary-foreground"] = "#fafafa";
	flat.secondary = "#f5f5f5";
	flat["secondary-foreground"] = "#171717";
	flat.muted = "#f5f5f5";
	flat["muted-foreground"] = "#737373";
	flat.accent = "#f5f5f5";
	flat["accent-foreground"] = "#171717";
	flat.destructive = "#ef4444";
	flat["destructive-foreground"] = "#fafafa";
	flat.border = "#e5e5e5";
	flat.input = "#e5e5e5";
	flat.ring = "#a3a3a3";

	return flat;
}

// ─── Resolved theme ──────────────────────────────────────────────────────────

export interface ResolvedTheme {
	borderRadius: Record<string, number>;
	colors: Record<string, string>; // flat: "brand-500" → "#0073e6", "white" → "#fff"
	fontFamily: Record<string, string>;
	fontSize: Record<string, number>;
	fontWeight: Record<string, number>;
	letterSpacing: Record<string, number>;
	lineHeight: Record<string, number>;
	opacity: Record<string, number>;
	spacing: Record<string, number>;
	spacingBase: number;
}

export function resolveTheme(vars?: ThemeVars): ResolvedTheme {
	// Start with defaults
	let colors = buildDefaultColors();
	let spacing = { ...defaultSpacingSteps };
	let fontSize = { ...defaultFontSize };
	let borderRadius = { ...defaultRadius };
	let fontWeight = { ...defaultFontWeight };
	let opacity = { ...defaultOpacity };
	let lineHeight = { ...defaultLineHeight };
	let letterSpacing = { ...defaultLetterSpacing };
	let fontFamily = { ...defaultFontFamily };
	let spacingBase = DEFAULT_SPACING_BASE;

	if (!vars) {
		return {
			borderRadius,
			colors,
			fontFamily,
			fontSize,
			fontWeight,
			letterSpacing,
			lineHeight,
			opacity,
			spacing,
			spacingBase,
		};
	}

	// Pass 1: handle wildcard resets (--color-*: initial, --*: initial)
	for (const [key, val] of Object.entries(vars)) {
		if (val !== "initial") {
			continue;
		}
		const name = key.replace(/^--/, "");

		if (name === "*") {
			colors = {};
			spacing = {};
			fontSize = {};
			borderRadius = {};
			fontWeight = {};
			opacity = {};
			lineHeight = {};
			letterSpacing = {};
			fontFamily = {};
		} else if (name === "color-*") {
			colors = {};
		} else if (name === "text-*") {
			fontSize = {};
		} else if (name === "radius-*") {
			borderRadius = {};
		} else if (name === "spacing-*") {
			spacing = {};
		} else if (name === "font-weight-*") {
			fontWeight = {};
		} else if (name === "font-*") {
			fontFamily = {};
		} else if (name === "leading-*") {
			lineHeight = {};
		} else if (name === "tracking-*") {
			letterSpacing = {};
		} else if (name === "opacity-*") {
			opacity = {};
		}
	}

	// Pass 2: apply individual overrides / additions
	for (const [key, val] of Object.entries(vars)) {
		if (val === "initial") {
			continue;
		}
		const name = key.replace(/^--/, "");

		if (name.startsWith("color-")) {
			colors[name.slice(6)] = normalizeColor(String(val));
		} else if (name === "spacing") {
			spacingBase = Number(val);
		} else if (name.startsWith("spacing-")) {
			spacing[name.slice(8)] = Number(val);
		} else if (name.startsWith("text-")) {
			fontSize[name.slice(5)] = Number(val);
		} else if (name.startsWith("radius-")) {
			borderRadius[name.slice(7)] = Number(val);
		} else if (name.startsWith("font-weight-")) {
			fontWeight[name.slice(12)] = Number(val);
		} else if (name.startsWith("font-") && !name.startsWith("font-weight-")) {
			fontFamily[name.slice(5)] = String(val);
		} else if (name.startsWith("leading-")) {
			lineHeight[name.slice(8)] = Number(val);
		} else if (name.startsWith("tracking-")) {
			letterSpacing[name.slice(9)] = Number(val);
		} else if (name.startsWith("opacity-")) {
			opacity[name.slice(8)] = Number(val);
		}
	}

	return {
		borderRadius,
		colors,
		fontFamily,
		fontSize,
		fontWeight,
		letterSpacing,
		lineHeight,
		opacity,
		spacing,
		spacingBase,
	};
}

// ─── Parser factory ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Parser = (value: string) => any;

// Arbitrary length: "12" → 12 (pt), "12px" → 9 (1px = 0.75pt), "1rem" → 12
// (1rem = 16px), other units (pt, in, mm, cm, vw, vh, %) pass through as-is.
// Returns undefined for values that are not lengths (e.g. colors).
function arbitraryLength(inner: string): number | string | undefined {
	const m = inner.match(/^(-?\d*\.?\d+)(px|rem|pt|in|mm|cm|vw|vh|%)?$/);
	if (!m) {
		return undefined;
	}
	const n = Number(m[1]);
	switch (m[2]) {
		case undefined:
		case "pt":
			return n;
		case "px":
			return n * 0.75;
		case "rem":
			return n * 12;
		default:
			return inner;
	}
}

function buildMatchers(t: ResolvedTheme): Parser[] {
	function spacing(v: string): number | string | undefined {
		if (v in t.spacing) {
			return t.spacing[v];
		}
		// Arbitrary value: [100] or [12px] or [210mm] or [50vw] or [1in] or [50%]
		const arb = v.match(/^\[(.+)\]$/);
		if (arb?.[1]) {
			return arbitraryLength(arb[1]) ?? arb[1];
		}
		return undefined;
	}

	// Fraction lookup for w-1/2 etc.
	const fractions: Record<string, string> = {
		"1/12": "8.333333%",
		"1/2": "50%",
		"1/3": "33.333333%",
		"1/4": "25%",
		"1/5": "20%",
		"1/6": "16.666667%",
		"10/12": "83.333333%",
		"11/12": "91.666667%",
		"2/12": "16.666667%",
		"2/3": "66.666667%",
		"2/4": "50%",
		"2/5": "40%",
		"2/6": "33.333333%",
		"3/12": "25%",
		"3/4": "75%",
		"3/5": "60%",
		"3/6": "50%",
		"4/12": "33.333333%",
		"4/5": "80%",
		"4/6": "66.666667%",
		"5/12": "41.666667%",
		"5/6": "83.333333%",
		"6/12": "50%",
		"7/12": "58.333333%",
		"8/12": "66.666667%",
		"9/12": "75%",
	};

	function resolveColor(name: string): string | undefined {
		const arb = name.match(/^\[(.+)\]$/);
		if (arb) {
			return arb[1];
		}
		return t.colors[name];
	}

	// Handle color/opacity modifier: "destructive/10" → rgba(r, g, b, 0.1)
	function resolveColorAlpha(raw: string): string | undefined {
		const slash = raw.lastIndexOf("/");
		if (slash === -1) {
			return resolveColor(raw);
		}
		const name = raw.slice(0, slash);
		const alpha = Number(raw.slice(slash + 1));
		if (Number.isNaN(alpha)) {
			return resolveColor(raw);
		}
		const hex = resolveColor(name);
		if (!hex) {
			return undefined;
		}
		return hexToRgba(hex, alpha / 100);
	}

	// marginHorizontal → marginLeft + marginRight (explicit sides for "auto")
	function expandAxis(prop: string): string[] {
		if (prop.endsWith("Horizontal")) {
			const base = prop.slice(0, -10);
			return [`${base}Left`, `${base}Right`];
		}
		if (prop.endsWith("Vertical")) {
			const base = prop.slice(0, -8);
			return [`${base}Top`, `${base}Bottom`];
		}
		return [prop];
	}

	// Line height: named (tight) → multiplier, spacing (6) → absolute,
	// arbitrary: [1.2] → multiplier, [18px] → absolute.
	// react-pdf treats unitless numbers as multipliers, so absolute values
	// are emitted as "<n>pt" strings.
	function lineHeight(v: string): StyleValue | undefined {
		if (v in t.lineHeight) {
			return t.lineHeight[v];
		}
		const arb = v.match(/^\[(.+)\]$/);
		const inner = arb?.[1];
		if (inner) {
			if (/^\d*\.?\d+$/.test(inner)) {
				return Number(inner);
			}
			const len = arbitraryLength(inner);
			return typeof len === "number" ? `${len}pt` : len;
		}
		const sp = spacing(v);
		return typeof sp === "number" ? `${sp}pt` : undefined;
	}

	function spacingProp(prefix: string, props: string[]): Parser {
		return (cls: string) => {
			if (!cls.startsWith(`${prefix}-`)) {
				return null;
			}
			const raw = cls.slice(prefix.length + 1);
			if (raw === "auto") {
				if (!props[0]?.startsWith("margin")) {
					return null;
				}
				const out: StyleObject = {};
				for (const p of props.flatMap(expandAxis)) {
					out[p] = "auto";
				}
				return out;
			}
			const negative = raw.startsWith("-");
			const val = spacing(negative ? raw.slice(1) : raw);
			if (val === undefined) {
				return null;
			}
			const n = negative ? -val : val;
			const out: StyleObject = {};
			for (const p of props) {
				out[p] = n;
			}
			return out;
		};
	}

	return [
		// ── Display ──
		(cls) => {
			if (cls === "flex") {
				return { display: "flex" };
			}
			if (cls === "hidden") {
				return { display: "none" };
			}
			return null;
		},

		// ── Flex direction / wrap ──
		(cls) => {
			const map: Record<string, StyleObject> = {
				"flex-col": { flexDirection: "column" },
				"flex-col-reverse": { flexDirection: "column-reverse" },
				"flex-nowrap": { flexWrap: "nowrap" },
				"flex-row": { flexDirection: "row" },
				"flex-row-reverse": { flexDirection: "row-reverse" },
				"flex-wrap": { flexWrap: "wrap" },
				"flex-wrap-reverse": { flexWrap: "wrap-reverse" },
			};
			return map[cls] ?? null;
		},

		// ── Flex grow/shrink ──
		(cls) => {
			const map: Record<string, StyleObject> = {
				"flex-1": { flex: 1 },
				"flex-auto": { flexBasis: "auto", flexGrow: 1, flexShrink: 1 },
				"flex-initial": { flexBasis: "auto", flexGrow: 0, flexShrink: 1 },
				"flex-none": { flex: 0 },
				grow: { flexGrow: 1 },
				"grow-0": { flexGrow: 0 },
				shrink: { flexShrink: 1 },
				"shrink-0": { flexShrink: 0 },
			};
			if (map[cls]) {
				return map[cls];
			}
			// flex-2, flex-[1.5] → flex: n
			const m = cls.match(/^flex-(?:(\d+)|\[(\d*\.?\d+)\])$/);
			return m ? { flex: Number(m[1] ?? m[2]) } : null;
		},

		// ── Align / Justify ──
		(cls) => {
			const map: Record<string, StyleObject> = {
				"content-around": { alignContent: "space-around" },
				"content-between": { alignContent: "space-between" },
				"content-center": { alignContent: "center" },
				"content-end": { alignContent: "flex-end" },
				"content-start": { alignContent: "flex-start" },
				"content-stretch": { alignContent: "stretch" },
				"items-baseline": { alignItems: "baseline" },
				"items-center": { alignItems: "center" },
				"items-end": { alignItems: "flex-end" },
				"items-start": { alignItems: "flex-start" },
				"items-stretch": { alignItems: "stretch" },
				"justify-around": { justifyContent: "space-around" },
				"justify-between": { justifyContent: "space-between" },
				"justify-center": { justifyContent: "center" },
				"justify-end": { justifyContent: "flex-end" },
				"justify-evenly": { justifyContent: "space-evenly" },
				"justify-start": { justifyContent: "flex-start" },
				"self-auto": { alignSelf: "auto" },
				"self-baseline": { alignSelf: "baseline" },
				"self-center": { alignSelf: "center" },
				"self-end": { alignSelf: "flex-end" },
				"self-start": { alignSelf: "flex-start" },
				"self-stretch": { alignSelf: "stretch" },
			};
			return map[cls] ?? null;
		},

		// ── Gap ──
		(cls) => {
			if (cls.startsWith("gap-x-")) {
				const v = spacing(cls.slice(6));
				return v !== undefined ? { columnGap: v } : null;
			}
			if (cls.startsWith("gap-y-")) {
				const v = spacing(cls.slice(6));
				return v !== undefined ? { rowGap: v } : null;
			}
			if (cls.startsWith("gap-")) {
				const v = spacing(cls.slice(4));
				return v !== undefined ? { gap: v } : null;
			}
			return null;
		},

		// ── Position ──
		(cls) => {
			if (cls === "relative") {
				return { position: "relative" };
			}
			if (cls === "absolute") {
				return { position: "absolute" };
			}
			if (cls === "fixed") {
				return { position: "fixed" };
			}
			return null;
		},

		// ── Inset (individual sides) ──
		(cls) => {
			for (const d of ["top", "right", "bottom", "left"] as const) {
				if (cls.startsWith(`${d}-`)) {
					const raw = cls.slice(d.length + 1);
					const negative = raw.startsWith("-");
					const val = spacing(negative ? raw.slice(1) : raw);
					if (val === undefined) {
						continue;
					}
					return { [d]: negative && typeof val === "number" ? -val : val };
				}
			}
			return null;
		},

		// ── Inset shorthands ──
		(cls) => {
			let raw: string;
			let props: string[];
			if (cls.startsWith("inset-x-")) {
				raw = cls.slice(8);
				props = ["left", "right"];
			} else if (cls.startsWith("inset-y-")) {
				raw = cls.slice(8);
				props = ["top", "bottom"];
			} else if (cls.startsWith("inset-")) {
				raw = cls.slice(6);
				props = ["top", "right", "bottom", "left"];
			} else {
				return null;
			}
			const negative = raw.startsWith("-");
			const val = spacing(negative ? raw.slice(1) : raw);
			if (val === undefined) {
				return null;
			}
			const n = negative && typeof val === "number" ? -val : val;
			const out: StyleObject = {};
			for (const p of props) {
				out[p] = n;
			}
			return out;
		},

		// ── Overflow ──
		(cls) => {
			if (cls === "overflow-hidden") {
				return { overflow: "hidden" };
			}
			if (cls === "overflow-visible") {
				return { overflow: "visible" };
			}
			return null;
		},

		// ── Z-index ──
		(cls) => {
			if (!cls.startsWith("z-")) {
				return null;
			}
			const v = cls.slice(2);
			const n = /^\[(\d+)\]$/.test(v) ? Number(v.slice(1, -1)) : Number(v);
			return Number.isNaN(n) ? null : { zIndex: n };
		},

		// ── Size (width + height) ──
		(cls) => {
			if (cls === "size-full") {
				return { height: "100%", width: "100%" };
			}
			if (cls === "size-auto") {
				return { height: "auto", width: "auto" };
			}
			if (cls.startsWith("size-")) {
				const raw = cls.slice(5);
				if (raw in fractions) {
					return { height: fractions[raw], width: fractions[raw] };
				}
				const v = spacing(raw);
				return v !== undefined ? { height: v, width: v } : null;
			}
			return null;
		},

		// ── Width ──
		(cls) => {
			if (cls === "w-full") {
				return { width: "100%" };
			}
			if (cls === "w-auto") {
				return { width: "auto" };
			}
			if (cls.startsWith("w-")) {
				const raw = cls.slice(2);
				if (raw in fractions) {
					return { width: fractions[raw] };
				}
				const v = spacing(raw);
				return v !== undefined ? { width: v } : null;
			}
			if (cls === "min-w-full") {
				return { minWidth: "100%" };
			}
			if (cls.startsWith("min-w-")) {
				const raw = cls.slice(6);
				if (raw in fractions) {
					return { minWidth: fractions[raw] };
				}
				const v = spacing(raw);
				return v !== undefined ? { minWidth: v } : null;
			}
			if (cls === "max-w-full") {
				return { maxWidth: "100%" };
			}
			if (cls === "max-w-none") {
				return { maxWidth: "none" };
			}
			if (cls.startsWith("max-w-")) {
				const raw = cls.slice(6);
				if (raw in fractions) {
					return { maxWidth: fractions[raw] };
				}
				const v = spacing(raw);
				return v !== undefined ? { maxWidth: v } : null;
			}
			return null;
		},

		// ── Height ──
		(cls) => {
			if (cls === "h-full") {
				return { height: "100%" };
			}
			if (cls === "h-auto") {
				return { height: "auto" };
			}
			if (cls.startsWith("h-")) {
				const raw = cls.slice(2);
				if (raw in fractions) {
					return { height: fractions[raw] };
				}
				const v = spacing(raw);
				return v !== undefined ? { height: v } : null;
			}
			if (cls === "min-h-full") {
				return { minHeight: "100%" };
			}
			if (cls.startsWith("min-h-")) {
				const raw = cls.slice(6);
				if (raw in fractions) {
					return { minHeight: fractions[raw] };
				}
				const v = spacing(raw);
				return v !== undefined ? { minHeight: v } : null;
			}
			if (cls === "max-h-full") {
				return { maxHeight: "100%" };
			}
			if (cls.startsWith("max-h-")) {
				const raw = cls.slice(6);
				if (raw in fractions) {
					return { maxHeight: fractions[raw] };
				}
				const v = spacing(raw);
				return v !== undefined ? { maxHeight: v } : null;
			}
			return null;
		},

		// ── Padding ──
		spacingProp("p", [
			"paddingTop",
			"paddingRight",
			"paddingBottom",
			"paddingLeft",
		]),
		spacingProp("px", ["paddingHorizontal"]),
		spacingProp("py", ["paddingVertical"]),
		spacingProp("pt", ["paddingTop"]),
		spacingProp("pr", ["paddingRight"]),
		spacingProp("pb", ["paddingBottom"]),
		spacingProp("pl", ["paddingLeft"]),

		// ── Margin ──
		spacingProp("m", [
			"marginTop",
			"marginRight",
			"marginBottom",
			"marginLeft",
		]),
		spacingProp("mx", ["marginHorizontal"]),
		spacingProp("my", ["marginVertical"]),
		spacingProp("mt", ["marginTop"]),
		spacingProp("mr", ["marginRight"]),
		spacingProp("mb", ["marginBottom"]),
		spacingProp("ml", ["marginLeft"]),

		// ── Text overflow ──
		(cls) => {
			if (cls === "truncate") {
				return { maxLines: 1, textOverflow: "ellipsis" };
			}
			if (cls === "text-ellipsis") {
				return { textOverflow: "ellipsis" };
			}
			if (cls === "text-clip") {
				return { textOverflow: "clip" };
			}
			return null;
		},

		// ── Font size (--text-*) ──
		(cls) => {
			if (!cls.startsWith("text-")) {
				return null;
			}
			// text-sm/6 → font size + line height
			const slash = cls.indexOf("/", 5);
			const key = slash === -1 ? cls.slice(5) : cls.slice(5, slash);
			let size: StyleValue | undefined;
			if (key in t.fontSize) {
				size = t.fontSize[key];
			} else {
				const arb = key.match(/^\[(.+)\]$/);
				size = arb?.[1] ? arbitraryLength(arb[1]) : undefined;
			}
			if (size === undefined) {
				return null;
			}
			if (slash === -1) {
				return { fontSize: size };
			}
			const lh = lineHeight(cls.slice(slash + 1));
			return lh === undefined ? null : { fontSize: size, lineHeight: lh };
		},

		// ── Text color (--color-*) ──
		(cls) => {
			if (!cls.startsWith("text-")) {
				return null;
			}
			const c = resolveColorAlpha(cls.slice(5));
			return c ? { color: c } : null;
		},

		// ── Background color ──
		(cls) => {
			if (!cls.startsWith("bg-")) {
				return null;
			}
			const c = resolveColorAlpha(cls.slice(3));
			return c ? { backgroundColor: c } : null;
		},

		// ── Font weight (--font-weight-*) ──
		(cls) => {
			if (!cls.startsWith("font-")) {
				return null;
			}
			const key = cls.slice(5);
			return key in t.fontWeight ? { fontWeight: t.fontWeight[key] } : null;
		},

		// ── Font family ──
		(cls) => {
			if (!cls.startsWith("font-")) {
				return null;
			}
			const key = cls.slice(5);
			const arb = key.match(/^\[(.+)\]$/);
			if (arb) {
				return { fontFamily: arb[1] };
			}
			return key in t.fontFamily ? { fontFamily: t.fontFamily[key] } : null;
		},

		// ── Font style ──
		(cls) => {
			if (cls === "italic") {
				return { fontStyle: "italic" };
			}
			if (cls === "not-italic") {
				return { fontStyle: "normal" };
			}
			return null;
		},

		// ── Text align ──
		(cls) => {
			const map: Record<string, StyleObject> = {
				"text-center": { textAlign: "center" },
				"text-justify": { textAlign: "justify" },
				"text-left": { textAlign: "left" },
				"text-right": { textAlign: "right" },
			};
			return map[cls] ?? null;
		},

		// ── Text decoration ──
		(cls) => {
			const map: Record<string, StyleObject> = {
				"line-through": { textDecoration: "line-through" },
				"no-underline": { textDecoration: "none" },
				underline: { textDecoration: "underline" },
			};
			return map[cls] ?? null;
		},

		// ── Text transform ──
		(cls) => {
			const map: Record<string, StyleObject> = {
				capitalize: { textTransform: "capitalize" },
				lowercase: { textTransform: "lowercase" },
				"normal-case": { textTransform: "none" },
				uppercase: { textTransform: "uppercase" },
			};
			return map[cls] ?? null;
		},

		// ── Line height (--leading-*) ──
		(cls) => {
			if (!cls.startsWith("leading-")) {
				return null;
			}
			const lh = lineHeight(cls.slice(8));
			return lh === undefined ? null : { lineHeight: lh };
		},

		// ── Letter spacing (--tracking-*) ──
		(cls) => {
			if (!cls.startsWith("tracking-")) {
				return null;
			}
			const v = cls.slice(9);
			return v in t.letterSpacing
				? { letterSpacing: t.letterSpacing[v] }
				: null;
		},

		// ── Max lines ──
		(cls) => {
			if (!cls.startsWith("line-clamp-")) {
				return null;
			}
			const n = Number(cls.slice(11));
			return Number.isNaN(n) ? null : { maxLines: n };
		},

		// ── Border width ──
		(cls) => {
			if (cls === "border") {
				return { borderWidth: 1 };
			}
			if (cls === "border-0") {
				return { borderWidth: 0 };
			}
			if (/^border-[0-9]/.test(cls)) {
				return { borderWidth: Number(cls.slice(7)) };
			}
			for (const [axis, props] of [
				["x", ["borderLeftWidth", "borderRightWidth"]],
				["y", ["borderTopWidth", "borderBottomWidth"]],
			] as const) {
				const width =
					cls === `border-${axis}`
						? 1
						: cls.startsWith(`border-${axis}-`)
							? Number(cls.slice(9))
							: Number.NaN;
				if (!Number.isNaN(width)) {
					return { [props[0]]: width, [props[1]]: width };
				}
			}
			for (const [side, prop] of [
				["t", "borderTopWidth"],
				["r", "borderRightWidth"],
				["b", "borderBottomWidth"],
				["l", "borderLeftWidth"],
			] as const) {
				if (cls === `border-${side}`) {
					return { [prop]: 1 };
				}
				if (
					cls.startsWith(`border-${side}-`) &&
					!Number.isNaN(Number(cls.slice(9)))
				) {
					return { [prop]: Number(cls.slice(9)) };
				}
			}
			return null;
		},

		// ── Border color ──
		(cls) => {
			if (!cls.startsWith("border-")) {
				return null;
			}
			const c = resolveColorAlpha(cls.slice(7));
			return c ? { borderColor: c } : null;
		},

		// ── Border style ──
		(cls) => {
			const map: Record<string, StyleObject> = {
				"border-dashed": { borderStyle: "dashed" },
				"border-dotted": { borderStyle: "dotted" },
				"border-solid": { borderStyle: "solid" },
			};
			return map[cls] ?? null;
		},

		// ── Border per-side color & style ──
		(cls) => {
			const sides: Record<string, string[]> = {
				b: ["Bottom"],
				l: ["Left"],
				r: ["Right"],
				t: ["Top"],
				x: ["Left", "Right"],
				y: ["Top", "Bottom"],
			};
			for (const [s, caps] of Object.entries(sides)) {
				const prefix = `border-${s}-`;
				if (!cls.startsWith(prefix)) {
					continue;
				}
				const val = cls.slice(prefix.length);
				// Style keywords, then color
				const isStyle = val === "solid" || val === "dashed" || val === "dotted";
				const v = isStyle ? val : resolveColorAlpha(val);
				if (v) {
					const out: StyleObject = {};
					for (const cap of caps) {
						out[`border${cap}${isStyle ? "Style" : "Color"}`] = v;
					}
					return out;
				}
			}
			return null;
		},

		// ── Border radius (--radius-*) ──
		(cls) => {
			if (cls === "rounded") {
				return { borderRadius: t.borderRadius.DEFAULT ?? 4 };
			}
			if (cls === "rounded-none") {
				return { borderRadius: 0 };
			}
			if (cls === "rounded-full") {
				return { borderRadius: t.borderRadius.full ?? 999 };
			}
			if (!cls.startsWith("rounded-")) {
				return null;
			}

			const key = cls.slice(8);
			const sideMap: Record<string, string[]> = {
				b: ["borderBottomLeftRadius", "borderBottomRightRadius"],
				bl: ["borderBottomLeftRadius"],
				br: ["borderBottomRightRadius"],
				l: ["borderTopLeftRadius", "borderBottomLeftRadius"],
				r: ["borderTopRightRadius", "borderBottomRightRadius"],
				t: ["borderTopLeftRadius", "borderTopRightRadius"],
				tl: ["borderTopLeftRadius"],
				tr: ["borderTopRightRadius"],
			};
			for (const [side, props] of Object.entries(sideMap)) {
				if (key.startsWith(`${side}-`)) {
					const rKey = key.slice(side.length + 1);
					const v = t.borderRadius[rKey];
					if (v !== undefined) {
						const out: StyleObject = {};
						for (const p of props) {
							out[p] = v;
						}
						return out;
					}
				}
			}
			return key in t.borderRadius
				? { borderRadius: t.borderRadius[key] }
				: null;
		},

		// ── Opacity ──
		(cls) => {
			if (!cls.startsWith("opacity-")) {
				return null;
			}
			const v = cls.slice(8);
			return v in t.opacity ? { opacity: t.opacity[v] } : null;
		},

		// ── Object fit / position ──
		(cls) => {
			if (!cls.startsWith("object-")) {
				return null;
			}
			const v = cls.slice(7);
			if (["contain", "cover", "fill", "none", "scale-down"].includes(v)) {
				return { objectFit: v };
			}
			if (["bottom", "center", "left", "right", "top"].includes(v)) {
				return { objectPosition: v };
			}
			return null;
		},

		// ── Flex-basis ──
		(cls) => {
			if (!cls.startsWith("basis-")) {
				return null;
			}
			const raw = cls.slice(6);
			if (raw === "auto") {
				return { flexBasis: "auto" };
			}
			if (raw === "full") {
				return { flexBasis: "100%" };
			}
			if (raw in fractions) {
				return { flexBasis: fractions[raw] };
			}
			const v = spacing(raw);
			return v !== undefined ? { flexBasis: v } : null;
		},

		// ── Order ──
		(cls) => {
			if (!cls.startsWith("order-")) {
				return null;
			}
			const v = cls.slice(6);
			if (v === "first") {
				return { order: -9999 };
			}
			if (v === "last") {
				return { order: 9999 };
			}
			if (v === "none") {
				return { order: 0 };
			}
			const n = Number(v);
			return Number.isNaN(n) ? null : { order: n };
		},

		// ── Aspect ratio ──
		(cls) => {
			if (!cls.startsWith("aspect-")) {
				return null;
			}
			const v = cls.slice(7);
			if (v === "square") {
				return { aspectRatio: 1 };
			}
			if (v === "video") {
				return { aspectRatio: 16 / 9 };
			}
			if (v === "auto") {
				return { aspectRatio: "auto" };
			}
			const arb = v.match(/^\[(.+)\]$/);
			const inner = arb?.[1];
			if (inner) {
				if (inner.includes("/")) {
					const [num = Number.NaN, den = Number.NaN] = inner
						.split("/")
						.map(Number);
					return !(Number.isNaN(num) || Number.isNaN(den)) && den !== 0
						? { aspectRatio: num / den }
						: null;
				}
				const n = Number(inner);
				return Number.isNaN(n) ? null : { aspectRatio: n };
			}
			return null;
		},

		// ── Text decoration style ──
		(cls) => {
			if (!cls.startsWith("decoration-")) {
				return null;
			}
			const v = cls.slice(11);
			const styles: Record<string, string> = {
				dashed: "dashed",
				dotted: "dotted",
				double: "double",
				solid: "solid",
				wavy: "wavy",
			};
			if (v in styles) {
				return { textDecorationStyle: styles[v] };
			}
			const c = resolveColorAlpha(v);
			return c ? { textDecorationColor: c } : null;
		},

		// ── Text indent ──
		(cls) => {
			if (!cls.startsWith("indent-")) {
				return null;
			}
			const v = spacing(cls.slice(7));
			return v !== undefined ? { textIndent: v } : null;
		},

		// ── Transform: rotate ──
		(cls) => {
			if (!cls.startsWith("rotate-")) {
				return null;
			}
			const raw = cls.slice(7);
			const arb = raw.match(/^\[(.+)\]$/);
			const deg = arb ? Number(arb[1]) : Number(raw);
			return Number.isNaN(deg) ? null : { transform: `rotate(${deg}deg)` };
		},

		// ── Transform: scale ──
		(cls) => {
			if (cls.startsWith("scale-x-")) {
				const n = Number(cls.slice(8));
				return Number.isNaN(n) ? null : { transform: `scaleX(${n / 100})` };
			}
			if (cls.startsWith("scale-y-")) {
				const n = Number(cls.slice(8));
				return Number.isNaN(n) ? null : { transform: `scaleY(${n / 100})` };
			}
			if (cls.startsWith("scale-")) {
				const n = Number(cls.slice(6));
				return Number.isNaN(n) ? null : { transform: `scale(${n / 100})` };
			}
			return null;
		},

		// ── Transform: translate ──
		(cls) => {
			if (cls.startsWith("translate-x-")) {
				const v = spacing(cls.slice(12));
				return v !== undefined
					? {
							transform: `translateX(${v}${typeof v === "number" ? "pt" : ""})`,
						}
					: null;
			}
			if (cls.startsWith("translate-y-")) {
				const v = spacing(cls.slice(12));
				return v !== undefined
					? {
							transform: `translateY(${v}${typeof v === "number" ? "pt" : ""})`,
						}
					: null;
			}
			return null;
		},

		// ── Transform: skew ──
		(cls) => {
			if (cls.startsWith("skew-x-")) {
				const raw = cls.slice(7);
				const arb = raw.match(/^\[(.+)\]$/);
				const deg = arb ? Number(arb[1]) : Number(raw);
				return Number.isNaN(deg) ? null : { transform: `skewX(${deg}deg)` };
			}
			if (cls.startsWith("skew-y-")) {
				const raw = cls.slice(7);
				const arb = raw.match(/^\[(.+)\]$/);
				const deg = arb ? Number(arb[1]) : Number(raw);
				return Number.isNaN(deg) ? null : { transform: `skewY(${deg}deg)` };
			}
			return null;
		},

		// ── Transform origin ──
		(cls) => {
			if (!cls.startsWith("origin-")) {
				return null;
			}
			const map: Record<string, string> = {
				bottom: "center bottom",
				"bottom-left": "left bottom",
				"bottom-right": "right bottom",
				center: "center center",
				left: "left center",
				right: "right center",
				top: "center top",
				"top-left": "left top",
				"top-right": "right top",
			};
			const key = cls.slice(7);
			return key in map ? { transformOrigin: map[key] } : null;
		},
	];
}

// ─── createTw ────────────────────────────────────────────────────────────────

export type TwFn = (classString: string) => StyleObject;

export function createTw(vars?: ThemeVars): TwFn {
	const theme = resolveTheme(vars);
	const matchers = buildMatchers(theme);
	const cache = new Map<string, StyleObject>();

	// Negative prefix map: -mt-2 → mt-(-2) internally
	// Longer prefixes must come first to avoid prefix overlap (inset-x before inset)
	const negPrefixes = [
		"m",
		"mx",
		"my",
		"mt",
		"mr",
		"mb",
		"ml",
		"p",
		"px",
		"py",
		"pt",
		"pr",
		"pb",
		"pl",
		"top",
		"right",
		"bottom",
		"left",
		"inset-x",
		"inset-y",
		"inset",
	];

	function parseNegative(cls: string): string | null {
		if (!cls.startsWith("-")) {
			return null;
		}
		const rest = cls.slice(1); // e.g. "mt-2"
		for (const prefix of negPrefixes) {
			if (rest.startsWith(`${prefix}-`)) {
				const val = rest.slice(prefix.length + 1);
				return `${prefix}--${val}`;
			}
		}
		return null;
	}

	const warned = new Set<string>();

	function parseSingle(cls: string): StyleObject {
		// Try negative prefix: -mt-2 → mt--2 (spacingProp handles the leading -)
		const negCls = parseNegative(cls);
		if (negCls) {
			for (const m of matchers) {
				const r = m(negCls);
				if (r) {
					return r;
				}
			}
		}
		for (const m of matchers) {
			const r = m(cls);
			if (r) {
				return r;
			}
		}
		if (
			typeof process !== "undefined" &&
			process.env?.NODE_ENV !== "production" &&
			!warned.has(cls)
		) {
			warned.add(cls);
			console.warn(`[@ui-registries/pdf] Unknown utility class: "${cls}"`);
		}
		return {};
	}

	return (classString: string): StyleObject => {
		if (!classString) {
			return {};
		}
		const cached = cache.get(classString);
		if (cached) {
			return cached;
		}
		const result: StyleObject = {};
		const transforms: string[] = [];
		for (const cls of classString.trim().split(/\s+/)) {
			const parsed = parseSingle(cls);
			if (parsed.transform) {
				transforms.push(parsed.transform as string);
				delete parsed.transform;
			}
			Object.assign(result, parsed);
		}
		if (transforms.length) {
			result.transform = transforms.join(" ");
		}
		cache.set(classString, result);
		return result;
	};
}

// Default tw (no custom theme)
export const tw: TwFn = createTw();
