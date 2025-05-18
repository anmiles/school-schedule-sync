import { filterProfiles, getAPI } from '@anmiles/google-api-wrapper';
import { error, info, log } from '@anmiles/logger';
import { calendar as api } from 'googleapis/build/src/apis/calendar';

import schedule from '../../input/schedule.json';
import '@anmiles/prototypes';

const fullScopes = [
	'https://www.googleapis.com/auth/calendar.calendars.readonly',
	'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
	'https://www.googleapis.com/auth/calendar.events.owned',
];

export async function run(profile?: string): Promise<void> {
	if (!profile) {
		error('Please specify a profile');
		process.exit(1);
	}

	const firstDays: Record<number, Date> = {};

	const year     = new Date().getFullYear();
	const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

	for (let i = 0; i < 7; i++) {
		const date     = new Date(year, 8, i + 1);
		const day      = (date.getDay() + 6) % 7;
		firstDays[day] = date;
	}

	for (const foundProfile of filterProfiles(profile)) {
		info('Creating API...');
		const calendarAPI = await getAPI((auth) => api({ version: 'v3', auth }), foundProfile, { temporary: true, scopes: fullScopes });

		for (const calendar of schedule.calendars) {
			info('Getting calendar...');
			const allCalendars = await calendarAPI.getItems((api) => api.calendarList, {}, { hideProgress: true });
			const calendarId   = allCalendars.find((c) => c.summary === calendar.name)?.id;

			if (!calendarId) {
				error(`Cannot find calendar '${calendar.name}'`);
				process.exit(1);
			}

			info('Clearing calendar...');
			const allEvents = await calendarAPI.getItems((api) => api.events, { calendarId }, { hideProgress: true });

			await allEvents.forEachAsync(async (event) => {
				log(`\t${event.summary}`);
				await calendarAPI.api?.events.delete({ calendarId, eventId: event.id ?? '' });
			});

			info('Creating events...');
			const allLessons = 'lessons' in calendar
				? calendar.lessons!.map((day) => day.map((name, index) => ({ name, ...schedule.defaultLessons[index]! })))
				: calendar.sections;

			await allLessons.forEachAsync(async (lessons, dayIndex) => {
				const firstDay = new Date(firstDays[dayIndex!]!);

				log(`\t#${dayIndex! + 1}`);
				await lessons.forEachAsync(async (lesson) => {
					const [ startHour, startMinute ] = lesson.startTime.split(':').map((str) => parseInt(str));

					const startDate = new Date(firstDay);
					startDate.setHours(startHour ?? 0);
					startDate.setMinutes(startMinute ?? 0);

					const endDate = new Date(startDate);
					endDate.setMinutes(endDate.getMinutes() + lesson.length);

					const dayAbbr = firstDay.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2).toUpperCase();

					log(`\t${lesson.name}: ${startDate.toLocaleString('en-US', { timeZone })}`);
					await calendarAPI.api?.events.insert({
						calendarId,
						requestBody: {
							start     : { dateTime: startDate.toISOString(), timeZone },
							end       : { dateTime: endDate.toISOString(), timeZone },
							summary   : lesson.name,
							recurrence: [ `RRULE:FREQ=WEEKLY;WKST=MO;UNTIL=${year + 1}0525T000000Z;BYDAY=${dayAbbr}` ],
						},
					}, {});
				});
			});
		}
	}
}
