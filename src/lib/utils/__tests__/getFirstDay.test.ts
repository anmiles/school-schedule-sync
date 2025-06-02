import { getFirstDay } from '../getFirstDay';

const specs = [
	{ year: 2000, firstDays: [ 4, 5, 6, 7, 1, 2, 3 ] },
	{ year: 2012, firstDays: [ 3, 4, 5, 6, 7, 1, 2 ] },
	{ year: 2020, firstDays: [ 7, 1, 2, 3, 4, 5, 6 ] },
	{ year: 2025, firstDays: [ 1, 2, 3, 4, 5, 6, 7 ] },
];

describe('src/lib/utils/getFirstDay', () => {
	describe('getFirstDay', () => {
		specs.forEach(({ year, firstDays }) => {
			describe(year, () => {
				firstDays.forEach((firstDay, weekDay) => {
					it(`should return September ${firstDay} for weekDay #${weekDay}`, () => {
						const result = getFirstDay(weekDay, year);
						expect(result.getDate()).toEqual(firstDay);
					});
				});
			});
		});
	});
});
