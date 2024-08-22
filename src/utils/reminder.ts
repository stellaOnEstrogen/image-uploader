import cron from 'node-cron';
import { EventEmitter } from 'events';
import IReminders from '../interfaces/Reminders';

export const eventEmitter = new EventEmitter();

export const list: IReminders[] = [
	{
		slug: 'update-master-key',
		title: 'Update the master key',
		message:
			'To keep the system secure, the master key should be updated every 2 weeks.',
		schedule: '0 0 */14 * *',
		type: 'warning',
		role: 'owner',
	},
];

export const reminders = {
	reminder: (slug: string) => {
		eventEmitter.emit(
			'reminder',
			list.find((reminder) => reminder.slug === slug),
		);
	},
	start: () => {
		console.log('Starting reminders...');
		list.forEach((reminder) => {
			console.log(`Reminder started for ${reminder.title}! (${reminder.slug})`);
			cron.schedule(reminder.schedule, () => {
				reminders.reminder(reminder.slug);
			});
		});
	},
};
