import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import constants from '../constants';
import AppDB from '../classes/AppDB';

const PIC_DIR: string | null = constants.FILE_DIRECTORY;

export function getAppDataDir(): string {
	let appDataDir = '';
	const username = os.userInfo().username;

	if (os.platform() === 'win32') {
		appDataDir = path.join(
			`C:\\Users\\${username}\\AppData\\Roaming\\${constants.APP_ID}`,
		);
	} else if (os.platform() === 'darwin') {
		appDataDir = path.join(
			`/Users/${username}/Library/Application Support/${constants.APP_ID}`,
		);
	} else {
		appDataDir = path.join(`/home/${username}/.config/${constants.APP_ID}`);
	}

	return appDataDir;
}

export async function firstTimeSetup(): Promise<void> {
	try {
		const appDataDir = getAppDataDir();

		if (!fs.existsSync(appDataDir)) {
			fs.mkdirSync(appDataDir, { recursive: true });
		}

		const db = AppDB.getInstance();

		db.createDatabase()
			.then(() => {
				console.log('Database created successfully');
			})
			.catch((error) => {
				db.close();
				console.error('An error occurred while creating the database:', error);
				process.exit(1);
			});
	} catch (error) {
		console.error('An error occurred while setting up the app:', error);
		process.exit(1);
	}
}

export function isFirstTimeSetup(): boolean {
	return !fs.existsSync(path.join(getAppDataDir(), 'app.db'));
}

export function getPictureDirs(): {
	avatar: string;
	video: string;
	image: string;
	base: string;
} {
	if (PIC_DIR) {
		const base = path.resolve(PIC_DIR);

		const dirs = {
			avatar: path.join(base, 'avatars'),
			video: path.join(base, 'videos'),
			image: path.join(base, 'images'),
			base,
		};

		for (const dir of Object.values(dirs)) {
			if (!fs.existsSync(dir)) {
				fs.mkdirSync(dir, { recursive: true });
			}
		}

		return dirs;
	} else {
		const homeDir = os.homedir();
		const dirs = {
			avatar: path.join(homeDir, 'Pictures', 'Avatars'),
			video: path.join(homeDir, 'Pictures', 'Videos'),
			image: path.join(homeDir, 'Pictures', 'Images'),
			base: path.join(homeDir, 'Pictures'),
		};

		for (const dir of Object.values(dirs)) {
			if (!fs.existsSync(dir)) {
				fs.mkdirSync(dir, { recursive: true });
			}
		}

		return dirs;
	}
}
