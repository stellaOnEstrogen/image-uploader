import multer from 'multer';
import { getPictureDirs } from './system';
import { Request } from 'express';

export const picDir = getPictureDirs();

export function generateId() {
	return [...Array(8)]
		.map(() => Math.floor(Math.random() * 16).toString(16))
		.join('');
}

export function timeDifference(date: Date) {
	const now = new Date();
	const diff = now.getTime() - date.getTime();
	const minutes = Math.floor(diff / 60000);
	if (minutes < 60) return `${minutes} minute(s) ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours} hour(s) ago`;
	const days = Math.floor(hours / 24);
	return `${days} day(s) ago`;
}

export function makeUUID() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
		const r = (Math.random() * 16) | 0;
		const v = c === 'x' ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

export const storageForImages = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, picDir.image);
	},
	filename: (req: Request, file, cb) => {
		cb(null, `${makeUUID()}.${file.originalname.split('.').pop()}`); // Use the original file name
	},
});

export const storageForAvatars = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, picDir.avatar);
	},
	filename: (req: Request, file, cb) => {
		cb(null, `${makeUUID()}.${file.originalname.split('.').pop()}`); // Use the original file name
	},
});

export const storageForVideos = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, picDir.video);
	},
	filename: (req: Request, file, cb) => {
		cb(null, `${makeUUID()}.${file.originalname.split('.').pop()}`); // Use the original file name
	},
});
