import { filterProfiles } from '@anmiles/google-api-wrapper';
import { info } from '@anmiles/logger';

import { sync } from './sync';

export async function run(profile?: string): Promise<void> {
	for (const foundProfile of filterProfiles(profile)) {
		info(`Syncing calendars for ${foundProfile}`);
		await sync(foundProfile);
	}
}
