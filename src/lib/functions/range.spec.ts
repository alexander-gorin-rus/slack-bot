import { range } from './range';

describe('RangeFunctions', () => {
	it('range', () => {
		expect(range(15)).toHaveLength(15);
		expect(range(15, 1)).toHaveLength(15);
		expect(range(15, 2)[0]).toEqual(2);
	});
});
