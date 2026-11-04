// Lightweight className joiner — filters falsy values and joins with space.
export const cn = (
	...args: (string | false | null | undefined | 0 | "")[]
): string => {
	let result = "";
	for (const a of args) {
		if (a) {
			if (result) {
				result += " ";
			}
			result += a;
		}
	}
	return result;
};
