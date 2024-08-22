import { Request, Response } from 'express';
import constants from '../constants';
import RequestWithSession from '../interfaces/RequestWithSession';

interface Options {
	title: string;
	[key: string]: any;
}

export async function render(
	req: Request | RequestWithSession,
	res: Response,
	page: string,
	options: Options = { title: '' },
): Promise<void> {
	const userData = req.session?.user;
	res.render(page, {
		...options,
		...constants,
		userData: userData ? userData : null,
	});
}
