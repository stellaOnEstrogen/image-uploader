import { Request, Response } from 'express';
import constants from '../constants';
import RequestWithSession from '../interfaces/RequestWithSession';
import { eventEmitter, list } from '../utils/reminder';

interface Options {
	title: string;
	[key: string]: any;
}

let reminders: any[] = [...list];

eventEmitter.on('reminder', (reminder) => {
	reminders.push(reminder);
});

export async function render(
	req: Request | RequestWithSession,
	res: Response,
	page: string,
	options: Options = { title: '' },
): Promise<void> {
	const userData = req.session?.user;

	const filteredReminders = reminders.filter(
		(reminder: any) => reminder.role === (userData ? userData.role : 'user'),
	);

	res.render(page, {
		...options,
		...constants,
		userData: userData || null,
		reminders: filteredReminders,
	});
}
