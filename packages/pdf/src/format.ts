// ─── Intl formatting for the built-in fonts ─────────────────────────────────
// Some locales (fr-FR…) format numbers and dates with a narrow no-break space
// (U+202F) or a minus sign (U+2212), which the built-in PDF fonts (Helvetica,
// Times, Courier) can't draw. pdfSafe swaps them for a regular no-break space
// and a hyphen-minus.

// Built from code points: formatters tend to turn \u escapes into invisible
// literal characters.
const NARROW_NO_BREAK_SPACE = new RegExp(String.fromCharCode(0x20_2f), "g");
const MINUS_SIGN = new RegExp(String.fromCharCode(0x22_12), "g");
const NO_BREAK_SPACE = String.fromCharCode(0xa0);

export const toPdfSafe = (text: string): string =>
	text.replace(NARROW_NO_BREAK_SPACE, NO_BREAK_SPACE).replace(MINUS_SIGN, "-");

/**
 * Wraps an Intl formatter so its output renders with the built-in fonts.
 *
 * @example
 * const money = pdfSafe(new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }));
 * money.format(-1234.5); // "-1 234,50 €"
 */
export const pdfSafe = <T>(formatter: {
	format: (value: T) => string;
}): { format: (value: T) => string } => ({
	format: (value: T) => toPdfSafe(formatter.format(value)),
});
