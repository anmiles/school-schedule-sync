import { run } from '../app';

describe('src/lib/app', () => {
	describe('run', () => {
		it('should work', async () => {
			await run(0);
			expect(true).toBe(true);
		});
	});
});
