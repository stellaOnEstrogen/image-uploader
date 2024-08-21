import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { getAppDataDir } from '../utils/system';

class AppDB {
	private static instance: AppDB | null = null;
	private db: sqlite3.Database;

	private constructor() {
		const dbPath = path.join(getAppDataDir(), 'app.db');

		if (!fs.existsSync(dbPath)) {
			this.db = new sqlite3.Database(
				dbPath,
				sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
				(err) => {
					if (err) {
						console.error('Error opening database:', err);
					}
				},
			);
		} else {
			this.db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
				if (err) {
					console.error('Error opening database:', err);
				}
			});
		}
	}

	public static getInstance(): AppDB {
		if (!AppDB.instance) {
			AppDB.instance = new AppDB();
		}

		return AppDB.instance;
	}

	public close(): void {
		this.db.close((err) => {
			if (err) {
				console.error('Error closing database:', err);
			}
		});
	}

	public static destroy(): void {
		if (AppDB.instance) {
			AppDB.instance.close();
		}

		AppDB.instance = null;
	}

	public getDb(): sqlite3.Database {
		return this.db;
	}

	public async statement(query: string, params: any[] = []): Promise<any[]> {
		return new Promise((resolve, reject) => {
			this.db.all(query, params, (err, rows) => {
				if (err) {
					reject(err);
				} else {
					resolve(rows);
				}
			});
		});
	}

	public async createDatabase(): Promise<void> {
		try {
			const initSQLPath = path.join(__dirname, '..', '..', 'sql');

			const initFiles = fs.readdirSync(initSQLPath).filter((file) => {
				return file.endsWith('-init.sql');
			});

			for (const file of initFiles) {
				console.log('Creating database from file:', file);
				const sql = fs.readFileSync(path.join(initSQLPath, file), 'utf-8');
				await this.statement(sql);
			}
		} catch (error) {
			console.error('Error creating database:', error);
			throw error; // Rethrow the error to signal that the database creation failed
		}
	}
}

export default AppDB;
