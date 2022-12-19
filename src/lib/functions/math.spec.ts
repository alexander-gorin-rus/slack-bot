import { round } from './math';

describe('MathFunctions', () => {
	it('round', () => {
		const pairs = [
			[6.96, 7],
			[6.95, 6],
			[7.2, 7],
			[6.02, 6],
			[-6.96, -7],
			[-6.95, -6],
			[-7.2, -7],
			[-6.02, -6],
			[0, 0],
		];

		pairs.forEach((pair) => expect(round(pair[0])).toEqual(pair[1]));
	});
});
