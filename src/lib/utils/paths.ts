import path from 'path';

const dirPaths = {
	config: 'config',
};

export function getScheduleFile(): string {
	return path.join(dirPaths.config, 'schedule.json');
}

export function getSampleScheduleFile(): string {
	return path.join(dirPaths.config, 'schedule.sample.json');
}
