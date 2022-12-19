import { addAnotherDays, addDays, format_yyyy_mm_dd, subDays } from './calendar';

describe('CalendarFunctions', () => {
	it('format_yyyy_mm_dd', () => {
		const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
		months.forEach((month) => {
			const referenceFormat = `2012-${month.toString().padStart(2, '0')}-28`;
			const formattedDate = format_yyyy_mm_dd(new Date(2012, month - 1, 28, 6, 0, 0));
			expect(formattedDate).toEqual(referenceFormat);
		});
	});

	it('addAnotherDays', () => {
		const cases = [
			{ list: [1, 7, 8, 14], expect: 0 },
			{ list: [4, 5, 11, 12], expect: 2 },
			{
				list: [2, 3, 6, 9, 10, 13, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
				expect: 1,
			},
		];
		cases.forEach((Case) =>
			Case.list.forEach((days) => expect(addAnotherDays(days)).toEqual(Case.expect))
		);
	});

	it('addDays', () => {
		expect(addDays(new Date(2022, 9, 28), 2).getDate()).toEqual(30);
		const day = new Date();
		expect(subDays(addDays(day, 2), 2)).toEqual(day);
	});
});
