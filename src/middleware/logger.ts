import { getAppDataDir, mkdir, dirDoesExist } from '../utils/system';
import { createWriteStream } from 'fs';
import { join } from 'path';
import { Request, Response, NextFunction } from 'express';
import RequestWithSession from '../interfaces/RequestWithSession';

const LOG_DIR = join(getAppDataDir(), 'logs');
const FORMATS = {
	FILE_NAME: 'dd-MM-yyyy',
	FILE_EXT: '.log',
};

function formatDate(date: Date, format: string): string {
	const day = String(date.getDate()).padStart(2, '0');
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const year = date.getFullYear();
	return format
		.replace('dd', day)
		.replace('MM', month)
		.replace('yyyy', year.toString());
}

if (!dirDoesExist(LOG_DIR)) {
	mkdir(LOG_DIR);
}

export default function logger(
	req: RequestWithSession | Request,
	res: Response,
	next: NextFunction,
): void {
	const { method, url, session } = req;
	const user = session?.user;

	const logFileName = `${formatDate(new Date(), FORMATS.FILE_NAME)}${FORMATS.FILE_EXT}`;
	const logStream = createWriteStream(join(LOG_DIR, logFileName), {
		flags: 'a',
	});

	logStream.write(
		`[${new Date().toLocaleString()}] ${method} ${url} ${user ? `(${user.Username})` : ''}\n`,
	);
	logStream.end();

	next();
}
