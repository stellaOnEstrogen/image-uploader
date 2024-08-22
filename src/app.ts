#!/usr/bin/env node

import { ArgParser, Arg } from './classes/ArgParser';
import { firstTimeSetup, isFirstTimeSetup } from './utils/system';
import express, { Request, Response } from 'express';
import { join as pJoin } from 'node:path';
import { render } from './wwwroot';
import session from 'express-session';
import AppDB from './classes/AppDB';
import { createReadStream, existsSync, statSync, unlinkSync } from 'node:fs';
import {
	generateId,
	timeDifference,
	picDir,
	storageForAvatars,
	storageForImages,
	storageForVideos,
} from './utils/fileUtils';
import multer from 'multer';
import bcrypt from 'bcrypt';
import os from 'os';
import rateLimit from 'express-rate-limit';
import constants from './constants';
import { config as dotenv } from 'dotenv';
import NodeCache from 'node-cache';
import RequestWithSession from './interfaces/RequestWithSession';
import { reminders } from './utils/reminder';

const generalRateLimit = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100,
	message: 'Too many requests from this IP, please try again later.',
	//@ts-ignore
	keyGenerator: (req, res) => req.ip,
});

const uploadForImages = multer({ storage: storageForImages });
const uploadForAvatars = multer({ storage: storageForAvatars });
const uploadForVideos = multer({ storage: storageForVideos });
const server = express();

const postCache = new NodeCache({
	// 10 minutes
	stdTTL: 600,
});

async function main(args: Arg[]) {
	if (isFirstTimeSetup()) {
		await firstTimeSetup();
	}

	const envPath = args.find((arg) => arg.name === 'env')?.value;

	dotenv({
		path: envPath || pJoin(__dirname, '..', '.env'),
	});

	const db = AppDB.getInstance();

	const port = args.find((arg) => arg.name === 'port')?.value || 3000;
	const host = args.find((arg) => arg.name === 'host')?.value || 'localhost';

	const validHosts = ['localhost', '127.0.0.1', '0.0.0.0'];
	if (!validHosts.includes(host)) {
		console.error(
			'Invalid host provided. Please provide a valid host.',
			validHosts.join(', '),
		);
		process.exit(1);
	}

	server.use(express.json());
	server.use(express.urlencoded({ extended: true }));
	server.use(express.static(pJoin(__dirname, 'wwwroot', 'public')));
	server.set('view engine', 'ejs');
	server.set('views', pJoin(__dirname, 'wwwroot', 'views'));
	server.set('trust proxy', true);
	server.use(
		session({
			secret: 'i-love-catgirls',
			resave: false,
			saveUninitialized: true,
			cookie: {
				secure: process.env.NODE_ENV !== 'development',
				maxAge: 1000 * 60 * 60 * 24, // 24 hours
			},
		}),
	);
	server.use((req, res, next) => {
		const noRateLimit = constants.NO_RATE_LIMIT_ROUTES.find((route) => {
			return route.method === req.method && route.route === req.path;
		});

		if (noRateLimit) {
			return next();
		}

		generalRateLimit(req, res, next);
	});

	server.get('/', async (req: RequestWithSession, res: Response) => {
		const media = await db.statement(
			'SELECT * FROM Media ORDER BY UploadedAt DESC',
		);

		const deleteSuccess = req.query.deleted === 'true';
		const id = req.query.id;

		render(req, res, 'index', {
			title: 'Home',
			media,
			timeDifference,
			deleteSuccess,
			deletedId: deleteSuccess ? id : null,
		});
	});

	server.get('/login', (req: Request, res: Response) => {
		const returnUrl = req.query.returnTo || null;
		render(req, res, 'login', {
			title: 'Login',
			error: req.query.error || null,
			logout: !!req.query.logout,
			returnUrl,
		});
	});

	server.get('/view/:id', async (req: RequestWithSession, res: Response) => {
		const imageId = req.params.id;
		const raw = req.query.raw === 'true';

		const media = await db.statement('SELECT * FROM Media WHERE ID = ?', [
			imageId,
		]);

		if (media.length === 0) {
			return res.status(404).send('Media not found');
		}

		if (!raw) {
			await db.statement('UPDATE Media SET Views = Views + 1 WHERE ID = ?', [
				imageId,
			]);

			const uploadedBy = await db.statement(
				'SELECT * FROM Admins WHERE ID = ?',
				[media[0].UploadedBy],
			);

			if (uploadedBy.length === 0) {
				return res.status(404).send('Uploader not found');
			}
			return render(req, res, 'view', {
				title: `${media[0].Caption}`,
				image: media[0],
				link: `https://${req.get('host')}/view/${imageId}?raw=true`,
				canDelete:
					!!req.session.user && req.session.user.Id === media[0].UploadedBy,
				uploadedBy: uploadedBy[0],
			});
		} else {
			const type = media[0].ContentType.split('/')[0];
			const mediaPath = pJoin(
				picDir[type as keyof typeof picDir],
				media[0].FileName,
			);

			if (!existsSync(mediaPath)) {
				return res.status(404).send('Media not found');
			}

			try {
				const stats = statSync(mediaPath);
				const range = req.headers.range;

				if (range) {
					const [start, end] = range
						.replace(/bytes=/, '')
						.split('-')
						.map(Number);
					const fileSize = stats.size;
					const chunkStart = Math.max(start, 0);
					const chunkEnd = Math.min(end || fileSize - 1, fileSize - 1);

					const contentLength = chunkEnd - chunkStart + 1;

					res.writeHead(206, {
						'Content-Range': `bytes ${chunkStart}-${chunkEnd}/${fileSize}`,
						'Accept-Ranges': 'bytes',
						'Content-Length': contentLength,
						'Content-Type': media[0].ContentType,
						'Content-Disposition': `inline; filename="${media[0].FileName}.${media[0].ContentType.split('/')[1]}"`,
					});

					const stream = createReadStream(mediaPath, {
						start: chunkStart,
						end: chunkEnd,
					});
					stream.pipe(res);
				} else {
					res.writeHead(200, {
						'Content-Length': stats.size,
						'Content-Type': media[0].ContentType,
					});

					const stream = createReadStream(mediaPath);
					stream.pipe(res);
				}
			} catch (error) {
				if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
					return res.status(404).send('Media not found');
				}

				console.error('Error serving media:', error);
				return res.status(500).send('Internal Server Error');
			}
		}
	});

	server.get('/stats', async (req: Request, res: Response) => {
		let totalStorage = 0;

		const images = await db.statement('SELECT * FROM Media');
		const admins = await db.statement('SELECT * FROM Admins');

		images.forEach((image: any) => {
			const type = image.ContentType.split('/')[0];
			const imagePath = pJoin(
				picDir[type as keyof typeof picDir],
				image.FileName,
			);
			const stats = statSync(imagePath);
			totalStorage += stats.size;
		});

		admins.forEach((admin: any) => {
			const imagePath = pJoin(picDir.avatar, admin.ProfilePicture);
			const stats = statSync(imagePath);
			totalStorage += stats.size;
		});

		function formatBytes(bytes: number, decimals = 2) {
			if (bytes === 0) return '0 Bytes';
			const k = 1024;
			const dm = decimals < 0 ? 0 : decimals;
			const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
			const i = Math.floor(Math.log(bytes) / Math.log(k));
			return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
		}

		const memoryUsage = process.memoryUsage();
		const totalMemory = os.totalmem();
		const freeMemory = os.freemem();

		const stats = {
			storage: {
				title: 'Storage Used (Images, Avatars, Videos)',
				value: formatBytes(totalStorage),
			},
			images: {
				title: 'Total Media',
				value: images.length,
			},
			memory: {
				title: 'Memory Usage',
				value: `${formatBytes(memoryUsage.rss)} / ${formatBytes(memoryUsage.heapUsed)} / ${formatBytes(memoryUsage.external)}`,
			},
			memorySystem: {
				title: 'System Memory',
				value: `${formatBytes(totalMemory - freeMemory)} used / ${formatBytes(freeMemory)} free`,
			},
		};

		render(req, res, 'stats', {
			title: 'Stats',
			stats,
		});
	});

	server.get(
		'/avatars/:fileName',
		async (req: RequestWithSession, res: Response) => {
			const fileName = req.params.fileName;

			if (fileName === 'default.jpg') {
				res.redirect('/assets/default.jpg');
			}

			const imagePath = pJoin(picDir.avatar, fileName);

			const exists = existsSync(imagePath);

			if (!exists) {
				return res.status(404).send('Image not found');
			}

			try {
				const stats = statSync(imagePath);

				res.writeHead(200, {
					'Content-Type': `image/${fileName.split('.').pop()}`,
					'Content-Length': stats.size,
				});

				const readStream = createReadStream(imagePath);

				readStream.pipe(res);
			} catch (error) {
				if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
					return res.status(404).send('Image not found');
				}

				console.error('Error serving image:', error);
				return res.status(500).send('Internal Server Error');
			}
		},
	);

	server.get(
		'/admins/:username?',
		async (req: RequestWithSession, res: Response) => {
			const adminUsername = req.params.username;

			if (!adminUsername) {
				const admins = await db.statement('SELECT * FROM Admins');

				return render(req, res, 'admins', {
					title: 'Admins',
					admins,
				});
			}

			const admin = await db.statement(
				'SELECT * FROM Admins WHERE Username = ?',
				[adminUsername],
			);

			if (admin.length === 0) {
				return res.status(404).send('Admin not found');
			}

			const recentUploads = await db.statement(
				'SELECT * FROM Media WHERE UploadedBy = ? ORDER BY UploadedAt DESC LIMIT 5',
				[admin[0].Id],
			);
			const allUploads = await db.statement(
				'SELECT * FROM Media WHERE UploadedBy = ?',
				[admin[0].Id],
			);

			render(req, res, 'admin', {
				title: `Admin ${admin[0].Username}`,
				user: admin[0],
				link: `https://${req.get('host')}/admins/${admin[0].Username}`,
				recentUploads,
				timeDifference,
				allUploads,
			});
		},
	);

	server.get('/settings', async (req: RequestWithSession, res: Response) => {
		if (!req.session.user) {
			return res.redirect('/login?returnTo=/settings');
		}

		render(req, res, 'settings', {
			title: 'Settings',
			user: req.session.user,
			error: null,
		});
	});

	server.post(
		'/settings',
		uploadForAvatars.single('avatar'),
		async (req: RequestWithSession, res: Response) => {
			if (!req.session.user) {
				return res.redirect('/login?returnTo=/settings');
			}

			if (req.file && !req.file.mimetype.startsWith('image/')) {
				return res
					.status(400)
					.send('Invalid file type. Only images are allowed.');
			}

			const { username, bio } = req.body;

			if (!username || !bio) {
				return res.status(400).send('Username and bio are required.');
			}

			try {
				const userId = req.session.user.Id;
				let profilePicture = req.session.user.ProfilePicture;

				if (req.file) {
					profilePicture = req.file.filename;
				}

				if (req.file && req.session.user.ProfilePicture !== 'default.jpg') {
					const oldAvatarPath = pJoin(
						picDir.avatar,
						req.session.user.ProfilePicture,
					);
					const exists = existsSync(oldAvatarPath);
					if (exists) {
						unlinkSync(oldAvatarPath);
					}
				}

				await db.statement(
					'UPDATE Admins SET ProfilePicture = ?, Bio = ?, Username = ? WHERE Id = ?',
					[profilePicture, bio, username, userId],
				);

				req.session.user.Username = username;
				req.session.user.Bio = bio;
				if (req.file) {
					req.session.user.ProfilePicture = profilePicture;
				}

				res.redirect('/settings');
			} catch (error) {
				console.error('Error updating settings:', error);
				res.status(500).send('Internal Server Error');
			}
		},
	);

	server.get('/delete/:id', async (req: RequestWithSession, res: Response) => {
		if (!req.session.user) {
			return res.redirect(`/login?returnTo=/delete/${req.params.id}`);
		}

		const imageId = req.params.id;

		const image = await db.statement('SELECT * FROM Media WHERE ID = ?', [
			imageId,
		]);

		if (image.length === 0) {
			return res.status(404).send('Media not found');
		}

		const type = image[0].ContentType.split('/')[0];
		const imagePath = pJoin(
			picDir[type as keyof typeof picDir],
			image[0].FileName,
		);

		const exists = existsSync(imagePath);

		if (!exists) {
			return res.status(404).send('Media not found');
		}

		try {
			await db.statement('DELETE FROM Media WHERE ID = ?', [imageId]);
			unlinkSync(imagePath);
			res.redirect('/?deleted=true&id=' + imageId);
		} catch (error) {
			console.error('Error deleting image:', error);
			res.status(500).send('Internal Server Error');
		}
	});

	server.post('/login', async (req: RequestWithSession, res: Response) => {
		const { username, password } = req.body;
		const returnUrl = req.query.returnTo || null;

		if (!username || !password) {
			return render(req, res, 'login', {
				title: 'Login',
				error: 'Please provide a username and password',
				logout: false,
				returnUrl,
			});
		}

		const user = await db.statement('SELECT * FROM Admins WHERE Username = ?', [
			username,
		]);

		if (
			user.length === 0 ||
			!(await bcrypt.compare(password, user[0].Password))
		) {
			return render(req, res, 'login', {
				title: 'Login',
				error: 'Invalid username or password',
				logout: false,
				returnUrl,
			});
		}

		req.session.user = user[0];
		res.redirect(returnUrl ? (returnUrl as string) : '/');
	});

	server.get('/register', (req: Request, res: Response) => {
		const returnUrl = req.query.returnTo || null;
		render(req, res, 'register', {
			title: 'Register',
			error: null,
			returnUrl,
		});
	});

	server.post('/register', async (req, res) => {
		const { username, password, masterKey } = req.body;
		const returnUrl = req.query.returnTo || null;

		const pMasterKey = process.env.MASTER_KEY;

		if (!username || !password || !masterKey) {
			return render(req, res, 'register', {
				title: 'Register',
				error: 'Please provide a username, password, and master key.',
				returnUrl,
			});
		}

		if (masterKey.trim() !== pMasterKey) {
			return render(req, res, 'register', {
				title: 'Register',
				error: 'Invalid master key.',
				returnUrl,
			});
		}

		try {
			const userExists = await db.statement(
				'SELECT * FROM Admins WHERE Username = ?',
				[username.toLowerCase().trim()],
			);
			if (userExists.length > 0) {
				return render(req, res, 'register', {
					title: 'Register',
					error: 'Username already exists.',
					returnUrl,
				});
			}

			const hashedPassword = await bcrypt.hash(password, 10);

			await db.statement(
				'INSERT INTO Admins (Username, Password, ProfilePicture, Bio, Role) VALUES (?, ?, ?, ?, ?)',
				[
					username.toLowerCase().trim(),
					hashedPassword,
					'default.jpg',
					`Hello, I'm ${username}!`,
					'user',
				],
			);

			res.redirect('/login');
		} catch (error) {
			console.error('Error registering user:', error);
			res.status(500).send('Internal Server Error');
		}
	});

	server.get('/upload/:type?', (req: RequestWithSession, res: Response) => {
		if (!req.session.user) {
			return res.redirect('/login?returnTo=/upload');
		}

		if (req.params.type && !['image', 'video'].includes(req.params.type)) {
			return res.status(400).send('Invalid type');
		}

		render(req, res, `upload-${req.params.type || 'image'}`, {
			title: 'Upload',
			error: req.query.error || null,
		});
	});

	server.post('/upload-image', (req: RequestWithSession, res: Response) => {
		if (!req.session.user) {
			return res.redirect('/login?returnTo=/upload');
		}

		uploadForImages.single('image')(req, res, async (err: any) => {
			if (err) {
				console.error('Error uploading image:', err);
				return res.status(500).send('Internal Server Error');
			}

			if (!req.file) {
				return res.status(400).send('Bad Request');
			}

			const { caption } = req.body;
			const id = generateId();
			const contentType = req.file.mimetype;
			const currentDate = new Date();
			const uploadedBy = req.session.user.Id;

			try {
				await db.statement(
					'INSERT INTO Images (Id, FileName, Caption, ContentType, Views, UploadedAt, UploadedBy) VALUES (?, ?, ?, ?, ?, ?, ?)',
					[
						id,
						req.file.filename,
						caption,
						contentType,
						0,
						currentDate,
						uploadedBy,
					],
				);
				res.redirect(`/view/${id}`);
			} catch (error) {
				console.error('Error uploading image:', error);
				res.status(500).send('Internal Server Error');
			}
		});
	});

	server.post('/upload-video', (req: RequestWithSession, res: Response) => {
		if (!req.session.user) {
			return res.redirect('/login?returnTo=/upload/video');
		}

		uploadForVideos.single('video')(req, res, async (err: any) => {
			if (err) {
				console.error('Error uploading video:', err);
				return res.status(500).send('Internal Server Error');
			}

			if (!req.file) {
				return res.status(400).send('Bad Request');
			}

			const { caption } = req.body;
			const id = generateId();
			const contentType = req.file.mimetype;
			const currentDate = new Date();
			const uploadedBy = req.session.user.Id;

			try {
				await db.statement(
					'INSERT INTO Images (Id, FileName, Caption, ContentType, Views, UploadedAt, UploadedBy) VALUES (?, ?, ?, ?, ?, ?, ?)',
					[
						id,
						req.file.filename,
						caption,
						contentType,
						0,
						currentDate,
						uploadedBy,
					],
				);
				res.redirect(`/view/${id}`);
			} catch (error) {
				console.error('Error uploading video:', error);
				res.status(500).send('Internal Server Error');
			}
		});
	});

	server.get('/logout', (req: RequestWithSession, res: Response) => {
		if (!req.session.user) {
			return res.redirect('/login');
		}
		req.session.destroy((err: any) => {
			if (err) {
				console.error('Error destroying session:', err);
			}
			res.redirect('/login?logout=true');
		});
	});

	server.get('/api/get-media', async (req: Request, res: Response) => {
		const by = req.query.by as string;
		const sort = req.query.sort as string;
		const order = req.query.order as string;
		const limit = req.query.limit as string;
		const type = req.query.type as string;

		if (!by) {
			return res.status(400).json({
				error: "Missing 'by' query parameter. This must be a user ID.",
			});
		}

		const sortValid = ['ASC', 'DESC'];
		const orderValid = ['UploadedAt', 'Views'];

		let query = 'SELECT * FROM Media WHERE UploadedBy = ?';
		const queryParams: any[] = [by];

		let orderByClause = '';
		if (order && orderValid.includes(order)) {
			if (order === 'Views') {
				orderByClause = ` ORDER BY Views DESC`;
			} else {
				const sortDirection =
					sort && sortValid.includes(sort.toUpperCase()) ?
						sort.toUpperCase()
					:	'ASC';
				orderByClause = ` ORDER BY ${order} ${sortDirection}`;
			}
		}

		if (orderByClause) {
			query += orderByClause;
		}

		if (limit) {
			const limitInt = parseInt(limit, 10);
			if (isNaN(limitInt) || limitInt <= 0) {
				return res.status(400).json({
					error:
						"Invalid 'limit' query parameter. It must be a positive integer.",
				});
			}
			query += ` LIMIT ?`;
			queryParams.push(limitInt);
		}

		try {
			if (postCache.has(query)) {
				const cached = postCache.get(query);
				return res.json(cached);
			}

			let images = await db.statement(query, queryParams);

			query += ` AND ContentType LIKE ?`;
			queryParams.push(`${type === 'videos' ? 'video' : 'image'}%`);

			postCache.set(query, images);
			res.json(images);
		} catch (error) {
			console.error('Error fetching media:', error);
			res.status(500).json({ error: 'Internal Server Error' });
		}
	});

	server.listen(port, host, async () => {
		console.log(`Server running at http://${host}:${port}`);
		console.log(`Serving images from ${picDir.base}`);
		reminders.start();
		console.log('Press Ctrl+C to stop the server');
	});
}

const argParser = new ArgParser(process.argv.slice(2));

main(argParser.parse());
