import { run } from '../app';

describe('src/lib/app', () => {
	describe('run', () => {
		it('should work', async () => {
			await expect(run('0')).rejects.toEqual(new Error('Profile \'0\' does not exist'));
		});
	});
});
