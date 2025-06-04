import fs from 'fs';

import { getAPI } from '@anmiles/google-api-wrapper';
import { info, log } from '@anmiles/logger';
import { validate } from '@anmiles/zod-tools';
import { calendar as api } from 'googleapis/build/src/apis/calendar';
import '@anmiles/prototypes';

import { scheduleSchema  } from './types';
import { getFirstDay } from './utils/getFirstDay';
import { getScheduleFile } from './utils/paths';

const fullScopes = [
	'https://www.googleapis.com/auth/calendar.calendars.readonly',
	'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
	'https://www.googleapis.com/auth/calendar.events.owned',
];

const YEAR     = new Date().getFullYear();
const TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

export async function sync(profile: string): Promise<void> {

	const scheduleJSON = fs.readJSON(getScheduleFile());
	const schedule     = validate(scheduleJSON, scheduleSchema);

	const calendarAPI  = await getAPI((auth) => api({ version: 'v3', auth }), profile, { temporary: true, scopes: fullScopes });
	const allCalendars = await calendarAPI.getItems((api) => api.calendarList, {}, { hideProgress: true });

	if (allCalendars.length === 0) {
		throw new Error(`There are no available calendars for profile '${profile}'`);
	}

	for (const calendar of schedule.calendars) {
		info(`Calendar '${calendar.name}'...`);
		const calendarId = allCalendars.find((c) => c.summary === calendar.name)?.id;

		if (!calendarId) {
			throw new Error(`Unknown calendar '${calendar.name}' for profile '${profile}'`);
		}

		log('Clearing calendar...');
		const allEvents = await calendarAPI.getItems((api) => api.events, { calendarId }, { hideProgress: true });

		await allEvents.forEachAsync(async (event) => {
			log(`    ${event.summary}`);
			await calendarAPI.api.events.delete({ calendarId, eventId: event.id ?? '' });
		});

		log('Creating events...');

		const sectionsOrLessons = calendar.type === 'sections'
			? calendar.days
			: calendar.days.map((day) => day.map((name, index) => {
					const time = calendar.lessonTimes?.[index] ?? schedule.defaults.lessonTimes?.[index];

					if (!time) {
						throw new Error(`Cannot find time described for lesson #${index + 1} in calendar '${calendar.name}'`);
					}

					return { name, ...time };
				}));

		await sectionsOrLessons.forEachAsync(async (events, weekDay) => {
			const firstDay = getFirstDay(weekDay, YEAR);
			log(`  #${weekDay + 1}`);

			await events.forEachAsync(async (event) => {
				const [ startHour, startMinute ] = event.startTime.split(':').map((str) => parseInt(str)).toTuple(2);

				const startDate = new Date(firstDay);
				startDate.setHours(startHour);
				startDate.setMinutes(startMinute);

				const endDate = new Date(startDate);
				endDate.setMinutes(endDate.getMinutes() + event.length);

				const dayAbbr = firstDay.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2).toUpperCase();

				log(`    ${event.startTime} ${event.name}`);

				await calendarAPI.api.events.insert({
					calendarId,
					requestBody: {
						start     : { dateTime: startDate.toISOString(), timeZone: TIMEZONE },
						end       : { dateTime: endDate.toISOString(), timeZone: TIMEZONE },
						summary   : event.name,
						recurrence: [ `RRULE:FREQ=WEEKLY;WKST=MO;UNTIL=${YEAR + 1}0525T000000Z;BYDAY=${dayAbbr}` ],
					},
				}, {});
			});
		});
	}
}
