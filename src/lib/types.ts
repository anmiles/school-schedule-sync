import { z } from 'zod';

const timeSchema = z.object({
	startTime: z.string().regex(/^\d{2}:\d{2}$/),
	length   : z.number(),
});

const eventSchema = timeSchema.extend({
	name    : z.string(),
	location: z.string().optional(),
});

export type Event = z.infer<typeof eventSchema>;

const lessonSchema  = z.string();
const sectionSchema = eventSchema;

const lessonCalendarSchema = z.object({
	name       : z.string(),
	type       : z.literal('lessons'),
	days       : z.array(z.array(lessonSchema)).min(5).max(7),
	lessonTimes: z.array(timeSchema).min(5).max(7).optional(),
});

export type LessonCalendar = z.infer<typeof lessonCalendarSchema>;

const sectionCalendarSchema = z.object({
	name: z.string(),
	type: z.literal('sections'),
	days: z.array(z.array(sectionSchema)).min(5).max(7),
});

export type SectionCalendar = z.infer<typeof sectionCalendarSchema>;

export const scheduleSchema = z.object({
	defaults: z.object({
		lessonTimes: z.array(timeSchema).optional(),
	}),
	calendars: z.array(z.union([
		lessonCalendarSchema,
		sectionCalendarSchema,
	])),
});

export type Schedule = z.infer<typeof scheduleSchema>;
