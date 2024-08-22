import AppDB from '../classes/AppDB';
import bcrypt from 'bcrypt';
import { picDir } from './fileUtils';
import fs from 'fs';
import { join } from 'path';

interface BotAccount {
	username: string;
	password: string;
	bio: string;
	avatar?: string;
}

export async function makeBot(options: BotAccount): Promise<void> {
	try {
		const db = AppDB.getInstance();

		const hashedPassword = await bcrypt.hash(options.password, 10);

		const userExists = await db.statement(
			`SELECT * FROM Admins WHERE Username = ?`,
			[options.username],
		);

		if (userExists.length > 0) {
			console.error(`Bot account already exists.`);
			return;
		}

		await db.statement(
			`INSERT INTO Admins (Username, Password, Bio, ProfilePicture, IsBot) VALUES (?, ?, ?, ?, ?)`,
			[options.username, hashedPassword, options.bio, 'default.jpg', 1],
		);
	} catch (error) {
		console.error(`Issue creating bot account: ${error}`);
	}
}

export async function deleteBot(username: string): Promise<void> {
	try {
		const db = AppDB.getInstance();

		await db.statement(`DELETE FROM Admins WHERE Username = ?`, [username]);
	} catch (error) {
		console.error(`Issue deleting bot account: ${error}`);
	}
}

export async function checkIfBotExists(username: string): Promise<boolean> {
	try {
		const db = AppDB.getInstance();

		const userExists = await db.statement(
			`SELECT * FROM Admins WHERE Username = ?`,
			[username],
		);

		return userExists.length > 0;
	} catch (error) {
		console.error(`Issue checking if bot account exists: ${error}`);
		return false;
	}
}

export async function makeBotAvatar(
	username: string,
	uuid: string,
	dir: string,
): Promise<boolean> {
	try {
		// Copy the avatar from the default avatar directory to the bot avatar directory
		const avatarDir = join(picDir.avatar);
		const defaultAvatarFile = join(dir);
		const avatarFile = `${uuid}.${dir.split('.').pop()}`;

		fs.copyFileSync(defaultAvatarFile, join(avatarDir, avatarFile));

		// Update the avatar in the database
		const db = AppDB.getInstance();

		await db.statement(
			`UPDATE Admins SET ProfilePicture = ? WHERE Username = ?`,
			[`${uuid}.${dir.split('.').pop()}`, username],
		);

		return true;
	} catch (error) {
		console.error(`Issue creating bot avatar: ${error}`);
		return false;
	}
}
