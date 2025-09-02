import { filterProfiles } from '@anmiles/google-api-wrapper';

import { run } from '../app';
import { sync } from '../sync';

jest.mock('@anmiles/google-api-wrapper');
jest.mock('@anmiles/logger');
jest.mock('../sync');

const profile1 = 'username1';
const profile2 = 'username2';

const calendarName = 'My Calendar';

jest.mocked(filterProfiles).mockImplementation(() => [ profile1, profile2 ]);

describe('src/lib/app', () => {
	describe('run', () => {
		it('should filter profiles', async () => {
			await run(profile1);

			expect(filterProfiles).toHaveBeenCalledWith(profile1);
		});

		it('should call sync for all filtered profiles for all calendars', async () => {
			await run();

			expect(sync).toHaveBeenCalledWith(profile1, undefined);
			expect(sync).toHaveBeenCalledWith(profile2, undefined);
		});

		it('should call sync for all filtered profiles for the specified calendar', async () => {
			await run(profile1, calendarName);

			expect(sync).toHaveBeenCalledWith(profile1, calendarName);
			expect(sync).toHaveBeenCalledWith(profile2, calendarName);
		});
	});
});
