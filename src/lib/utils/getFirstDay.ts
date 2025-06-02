export function getFirstDay(weekDay: number, year: number): Date {
	const startDate = new Date(year, 8, 1);
	const startDay  = startDate.getDay();
	const diff      = weekDay - startDay;
	startDate.setDate((diff + 8) % 7 + 1);
	return startDate;
}
