import fs from 'fs';

import { validate } from '@anmiles/express-tools';
import { getAPI } from '@anmiles/google-api-wrapper';
import type GoogleApis from 'googleapis';
// eslint-disable-next-line camelcase
import type { calendar_v3, MethodOptions } from 'googleapis/build/src/apis/calendar';
import { calendar } from 'googleapis/build/src/apis/calendar';
import '@anmiles/jest-extensions';
import mockFs from 'mock-fs';

import { sync } from '../sync';
import {   scheduleSchema } from '../types';
import type { LessonCalendar, Schedule } from '../types';
import { getSampleScheduleFile, getScheduleFile } from '../utils/paths';

jest.mock('@anmiles/google-api-wrapper');
jest.mock('@anmiles/logger');
jest.mock('googleapis/build/src/apis/calendar');

const profile = 'username';

const calendarApis = {
	calendarList: 'calendarList',
	events      : 'events',
} as const;

function mockGetItems(selectAPI: ((api: typeof calendarApis)=> typeof calendarApis[keyof typeof calendarApis])): typeof calendars | typeof events {
	switch (selectAPI(calendarApis)) {
		case calendarApis.calendarList: return calendars;
		case calendarApis.events: return events;
	}
}

const getItems = jest.mocked(jest.fn().mockImplementation(mockGetItems));

const api = {
	events: {
		insert: jest.fn(),
		delete: jest.fn(),
	},
};

// eslint-disable-next-line @typescript-eslint/require-await -- allow partial mock
const getAPIMock = jest.fn().mockImplementation(async () => ({ getItems, api }));

const auth = { kind: 'auth' };

let calendars: Array<{ id?: string | null | undefined; summary?: string; description?: string; hidden?: boolean }>;
let events: Array<{ id?: string | null | undefined; summary?: string; organizer?: { email?: string; displayName?: string; self?: boolean } }>;

jest.mocked(getAPI).mockImplementation((...args: unknown[]) => getAPIMock(...args));

// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
jest.mocked(calendar).mockReturnValue(calendarApis as unknown as GoogleApis.calendar_v3.Calendar);

const scheduleJSON = fs.readJSON(getSampleScheduleFile());
const schedule     = validate(scheduleJSON, scheduleSchema);

beforeEach(() => {
	mockFs({
		[getScheduleFile()]: JSON.stringify(schedule),
	});

	calendars = [
		{ id: 'lessons-1th', summary: 'First grade lessons' },
		{ id: 'lessons-hs', summary: 'High school lessons' },
		{ id: 'sections-1th', summary: 'First grade sections' },
	];

	events = [
		{ id: 'id1' },
		{ },
		{ id: 'id3' },
	];
});

afterAll(() => {
	mockFs.restore();
});

const fullScopes = [
	'https://www.googleapis.com/auth/calendar.calendars.readonly',
	'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
	'https://www.googleapis.com/auth/calendar.events.owned',
];

describe('src/lib/sync', () => {
	describe('sync', () => {
		it('should get calendar API', async () => {
			await sync(profile);

			expect(getAPIMock).toHaveBeenCalledWith(expect.toBeFunction([ auth ], calendarApis), profile, { temporary: true, scopes: fullScopes });
			expect(calendar).toHaveBeenCalledWith({ version: 'v3', auth });
		});

		it('should get all calendars without showing progress', async () => {
			await sync(profile);

			expect(getItems).toHaveBeenCalledWith(expect.anything(), {}, { hideProgress: true });
			expect(getItems.mock.calls[0]?.[0](calendarApis)).toEqual(calendarApis.calendarList);
		});

		it('should throw if there are no available calendars', async () => {
			calendars = [];

			const promise = async (): Promise<unknown> => sync(profile);

			await expect(promise).rejects.toEqual(new Error(`There are no available calendars for profile '${profile}'`));
		});

		it('should throw if there are no matching calendars', async () => {
			const savedSchedule = fs.readJSON<Schedule>(getScheduleFile());
			// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
			const savedCalendar = savedSchedule.calendars[0] as LessonCalendar;

			savedCalendar.name         = 'random calendar name';
			savedSchedule.calendars[0] = savedCalendar;

			mockFs({
				[getScheduleFile()]: JSON.stringify(savedSchedule),
			});

			const promise = async (): Promise<unknown> => sync(profile);

			await expect(promise).rejects.toEqual(new Error(`Unknown calendar 'random calendar name' for profile '${profile}'`));
		});

		it('should throw if no time described for a lesson', async () => {
			const savedSchedule = fs.readJSON<Schedule>(getScheduleFile());
			// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
			const savedCalendar = savedSchedule.calendars[0] as LessonCalendar;

			savedCalendar.days[1]!.push('6th lesson');
			savedSchedule.calendars[0] = savedCalendar;

			mockFs({
				[getScheduleFile()]: JSON.stringify(savedSchedule),
			});

			const promise = async (): Promise<unknown> => sync(profile);

			await expect(promise).rejects.toEqual(new Error('Cannot find time described for lesson #6 in calendar \'First grade lessons\''));
		});

		it('should get events for calendars without showing progress', async () => {
			await sync(profile);

			expect(getItems).toHaveBeenCalledTimes(4);

			expect(getItems).toHaveBeenCalledWith(
				expect.toBeFunction([ calendarApis ], calendarApis.calendarList),
				{ },
				{ hideProgress: true },
			);

			calendars.forEach((calendar) => {
				expect(getItems).toHaveBeenCalledWith(
					expect.toBeFunction([ calendarApis ], calendarApis.events),
					{ calendarId: calendar.id },
					{ hideProgress: true },
				);
			});
		});

		it('should delete all existing events in calendars', async () => {
			await sync(profile);

			expect(api.events.delete).toHaveBeenCalledTimes(9);

			calendars.forEach((calendar) => {
				expect(api.events.delete).toHaveBeenCalledWith({ calendarId: calendar.id, eventId: 'id1' });
				expect(api.events.delete).toHaveBeenCalledWith({ calendarId: calendar.id, eventId: '' });
				expect(api.events.delete).toHaveBeenCalledWith({ calendarId: calendar.id, eventId: 'id3' });
			});
		});

		it('should create all events for schedule', async () => {
			await sync(profile);

			expect(api.events.insert.mock.calls.map(stringifyInsertCall).join('\n')).toMatchSnapshot();
		});
	});
});

// eslint-disable-next-line camelcase
function stringifyInsertCall(insertCall: [calendar_v3.Params$Resource$Events$Insert, MethodOptions]): string {
	return [
		insertCall[0].calendarId,
		JSON.stringify(insertCall[1]),
		insertCall[0].requestBody?.start?.dateTime,
		insertCall[0].requestBody?.start?.timeZone,
		insertCall[0].requestBody?.end?.dateTime,
		insertCall[0].requestBody?.end?.timeZone,
		insertCall[0].requestBody?.recurrence,
		insertCall[0].requestBody?.summary,
	].join('\t');
}
