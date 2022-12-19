/**
 * Round float point numbers according UITBot rules
 * @param num input number
 * @param breakpoint breakpoint to round number up.
 * @returns integer value
 */
export function round(num: number, breakpoint = 95): number {
	if (Math.abs((num * 100) % 100) > breakpoint) {
		return num >= 0 ? Math.ceil(num) : Math.floor(num);
	} else {
		const result = num >= 0 ? Math.floor(num) : Math.ceil(num);
		return Math.abs(result) === 0 ? 0 : result;
	}
}
